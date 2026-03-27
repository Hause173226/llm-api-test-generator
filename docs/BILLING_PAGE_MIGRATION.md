# BillingPage Migration: Mock Data → Real API

## Status: ⚠️ IN PROGRESS

Backend CÓ Subscription APIs nhưng BillingPage vẫn đang dùng mock data.

---

## Backend APIs Available ✅

### Subscriptions Controller

```
GET  /api/subscriptions/{id}
GET  /api/subscriptions/plans
GET  /api/subscriptions/users/{userId}/current
GET  /api/subscriptions/me/current              ✅ Use this
POST /api/subscriptions
PUT  /api/subscriptions/{id}
POST /api/subscriptions/{id}/cancel
GET  /api/subscriptions/{id}/history
GET  /api/subscriptions/{id}/payments
POST /api/subscriptions/{id}/payments
GET  /api/subscriptions/users/{userId}/usage
PUT  /api/subscriptions/users/{userId}/usage
```

### Plans Controller

```
GET    /api/plans
GET    /api/plans/{id}
POST   /api/plans
PUT    /api/plans/{id}
DELETE /api/plans/{id}
GET    /api/plans/{id}/auditlogs
```

### Payments Controller

```
POST /api/payments/subscribe/{planId}
GET  /api/payments/plans
GET  /api/payments/{intentId}
POST /api/payments/payos/create
POST /api/payments/payos/webhook
GET  /api/payments/payos/return
```

---

## Frontend Implementation ✅

### 1. Created subscriptionService.ts ✅

- `getPlans()` - Get available plans
- `getCurrentSubscription()` - Get user's subscription
- `getMyUsage()` - Get usage tracking
- `getPaymentTransactions()` - Get payment history
- `subscribeToPlan()` - Subscribe to a plan
- `cancelSubscription()` - Cancel subscription

### 2. Created useSubscription.ts hook ✅

- Fetches plans, subscription, usage, payments
- Provides loading and error states
- Provides subscribe and cancel methods

---

## BillingPage Migration Steps

### Current State (Mock Data):

```typescript
// Hardcoded usage stats
<h3>842</h3>  // Test runs
<h3>3</h3>    // Projects
<h3>12.4k</h3> // AI tokens

// Hardcoded billing history
[
  { id: 'INV-2024-003', date: 'Mar 01, 2024', amount: '$49.00' },
  { id: 'INV-2024-002', date: 'Feb 01, 2024', amount: '$49.00' },
  { id: 'INV-2024-001', date: 'Jan 01, 2024', amount: '$49.00' },
]
```

### Target State (Real API):

```typescript
import { useSubscription } from '../hooks/useSubscription';

const { plans, currentSubscription, usage, payments, loading } = useSubscription();

// Usage stats from API
{usage.map(u => (
  <div key={u.limitType}>
    <h3>{u.currentUsage}</h3>
    <span>/ {u.limitValue}</span>
  </div>
))}

// Billing history from API
{payments.map(payment => (
  <tr key={payment.id}>
    <td>{payment.id}</td>
    <td>{new Date(payment.transactionDate).toLocaleDateString()}</td>
    <td>${payment.amount}</td>
    <td>{payment.status}</td>
  </tr>
))}
```

---

## Migration Checklist

### Phase 1: Setup ✅

- [x] Create `subscriptionService.ts`
- [x] Create `useSubscription.ts` hook
- [x] Export from `services/index.ts`

### Phase 2: Update BillingPage (TODO)

- [ ] Import `useSubscription` hook
- [ ] Replace hardcoded usage stats with real data
- [ ] Replace hardcoded plans with API data
- [ ] Replace hardcoded billing history with API data
- [ ] Add loading states
- [ ] Add error handling
- [ ] Remove mock data warning banner
- [ ] Test with real Backend

### Phase 3: Handle Edge Cases (TODO)

- [ ] Handle user without subscription
- [ ] Handle empty usage data
- [ ] Handle empty payment history
- [ ] Handle API errors gracefully
- [ ] Add retry mechanism
- [ ] Add refresh button

### Phase 4: Additional Features (TODO)

- [ ] Implement subscribe button functionality
- [ ] Implement cancel subscription
- [ ] Implement upgrade/downgrade
- [ ] Add payment method management
- [ ] Add invoice download

---

## Code Example: Updated BillingPage

```typescript
import React from 'react';
import { useSubscription } from '../hooks/useSubscription';
import MainLayout from '../components/layout/MainLayout';
import Skeleton from '../components/ui/Skeleton';

export default function BillingPage() {
  const {
    plans,
    currentSubscription,
    usage,
    payments,
    loading,
    error,
    subscribeToPlan
  } = useSubscription();

  if (loading) {
    return (
      <MainLayout title="Billing">
        <Skeleton className="h-96" />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Billing">
        <div className="text-error">{error}</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Billing">
      {/* Usage Overview - REAL DATA */}
      <section>
        {usage.map(u => (
          <div key={u.limitType}>
            <p>{u.limitType}</p>
            <h3>{u.currentUsage} / {u.limitValue}</h3>
            <div className="progress-bar" style={{ width: `${(u.currentUsage / u.limitValue) * 100}%` }} />
          </div>
        ))}
      </section>

      {/* Pricing Plans - REAL DATA */}
      <section>
        {plans.map(plan => (
          <div key={plan.id}>
            <h3>{plan.name}</h3>
            <p>${plan.price}/{plan.billingCycle}</p>
            <p>{plan.description}</p>
            <ul>
              {plan.limits.map(limit => (
                <li key={limit.limitType}>
                  {limit.limitType}: {limit.limitValue}
                </li>
              ))}
            </ul>
            <button onClick={() => subscribeToPlan(plan.id)}>
              Subscribe
            </button>
          </div>
        ))}
      </section>

      {/* Billing History - REAL DATA */}
      <section>
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <tr key={payment.id}>
                <td>{payment.id}</td>
                <td>{new Date(payment.transactionDate).toLocaleDateString()}</td>
                <td>${payment.amount} {payment.currency}</td>
                <td>{payment.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </MainLayout>
  );
}
```

---

## Important Notes

### 1. User ID Issue

Backend endpoints like `/subscriptions/users/{userId}/usage` require userId in path.
But we want to get current user's data.

**Solutions:**

- Use `/subscriptions/me/current` for subscription (already exists)
- Need Backend to add `/subscriptions/me/usage` endpoint
- Or get userId from auth context/profile first

### 2. Limit Types

Backend uses `limitType` enum. Need to map to friendly names:

```typescript
const limitTypeNames = {
  TestRuns: "Test Runs",
  Projects: "Active Projects",
  AITokens: "AI Tokens",
};
```

### 3. Billing Cycle

Backend has `billingCycle` field. Map to display:

```typescript
const billingCycleDisplay = {
  Monthly: "/month",
  Yearly: "/year",
};
```

### 4. Payment Status

Backend payment status needs mapping:

```typescript
const statusColors = {
  Completed: "text-emerald-600",
  Pending: "text-amber-600",
  Failed: "text-error",
};
```

---

## Testing Plan

### 1. Test with Backend Running

```bash
# Start Backend
cd BE/GSP26SE43.ModularMonolith
dotnet run --project ClassifiedAds.WebAPI

# Start Frontend
cd FE/llm-api-test-generator
npm run dev
```

### 2. Test Scenarios

- [ ] User without subscription
- [ ] User with active subscription
- [ ] User with cancelled subscription
- [ ] Empty usage data
- [ ] Empty payment history
- [ ] Subscribe to plan
- [ ] Cancel subscription
- [ ] API errors
- [ ] Loading states

### 3. Verify Data

- [ ] Usage stats match Backend
- [ ] Plans match Backend
- [ ] Payment history matches Backend
- [ ] Subscription status correct

---

## Next Steps

1. **Immediate**: Update BillingPage to use `useSubscription` hook
2. **Short-term**: Remove all mock data and warning banner
3. **Medium-term**: Add subscribe/cancel functionality
4. **Long-term**: Add payment method management, invoice download

---

## Conclusion

Backend CÓ đầy đủ Subscription APIs. Frontend đã có service và hook sẵn sàng. Chỉ cần cập nhật BillingPage để sử dụng real data thay vì mock data.

**Status**: ✅ Service Ready, ⚠️ Page Migration Pending  
**Priority**: HIGH - Remove mock data ASAP  
**Estimated Time**: 2-3 hours  
**Date**: March 27, 2026
