import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Zap, Crown, Sparkles, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Pricing() {
  const { user } = useAuth();
  useLocation(); // Keep for navigation context
  const [isYearly, setIsYearly] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: data => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("Redirecting to checkout...", {
          description: "Complete your payment in the new tab",
        });
      }
      setLoadingTier(null);
    },
    onError: error => {
      toast.error("Failed to start checkout", {
        description: error.message,
      });
      setLoadingTier(null);
    },
  });

  const handleSubscribe = (tier: "pro" | "premium") => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }

    setLoadingTier(tier);
    createCheckout.mutate({
      interval: isYearly ? "yearly" : "monthly",
    });
  };

  const tiers = [
    {
      id: "free",
      name: "Free",
      description: "Get started with basic access",
      priceMonthly: 0,
      priceYearly: 0,
      icon: Sparkles,
      features: [
        "View all strategy performance",
        "Basic analytics dashboard",
        "Community access",
        "24-hour signal delay",
        "1 strategy subscription",
      ],
      cta: "Current Plan",
      disabled: true,
      popular: false,
    },
    {
      id: "pro",
      name: "Pro",
      description: "For active traders",
      priceMonthly: 49,
      priceYearly: 470,
      icon: Zap,
      features: [
        "Subscribe to up to 5 strategies",
        "Real-time trade signals",
        "Advanced analytics & metrics",
        "Email notifications",
        "Priority support",
        "Strategy comparison tools",
      ],
      cta: "Upgrade to Pro",
      disabled: false,
      popular: true,
    },
    {
      id: "premium",
      name: "Premium",
      description: "For professional traders",
      priceMonthly: 99,
      priceYearly: 950,
      icon: Crown,
      features: [
        "Unlimited strategy subscriptions",
        "Real-time trade signals",
        "Full analytics suite",
        "API access",
        "Custom alerts",
        "Dedicated support",
        "Early access to new strategies",
        "White-glove onboarding",
      ],
      cta: "Upgrade to Premium",
      disabled: false,
      popular: false,
    },
  ];

  const currentTier = user?.subscriptionTier || "free";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="container py-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="container py-16 text-center">
        <Badge variant="outline" className="mb-4">
          Simple, transparent pricing
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
          Choose Your Trading Edge
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Access professional-grade algorithmic trading signals with proven
          track records. Start free and upgrade as you grow.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Label
            htmlFor="billing-toggle"
            className={!isYearly ? "font-semibold" : "text-muted-foreground"}
          >
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label
            htmlFor="billing-toggle"
            className={isYearly ? "font-semibold" : "text-muted-foreground"}
          >
            Yearly
            <Badge variant="secondary" className="ml-2 text-xs">
              Save 20%
            </Badge>
          </Label>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container pb-24">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map(tier => {
            const Icon = tier.icon;
            const price = isYearly ? tier.priceYearly : tier.priceMonthly;
            const isCurrentTier = currentTier === tier.id;
            const isUpgrade =
              (currentTier === "free" &&
                (tier.id === "pro" || tier.id === "premium")) ||
              (currentTier === "pro" && tier.id === "premium");

            return (
              <Card
                key={tier.id}
                className={`relative flex flex-col ${
                  tier.popular
                    ? "border-primary shadow-lg shadow-primary/10 scale-105"
                    : "border-border/50"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold">
                      ${isYearly ? Math.round(price / 12) : price}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                    {isYearly && price > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ${price} billed annually
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={tier.popular ? "default" : "outline"}
                    disabled={
                      isCurrentTier ||
                      loadingTier === tier.id ||
                      (tier.id === "free" && !!user)
                    }
                    onClick={() => {
                      if (tier.id === "free") return;
                      handleSubscribe(tier.id as "pro" | "premium");
                    }}
                  >
                    {loadingTier === tier.id
                      ? "Processing..."
                      : isCurrentTier
                        ? "Current Plan"
                        : isUpgrade
                          ? tier.cta
                          : tier.id === "free"
                            ? user
                              ? "Current Plan"
                              : "Get Started Free"
                            : tier.cta}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="p-6 rounded-lg bg-card border border-border/50">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, you can cancel your subscription at any time. You'll
                continue to have access until the end of your billing period.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border border-border/50">
              <h3 className="font-semibold mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-muted-foreground text-sm">
                We accept all major credit cards (Visa, Mastercard, American
                Express) through our secure Stripe payment processor.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border border-border/50">
              <h3 className="font-semibold mb-2">Is there a refund policy?</h3>
              <p className="text-muted-foreground text-sm">
                We offer a 7-day money-back guarantee. If you're not satisfied
                within the first week, contact us for a full refund.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border border-border/50">
              <h3 className="font-semibold mb-2">
                Can I upgrade or downgrade my plan?
              </h3>
              <p className="text-muted-foreground text-sm">
                Yes, you can change your plan at any time. Upgrades take effect
                immediately, and downgrades take effect at the end of your
                billing period.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Trusted by traders worldwide
          </p>
          <div className="flex items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Secure payments</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">7-day guarantee</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
