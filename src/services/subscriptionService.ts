import apiService from "./apiService";

// Types based on Backend models
export interface PlanLimit {
  limitType: string;
  limitValue: number;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  // FE-14 contract: 0 = Monthly, 1 = Yearly (numeric enum)
  billingCycle: number;
  isActive: boolean;
  limits: PlanLimit[];
  createdDateTime: string;
  updatedDateTime?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  // FE-14 contract: 0=Trial, 1=Active, 2=PastDue, 3=Cancelled, 4=Expired (numeric enum)
  status: number;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  createdDateTime: string;
  updatedDateTime?: string;
}

export interface UsageTracking {
  id: string;
  userId: string;
  limitType: string;
  currentUsage: number;
  limitValue: number;
  periodStart: string;
  periodEnd: string;
  lastUpdated: string;
}

export interface PaymentTransaction {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  // FE-14 contract: 0=Pending, 1=Processing, 2=Succeeded, 3=Canceled (numeric enum)
  status: number;
  paymentMethod: string;
  transactionDate: string;
  description?: string;
}

// Returned by POST /api/payments/subscribe/{planId}
export interface SubscribeResult {
  requiresPayment: boolean;
  paymentIntentId?: string;
  subscription?: Subscription;
}

// Returned by GET /api/payments/{intentId}
export interface PaymentIntent {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  // 0=RequiresPayment, 1=Processing, 2=Succeeded, 3=Canceled, 4=Expired
  status: number;
  purpose: number;
  planId: string;
  planName?: string;
  // 0=Monthly, 1=Yearly
  billingCycle: number;
  subscriptionId?: string;
  checkoutUrl?: string;
  expiresAt: string;
  orderCode?: number;
  createdDateTime: string;
  updatedDateTime?: string;
}

// Returned by POST /api/payments/payos/create
export interface PayOsCheckout {
  checkoutUrl: string;
  orderCode: number;
}

const subscriptionService = {
  // Get all available plans
  getPlans: async (): Promise<Plan[]> => {
    return await apiService.get<Plan[]>("/payments/plans");
  },

  // Get current user's subscription
  getCurrentSubscription: async (): Promise<Subscription> => {
    return await apiService.get<Subscription>("/subscriptions/me/current");
  },

  // Get current user's usage tracking
  getMyUsage: async (): Promise<UsageTracking[]> => {
    // Try to get current subscription first to get userId
    try {
      const subscription = await apiService.get<Subscription>(
        "/subscriptions/me/current",
      );
      return await apiService.get<UsageTracking[]>(
        `/subscriptions/users/${subscription.userId}/usage`,
      );
    } catch (error) {
      console.log("Could not fetch usage data:", error);
      return [];
    }
  },

  // Get payment transactions for a subscription
  getPaymentTransactions: async (
    subscriptionId: string,
  ): Promise<PaymentTransaction[]> => {
    return await apiService.get<PaymentTransaction[]>(
      `/subscriptions/${subscriptionId}/payments`,
    );
  },

  // Subscribe to a plan
  // FE-14 step 2: POST /api/payments/subscribe/{planId}
  // Returns { requiresPayment, paymentIntentId?, subscription? }
  subscribeToPlan: async (
    planId: string,
    billingCycle: number,
  ): Promise<SubscribeResult> => {
    return await apiService.post(`/payments/subscribe/${planId}`, {
      billingCycle,
    });
  },

  // FE-14 step 3: Create PayOS checkout link
  // POST /api/payments/payos/create → { checkoutUrl, orderCode }
  createPayOsCheckout: async (intentId: string): Promise<PayOsCheckout> => {
    return await apiService.post(`/payments/payos/create`, { intentId });
  },

  // FE-14 step 6: Get payment intent status
  // GET /api/payments/{intentId}
  getPaymentIntent: async (intentId: string): Promise<PaymentIntent> => {
    return await apiService.get(`/payments/${intentId}`);
  },

  // Cancel subscription
  // FE-14 contract: CancelSubscriptionModel has effectiveDate + changeReason
  cancelSubscription: async (
    subscriptionId: string,
    reason?: string,
  ): Promise<void> => {
    await apiService.post(`/subscriptions/${subscriptionId}/cancel`, {
      changeReason: reason,
      effectiveDate: new Date().toISOString(),
    });
  },
};

export default subscriptionService;
