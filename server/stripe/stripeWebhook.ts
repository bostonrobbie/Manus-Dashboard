/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for subscription management
 * and triggers welcome emails on successful subscription.
 */

import { Router, raw } from "express";
import Stripe from "stripe";
import { getDb } from "../db";
import { users, paymentHistory } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendWelcomeEmail, isEmailConfigured } from "../services/resendEmail";

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
router.post(
  "/",
  raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    if (!sig || !webhookSecret) {
      console.error("[Stripe Webhook] Missing signature or webhook secret");
      return res.status(400).json({ error: "Missing signature" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("[Stripe Webhook] Signature verification failed:", err);
      return res.status(400).json({ error: "Invalid signature" });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(session);
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(subscription);
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(subscription);
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          await handleInvoicePaymentSucceeded(invoice);
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          await handleInvoicePaymentFailed(invoice);
          break;
        }

        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }

      return res.json({ received: true });
    } catch (error) {
      console.error(`[Stripe Webhook] Error handling ${event.type}:`, error);
      return res.status(500).json({ error: "Webhook handler failed" });
    }
  }
);

/**
 * Handle successful checkout session
 * - Update user subscription status
 * - Send welcome email
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const db = await getDb();
  if (!db) return;

  const userId = session.client_reference_id
    ? parseInt(session.client_reference_id)
    : null;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const tier = session.metadata?.tier || "pro";

  console.log(`[Stripe Webhook] Checkout completed for user ${userId}, tier: ${tier}`);

  if (!userId) {
    console.error("[Stripe Webhook] No user ID in checkout session");
    return;
  }

  // Get user details
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    console.error(`[Stripe Webhook] User ${userId} not found`);
    return;
  }

  // Update user subscription
  await db
    .update(users)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionTier: tier as "pro" | "premium" | "free",
      subscriptionStatus: "active",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  console.log(`[Stripe Webhook] Updated user ${userId} subscription to ${tier}`);

  // Record payment in history
  await db.insert(paymentHistory).values({
    userId,
    stripePaymentIntentId: session.payment_intent as string || `checkout_${session.id}`,
    amount: session.amount_total || 0,
    currency: session.currency || "usd",
    status: "succeeded",
    description: `${tier} subscription`,
  });

  // Send welcome email
  if (isEmailConfigured() && user.email) {
    try {
      const result = await sendWelcomeEmail(user.email, user.name || "Trader");
      if (result.success) {
        console.log(`[Stripe Webhook] Welcome email sent to ${user.email}`);
      } else {
        console.error(`[Stripe Webhook] Failed to send welcome email: ${result.error}`);
      }
    } catch (error) {
      console.error("[Stripe Webhook] Error sending welcome email:", error);
    }
  } else {
    console.log("[Stripe Webhook] Email not configured, skipping welcome email");
  }
}

/**
 * Handle subscription updates (upgrades, downgrades, renewals)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const db = await getDb();
  if (!db) return;

  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));

  if (!user) {
    console.error(`[Stripe Webhook] User not found for customer ${customerId}`);
    return;
  }

  // Update subscription status
  await db
    .update(users)
    .set({
      subscriptionStatus: subscription.status,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(
    `[Stripe Webhook] Updated subscription status for user ${user.id}: ${subscription.status}`
  );
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const db = await getDb();
  if (!db) return;

  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));

  if (!user) {
    console.error(`[Stripe Webhook] User not found for customer ${customerId}`);
    return;
  }

  // Downgrade to free tier
  await db
    .update(users)
    .set({
      subscriptionTier: "free",
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`[Stripe Webhook] Subscription canceled for user ${user.id}`);
}

/**
 * Handle successful invoice payment (renewals)
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const db = await getDb();
  if (!db) return;

  const customerId = invoice.customer as string;

  // Find user by Stripe customer ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));

  if (!user) {
    console.error(`[Stripe Webhook] User not found for customer ${customerId}`);
    return;
  }

  // Record payment in history
  await db.insert(paymentHistory).values({
    userId: user.id,
    stripePaymentIntentId: (invoice as any).payment_intent as string || `invoice_${invoice.id}`,
    amount: invoice.amount_paid || 0,
    currency: invoice.currency || "usd",
    status: "succeeded",
    description: `Subscription renewal`,
  });

  console.log(`[Stripe Webhook] Payment recorded for user ${user.id}`);
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const db = await getDb();
  if (!db) return;

  const customerId = invoice.customer as string;

  // Find user by Stripe customer ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId));

  if (!user) {
    console.error(`[Stripe Webhook] User not found for customer ${customerId}`);
    return;
  }

  // Record failed payment
  await db.insert(paymentHistory).values({
    userId: user.id,
    stripePaymentIntentId: (invoice as any).payment_intent as string || `invoice_${invoice.id}`,
    amount: invoice.amount_due || 0,
    currency: invoice.currency || "usd",
    status: "failed",
    description: `Payment failed`,
  });

  // Update subscription status
  await db
    .update(users)
    .set({
      subscriptionStatus: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  console.log(`[Stripe Webhook] Payment failed for user ${user.id}`);
}

export default router;
