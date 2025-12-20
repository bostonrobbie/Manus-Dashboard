import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import Stripe from "stripe";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { SUBSCRIPTION_TIERS } from "./products";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const stripeRouter = router({
  // Create checkout session for subscription
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        tier: z.enum(["pro", "premium"]),
        interval: z.enum(["monthly", "yearly"]).default("monthly"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tier, interval } = input;
      const user = ctx.user;

      // Get or create Stripe customer
      let customerId = user.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.name || undefined,
          metadata: {
            userId: user.id.toString(),
            openId: user.openId,
          },
        });
        customerId = customer.id;

        // Save customer ID to database
        const db = await getDb();
        if (db) {
          await db
            .update(users)
            .set({ stripeCustomerId: customerId })
            .where(eq(users.id, user.id));
        }
      }

      // Get price based on tier and interval
      const tierConfig = SUBSCRIPTION_TIERS[tier];
      const amount = interval === "yearly" ? tierConfig.priceYearly : tierConfig.priceMonthly;

      // Create checkout session with dynamic pricing
      // Note: When customer is provided, don't pass customer_email (Stripe doesn't allow both)
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        allow_promotion_codes: true,
        client_reference_id: user.id.toString(),
        metadata: {
          user_id: user.id.toString(),
          customer_email: user.email || "",
          customer_name: user.name || "",
          tier: tier,
          interval: interval,
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${tierConfig.name} Plan`,
                description: tierConfig.description,
              },
              unit_amount: amount,
              recurring: {
                interval: interval === "yearly" ? "year" : "month",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${ctx.req.headers.origin}/my-dashboard?payment=success&tier=${tier}`,
        cancel_url: `${ctx.req.headers.origin}/pricing?payment=canceled`,
      });

      return { url: session.url };
    }),

  // Get current subscription status
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    // If user has a Stripe subscription, fetch details
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        );
        const subData = subscription as any;
        return {
          tier: user.subscriptionTier,
          status: subData.status,
          currentPeriodEnd: subData.current_period_end ? new Date(subData.current_period_end * 1000) : null,
          cancelAtPeriodEnd: subData.cancel_at_period_end || false,
        };
      } catch (error) {
        // Subscription not found or error
        return {
          tier: user.subscriptionTier || "free",
          status: "active",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        };
      }
    }

    return {
      tier: user.subscriptionTier || "free",
      status: "active",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }),

  // Cancel subscription
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.user;

    if (!user.stripeSubscriptionId) {
      throw new Error("No active subscription to cancel");
    }

    // Cancel at period end (don't immediately cancel)
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return { success: true };
  }),

  // Resume canceled subscription
  resumeSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.user;

    if (!user.stripeSubscriptionId) {
      throw new Error("No subscription to resume");
    }

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    return { success: true };
  }),

  // Create billing portal session
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.user;

    if (!user.stripeCustomerId) {
      throw new Error("No Stripe customer found");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${ctx.req.headers.origin}/my-dashboard`,
    });

    return { url: session.url };
  }),

  // Get pricing tiers (public)
  getPricingTiers: publicProcedure.query(() => {
    return Object.values(SUBSCRIPTION_TIERS);
  }),
});
