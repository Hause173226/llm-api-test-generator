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

const subscriptionService = {
  // Get all available plans
  getPlans: async (): Promise<Plan[]> => {
    return await apiService.get<Plan[]>("/subscriptions/plans");
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

  // Subscribe to a plan - returns payment link
  // FE-14 contract: body must include billingCycle (0=Monthly, 1=Yearly)
  subscribeToPlan: async (
    planId: string,
    billingCycle: number,
  ): Promise<{ paymentUrl: string; orderId: string }> => {
    return await apiService.post(`/payments/subscribe/${planId}`, {
      billingCycle,
    });
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
