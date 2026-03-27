# Pages Using Mock Data

## Overview

Một số pages trong Frontend đang sử dụng MOCK DATA (hardcoded) vì Backend chưa implement các APIs tương ứng.

---

## Pages với Mock Data

### 1. BillingPage.tsx ⚠️ MOCK DATA

**Location**: `src/pages/BillingPage.tsx`

**Status**: 🟡 Using Hardcoded Mock Data

**Reason**: Backend không có Subscription/Billing/Payment APIs

#### Mock Data Includes:

1. **Usage Statistics** (Hardcoded):

   ```typescript
   - Test Runs: 842 / 1,000
   - Projects: 3 / 3
   - AI Tokens: 12.4k / 25k
   ```

2. **Pricing Plans** (From translations):

   ```typescript
   - Starter: $0/month
   - Professional: $49/month (marked as popular)
   - Enterprise: Custom pricing
   ```

3. **Billing History** (Hardcoded):
   ```typescript
   [
     {
       id: "INV-2024-003",
       date: "Mar 01, 2024",
       amount: "$49.00",
       status: "paid",
     },
     {
       id: "INV-2024-002",
       date: "Feb 01, 2024",
       amount: "$49.00",
       status: "paid",
     },
     {
       id: "INV-2024-001",
       date: "Jan 01, 2024",
       amount: "$49.00",
       status: "paid",
     },
   ];
   ```

#### What Needs to be Implemented in Backend:

```csharp
// Subscription Module APIs needed:
GET  /api/subscriptions/current          // Get current subscription
GET  /api/subscriptions/usage            // Get usage statistics
GET  /api/subscriptions/plans            // Get available plans
POST /api/subscriptions/upgrade          // Upgrade plan
POST /api/subscriptions/downgrade        // Downgrade plan

// Billing Module APIs needed:
GET  /api/billing/invoices               // Get billing history
GET  /api/billing/invoices/{id}          // Get invoice details
GET  /api/billing/invoices/{id}/download // Download invoice PDF
POST /api/billing/payment-method         // Add payment method
GET  /api/billing/payment-methods        // Get payment methods
```

#### Changes Made:

1. ✅ Added warning banner at top of page:

   ```tsx
   <div className="bg-amber-50 ...">
     Demo Mode - Mock Data This page displays mock data for demonstration
     purposes...
   </div>
   ```

2. ✅ Added comment in component:
   ```typescript
   // NOTE: This page uses MOCK DATA because Backend Subscription/Billing APIs
   // are not implemented yet
   ```

---

## Pages Using Real APIs ✅

### 1. AccountSettingsPage.tsx ✅ REAL API

**Status**: 🟢 Using Real Backend APIs

**APIs Used**:

- GET `/api/auth/me/profile` - Get user profile
- PUT `/api/auth/me/profile` - Update profile
- POST `/api/auth/change-password` - Change password
- POST `/api/auth/me/avatar` - Upload avatar

### 2. DashboardPage.tsx ⚠️ NEEDS VERIFICATION

**Status**: 🟡 Needs Verification

**Potential Mock Data**:

- Dashboard statistics
- Recent activity
- Charts and graphs

**Action Required**: Check if DashboardPage uses real APIs or mock data

### 3. ProjectManagementPage.tsx ✅ REAL API

**Status**: 🟢 Using Real Backend APIs

**APIs Used**:

- GET `/api/projects` - List projects
- POST `/api/projects` - Create project
- PUT `/api/projects/{id}` - Update project
- DELETE `/api/projects/{id}` - Delete project

---

## How to Identify Mock Data

### Signs of Mock Data:

1. **Hardcoded arrays**:

   ```typescript
   const data = [
     { id: 1, name: "Item 1" },
     { id: 2, name: "Item 2" },
   ];
   ```

2. **No API service calls**:

   ```typescript
   // No import of service
   // No useEffect with API calls
   // No loading states
   ```

3. **Static numbers**:

   ```typescript
   <h3>842</h3>  // Hardcoded number
   ```

4. **Translation-only data**:
   ```typescript
   const plans = [
     { name: t("plan.starter"), price: "$0" }, // From translations
   ];
   ```

### Signs of Real API:

1. **Service imports**:

   ```typescript
   import { projectService } from "../services";
   ```

2. **API calls in useEffect**:

   ```typescript
   useEffect(() => {
     const fetchData = async () => {
       const data = await service.getData();
       setData(data);
     };
     fetchData();
   }, []);
   ```

3. **Loading states**:

   ```typescript
   const [loading, setLoading] = useState(true);
   if (loading) return <Skeleton />;
   ```

4. **Error handling**:
   ```typescript
   try {
     await service.call();
   } catch (error) {
     handleError(error);
   }
   ```

---

## Migration Plan: Mock Data → Real API

### Step 1: Backend Implementation

1. Create Subscription module in Backend
2. Implement required APIs
3. Add proper authentication/authorization
4. Test APIs with Postman/Swagger

### Step 2: Frontend Service

1. Create `subscriptionService.ts`:

   ```typescript
   const subscriptionService = {
     getCurrentSubscription: async () => {
       return await apiService.get("/subscriptions/current");
     },
     getUsageStats: async () => {
       return await apiService.get("/subscriptions/usage");
     },
     // ... other methods
   };
   ```

2. Export from `services/index.ts`

### Step 3: Update BillingPage

1. Import service:

   ```typescript
   import { subscriptionService } from "../services";
   ```

2. Add state:

   ```typescript
   const [subscription, setSubscription] = useState(null);
   const [usage, setUsage] = useState(null);
   const [loading, setLoading] = useState(true);
   ```

3. Fetch data:

   ```typescript
   useEffect(() => {
     const fetchData = async () => {
       try {
         const [subData, usageData] = await Promise.all([
           subscriptionService.getCurrentSubscription(),
           subscriptionService.getUsageStats(),
         ]);
         setSubscription(subData);
         setUsage(usageData);
       } catch (error) {
         handleError(error);
       } finally {
         setLoading(false);
       }
     };
     fetchData();
   }, []);
   ```

4. Replace hardcoded values:

   ```typescript
   // Before
   <h3>842</h3>

   // After
   <h3>{usage?.testRuns || 0}</h3>
   ```

5. Remove warning banner

### Step 4: Testing

1. Test with real Backend
2. Verify all data displays correctly
3. Test error scenarios
4. Test loading states

---

## Current Status Summary

| Page                  | Status     | Mock Data | Real API | Action Required        |
| --------------------- | ---------- | --------- | -------- | ---------------------- |
| BillingPage           | 🟡 Mock    | ✅ Yes    | ❌ No    | Implement Backend APIs |
| AccountSettingsPage   | 🟢 Real    | ❌ No     | ✅ Yes   | None                   |
| DashboardPage         | 🟡 Unknown | ❓ TBD    | ❓ TBD   | Verify                 |
| ProjectManagementPage | 🟢 Real    | ❌ No     | ✅ Yes   | None                   |
| TestSuitesPage        | 🟢 Real    | ❌ No     | ✅ Yes   | None                   |
| TestCasesPage         | 🟢 Real    | ❌ No     | ✅ Yes   | None                   |
| TestRunsPage          | 🟢 Real    | ❌ No     | ✅ Yes   | None                   |

---

## Best Practices

### 1. Always Add Warning Banner for Mock Data

```tsx
<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
  <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
    Demo Mode - Mock Data
  </p>
  <p className="text-xs text-amber-700 dark:text-amber-300">
    This page displays mock data. Backend APIs not implemented yet.
  </p>
</div>
```

### 2. Add Comments in Code

```typescript
// NOTE: This page uses MOCK DATA because Backend APIs are not implemented yet
// When Backend implements these APIs, replace hardcoded values with real API calls
```

### 3. Document Mock Data

- List all hardcoded values
- Explain why mock data is used
- Document required Backend APIs
- Provide migration plan

### 4. Make Mock Data Obvious

- Use warning banners
- Add "Demo" or "Mock" labels
- Use different colors/styling
- Log warnings in console

---

## Conclusion

BillingPage hiện đang sử dụng mock data vì Backend chưa có Subscription/Billing APIs. Đã thêm warning banner để user biết đây là demo data. Khi Backend implement các APIs cần thiết, có thể dễ dàng migrate sang real API theo migration plan ở trên.

**Status**: ✅ DOCUMENTED  
**Warning Banner**: ✅ ADDED  
**Ready for**: Backend Implementation  
**Date**: March 27, 2026
