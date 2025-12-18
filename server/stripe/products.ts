/**
 * Stripe Products Configuration
 * Defines subscription tiers for the Intraday Trading Dashboard
 */

export interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  priceMonthly: number; // in cents
  priceYearly: number; // in cents (with discount)
  features: string[];
  strategyLimit: number; // -1 for unlimited
  signalDelay: number; // minutes delay for signals (0 = real-time)
  popular?: boolean;
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic access',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      'View all strategy performance',
      'Basic analytics dashboard',
      'Community access',
      '24-hour signal delay',
    ],
    strategyLimit: 1,
    signalDelay: 1440, // 24 hours
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For active traders',
    priceMonthly: 4900, // $49
    priceYearly: 47000, // $470 (20% off)
    features: [
      'Subscribe to up to 5 strategies',
      'Real-time trade signals',
      'Advanced analytics & metrics',
      'Email notifications',
      'Priority support',
    ],
    strategyLimit: 5,
    signalDelay: 0,
    popular: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'For professional traders',
    priceMonthly: 9900, // $99
    priceYearly: 95000, // $950 (20% off)
    features: [
      'Unlimited strategy subscriptions',
      'Real-time trade signals',
      'Full analytics suite',
      'API access',
      'Custom alerts',
      'Dedicated support',
      'Early access to new strategies',
    ],
    strategyLimit: -1, // unlimited
    signalDelay: 0,
  },
};

// Stripe Price IDs - these will be created in Stripe Dashboard
// For now, we'll create them dynamically or use test mode
export const STRIPE_PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
  premium_monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_premium_monthly',
  premium_yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_premium_yearly',
};

export function getTierByPriceId(priceId: string): SubscriptionTier | null {
  if (priceId.includes('pro')) {
    return SUBSCRIPTION_TIERS.pro;
  }
  if (priceId.includes('premium')) {
    return SUBSCRIPTION_TIERS.premium;
  }
  return SUBSCRIPTION_TIERS.free;
}

export function getTierFeatures(tierId: string): string[] {
  return SUBSCRIPTION_TIERS[tierId]?.features || SUBSCRIPTION_TIERS.free.features;
}

export function canAccessStrategy(tierId: string, currentSubscriptionCount: number): boolean {
  const tier = SUBSCRIPTION_TIERS[tierId] || SUBSCRIPTION_TIERS.free;
  if (tier.strategyLimit === -1) return true;
  return currentSubscriptionCount < tier.strategyLimit;
}
