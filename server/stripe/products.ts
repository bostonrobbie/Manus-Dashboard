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
    name: 'Free Trial',
    description: '14-day free trial',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      'View all strategy performance',
      'Basic analytics dashboard',
      'Limited signal access',
      '24-hour signal delay',
    ],
    strategyLimit: 2,
    signalDelay: 1440, // 24 hours
  },
  pro: {
    id: 'pro',
    name: 'Pro Trader',
    description: 'Full access to all features',
    priceMonthly: 4900, // $49
    priceYearly: 50000, // $500 (15% off - ~$42/month)
    features: [
      'Access to all 8+ trading strategies',
      'Real-time webhook signals',
      'Tradovate & IBKR broker integration',
      'Automated trade execution',
      'Portfolio analytics & risk management',
      'Email & push notifications',
      'Priority support',
      '30-day money-back guarantee',
    ],
    strategyLimit: -1, // unlimited
    signalDelay: 0,
    popular: true,
  },
};

// Stripe Price IDs - created in Stripe Dashboard (test mode)
export const STRIPE_PRICE_IDS = {
  pro_monthly: 'price_1ShFd7LgSNEpPzB5xbrFnQoT',
  pro_yearly: 'price_1ShFdGLgSNEpPzB5A0MpiAOS',
};

export function getTierByPriceId(priceId: string): SubscriptionTier | null {
  if (priceId.includes('pro')) {
    return SUBSCRIPTION_TIERS.pro;
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
