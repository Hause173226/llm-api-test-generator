import apiService from './apiService';

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
  billingCycle: string; // "Monthly" | "Yearly"
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
  status: string; // "Active" | "Cancelled" | "Expired"
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
  status: string; // "Pending" | "Completed" | "Failed"
  paymentMethod: string;
  transactionDate: string;
  description?: string;
}

const subscriptionService = {
  // Get all available plans
  getPlans: async (): Promise<Plan[]> => {
    return await apiService.get<Plan[]>('/subscriptions/plans');
  },

  // Get current user's subscription
  getCurrentSubscription: async (): Promise<Subscription> => {
    return await apiService.get<Subscription>('/subscriptions/me/current');
  },

  // Get current user's usage tracking
  getMyUsage: async (): Promise<UsageTracking[]> => {
    // Try to get current subscription first to get userId
    try {
      const subscription = await apiService.get<Subscription>('/subscriptions/me/current');
      return await apiService.get<UsageTracking[]>(`/subscriptions/users/${subscription.userId}/usage`);
    } catch (error) {
      console.log('Could not fetch usage data:', error);
      return [];
    }
  },

  // Get payment transactions for a subscription
  getPaymentTransactions: async (subscriptionId: string): Promise<PaymentTransaction[]> => {
    return await apiService.get<PaymentTransaction[]>(`/subscriptions/${subscriptionId}/payments`);
  },

  // Subscribe to a plan - returns payment link
  subscribeToPlan: async (planId: string): Promise<{ paymentUrl: string; orderId: string }> => {
    return await apiService.post(`/payments/subscribe/${planId}`, {});
  },

  // Cancel subscription
  cancelSubscription: async (subscriptionId: string, reason?: string): Promise<void> => {
    await apiService.post(`/subscriptions/${subscriptionId}/cancel`, { reason });
  },
};

export default subscriptionService;
