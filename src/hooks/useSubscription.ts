import { useState, useEffect } from "react";
import subscriptionService, {
  Plan,
  Subscription,
  UsageTracking,
  PaymentTransaction,
  SubscribeResult,
  PayOsCheckout,
} from "../services/subscriptionService";
import { handleError } from "../utils/errorHandler";

export const useSubscription = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageTracking[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch plans first (this should always work)
      const plansData = await subscriptionService.getPlans().catch(() => []);
      setPlans(plansData);

      // Try to fetch current subscription (user might not have one)
      const subscriptionData = await subscriptionService
        .getCurrentSubscription()
        .catch((err) => {
          console.log("No subscription found:", err);
          return null;
        });
      setCurrentSubscription(subscriptionData);

      // Fetch usage and payment history independent from active subscription
      const [usageData, paymentsData] = await Promise.all([
        subscriptionService.getMyUsage().catch((err) => {
          console.log("No usage data:", err);
          return [];
        }),
        subscriptionService.getMyPaymentTransactions().catch((err) => {
          console.log("No payment history:", err);
          return [];
        }),
      ]);
      setUsage(usageData);
      setPayments(paymentsData);
    } catch (err) {
      console.error("Error fetching subscription data:", err);
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for global usage updates (e.g. after deleting a project)
  useEffect(() => {
    const onUsageUpdated = (_e?: Event) => {
      // Best-effort refetch when other parts of the app signal usage changed
      fetchData();
    };

    window.addEventListener("usage:updated", onUsageUpdated as EventListener);
    return () =>
      window.removeEventListener(
        "usage:updated",
        onUsageUpdated as EventListener,
      );
  }, []);

  const subscribeToPlan = async (
    planId: string,
    billingCycle: number = 0, // 0=Monthly, 1=Yearly
  ): Promise<SubscribeResult | null> => {
    try {
      return await subscriptionService.subscribeToPlan(planId, billingCycle);
    } catch (err) {
      handleError(err);
      return null;
    }
  };

  const createPayOsCheckout = async (
    intentId: string,
  ): Promise<PayOsCheckout | null> => {
    try {
      return await subscriptionService.createPayOsCheckout(intentId);
    } catch (err) {
      handleError(err);
      return null;
    }
  };

  const cancelSubscription = async (reason?: string): Promise<boolean> => {
    if (!currentSubscription) return false;

    try {
      await subscriptionService.cancelSubscription(
        currentSubscription.id,
        reason,
      );
      await fetchData(); // Refresh data
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  return {
    plans,
    currentSubscription,
    usage,
    payments,
    loading,
    error,
    subscribeToPlan,
    createPayOsCheckout,
    cancelSubscription,
    refetch: fetchData,
  };
};
