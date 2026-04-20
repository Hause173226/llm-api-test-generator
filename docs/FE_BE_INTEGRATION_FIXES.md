# FE-BE Integration Fixes - Chi tiết thay đổi

> **Ngày thực hiện:** 18/04/2026  
> **Mục tiêu:** Sửa toàn bộ các lỗi không khớp giữa Frontend và Backend API contract  
> **Tổng cộng:** 13 fix (3 Critical, 6 High, 4 Medium) trên 11 files

---

## Mục lục

- [Critical Fixes](#critical-fixes)
  - [C-01: Generation polling thay fake timeout](#c-01-generation-polling-thay-fake-timeout)
  - [C-02: Fix route param suiteId](#c-02-fix-route-param-suiteid)
  - [C-03: Poll parseStatus sau upload](#c-03-poll-parsestatus-sau-upload)
- [High Priority Fixes](#high-priority-fixes)
  - [H-01: Check order-gate-status trước generation](#h-01-check-order-gate-status-trước-generation)
  - [H-02: Bổ sung spec API methods](#h-02-bổ-sung-spec-api-methods)
  - [H-03: Filter spec parseStatus=Success](#h-03-filter-spec-parsestatussuccess)
  - [H-04: Normalize enum numeric từ BE](#h-04-normalize-enum-numeric-từ-be)
  - [H-05: Xoá duplicate auto LLM trigger](#h-05-xoá-duplicate-auto-llm-trigger)
  - [H-06: Fix auth token key khi 401](#h-06-fix-auth-token-key-khi-401)
- [Medium Priority Fixes](#medium-priority-fixes)
  - [M-01: Fix pagination param](#m-01-fix-pagination-param)
  - [M-02: Thêm strictValidation toggle](#m-02-thêm-strictvalidation-toggle)
  - [M-03: Thêm LLMAssisted generationType](#m-03-thêm-llmassisted-generationtype)
  - [M-04: Parse validation field errors từ BE](#m-04-parse-validation-field-errors-từ-be)

---

## Critical Fixes

### C-01: Generation polling thay fake timeout

**File:** `src/pages/GeneratingTestCasesPage.tsx`

**Vấn đề:** Sau khi gọi POST `/generate-tests`, FE dùng `setTimeout` 2 giây rồi tự chuyển sang trạng thái "success" — hoàn toàn không kiểm tra BE đã generate xong chưa.

**Thay đổi:**

1. **Thêm interface `GenerationJobStatus`** (dòng 9-18):
   ```typescript
   interface GenerationJobStatus {
     jobId: string;
     testSuiteId: string;
     status: string; // Queued | Triggering | WaitingForCallback | Completed | Failed
     queuedAt?: string;
     triggeredAt?: string;
     completedAt?: string;
     testCasesGenerated?: number;
     errorMessage?: string;
     webhookName?: string;
   }
   ```

2. **Thêm hàm `pollGenerationStatus`** (dòng ~99-127):
   - Poll `GET /test-suites/${suiteId}/generation-status?jobId=...` mỗi 3 giây
   - Timeout tối đa 5 phút
   - Map trạng thái BE sang progress UI:
     - `Queued` → 15%
     - `Triggering` → 30%
     - `WaitingForCallback` → 55%
     - `Completed` → 100%
   - Nếu `Failed` → throw error với `errorMessage` từ BE

3. **Sửa hàm `executeUnifiedGeneration`** (dòng ~129-175):
   - Parse `jobId` từ response POST `/generate-tests`
   - Gọi `pollGenerationStatus(jobId)` thay vì setTimeout
   - Chỉ chuyển sang "success" khi BE trả `Completed`

---

### C-02: Fix route param suiteId

**File:** `src/pages/GeneratingTestCasesPage.tsx`

**Vấn đề:** Route trong `AppRouter.tsx` định nghĩa `/test-suites/:suiteId/generating` (path param), nhưng page dùng `useSearchParams` để đọc `suiteId` (query param).

**Thay đổi** (dòng ~27):
```typescript
// TRƯỚC:
import { useNavigate, useSearchParams } from "react-router";
const [searchParams] = useSearchParams();
const suiteId = searchParams.get("suiteId");

// SAU:
import { useNavigate, useParams } from "react-router";
const { suiteId } = useParams<{ suiteId: string }>();
```

---

### C-03: Poll parseStatus sau upload

**Files:** `src/hooks/useSpecifications.ts`, `src/pages/SpecificationPage.tsx`

**Vấn đề:** Sau khi upload specification, FE đợi 1.5 giây rồi navigate sang trang endpoints — không kiểm tra BE đã parse xong chưa. Nếu spec chưa parse xong, trang endpoints sẽ trống.

**Thay đổi 1 — `src/hooks/useSpecifications.ts`:**

Thêm hàm `pollParseStatus` (dòng ~87-111):
```typescript
const pollParseStatus = async (
  specId: string,
  options?: { intervalMs?: number; timeoutMs?: number },
): Promise<Specification> => {
  const intervalMs = options?.intervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 120000; // 2 phút timeout
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const spec = await specificationService.getSpecificationById(projectId, specId);
    if (spec.parseStatus === "Success" || spec.parseStatus === "Failed") {
      await fetchSpecifications();
      return spec;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Specification parse timed out.");
};
```
- Đã export `pollParseStatus` trong return object của hook

**Thay đổi 2 — `src/pages/SpecificationPage.tsx`:**

Sửa hàm `handleUpload` (dòng ~189-198):
```typescript
// Destructure pollParseStatus từ hook
const { ..., pollParseStatus } = useSpecifications();

// Sau khi upload:
if (newSpec && newSpec.parseStatus === "Pending") {
  toast.loading("Parsing specification... Please wait.", { id: "parse-polling" });
  try {
    const parsed = await pollParseStatus(newSpec.id);
    toast.dismiss("parse-polling");
    if (parsed.parseStatus === "Failed") {
      showErrorToast("Specification parsing failed.");
      return;
    }
    showSuccessToast("Specification parsed successfully!");
  } catch (pollErr) {
    toast.dismiss("parse-polling");
    showErrorToast("Parse status polling timed out.");
    return;
  }
}
// Chỉ navigate tới endpoints SAU KHI parse thành công
```

---

## High Priority Fixes

### H-01: Check order-gate-status trước generation

**File:** `src/pages/TestSuiteDetailPage.tsx`

**Vấn đề:** FE cho phép generate suggestions mà không kiểm tra order gate đã passed chưa. BE có endpoint `GET /test-suites/{id}/order-gate-status` trả `{ isGatePassed, message }`.

**Thay đổi 1 — `src/services/testSuiteService.ts`:**

Thêm method `getOrderGateStatus` (dòng ~143-149):
```typescript
async getOrderGateStatus(suiteId: string): Promise<{
  isGatePassed: boolean;
  activeProposalStatus?: number | null;
  message?: string;
}> {
  return await apiService.get(`/test-suites/${suiteId}/order-gate-status`);
}
```

**Thay đổi 2 — `src/pages/TestSuiteDetailPage.tsx`:**

Thêm gate check vào đầu `handleGenerateSuggestions` (dòng ~712-723):
```typescript
// Trước khi gọi generate, kiểm tra gate
try {
  const gateStatus = await testSuiteService.getOrderGateStatus(suiteId);
  if (!gateStatus.isGatePassed) {
    showErrorToast(
      gateStatus.message ||
      "Order gate not passed. Please approve the API order proposal first.",
    );
    setIsGeneratingSuggestions(false);
    return;
  }
} catch (gateErr: any) {
  console.warn("Could not check order gate status:", gateErr);
  // Tiếp tục nếu không check được — BE sẽ reject nếu gate chưa pass
}
```

---

### H-02: Bổ sung spec API methods

**File:** `src/services/specificationService.ts`

**Vấn đề:** Thiếu 4 API methods mà BE đã có sẵn.

**Thêm 4 methods mới** (dòng ~149-167):

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `getUploadMethods(projectId)` | `GET /projects/{id}/specifications/upload-methods` | Lấy danh sách upload methods |
| `importCurl(projectId, data)` | `POST /projects/{id}/specifications/curl-import` | Import spec từ cURL command |
| `activateSpecification(projectId, specId)` | `PUT /projects/{id}/specifications/{specId}/activate` | Kích hoạt specification |
| `deactivateSpecification(projectId, specId)` | `PUT /projects/{id}/specifications/{specId}/deactivate` | Vô hiệu hóa specification |

---

### H-03: Filter spec parseStatus=Success

**File:** `src/pages/TestSuitesPage.tsx`

**Vấn đề:** Modal tạo test suite cho phép chọn spec chưa parse xong → BE sẽ reject.

**Thay đổi** (dòng ~613-618):
```typescript
// TRƯỚC:
{specifications.map((spec) => (
  <option key={spec.id} value={spec.id}>{spec.name}</option>
))}

// SAU:
{specifications
  .filter((spec) => spec.parseStatus === "Success")
  .map((spec) => (
    <option key={spec.id} value={spec.id}>{spec.name}</option>
  ))}
```

---

### H-04: Normalize enum numeric từ BE

**File:** `src/services/testSuiteService.ts`

**Vấn đề:** BE trả `generationType: 0`, `status: 1`, `approvalStatus: 0` (số nguyên), nhưng FE so sánh với chuỗi `"Auto"`, `"Active"`, `"Pending"` → luôn không khớp.

**Thay đổi — thêm tại đầu file** (dòng 4-20):

```typescript
// Enum maps: số → chuỗi
const GENERATION_TYPE_MAP: Record<number, string> = {
  0: 'Auto', 1: 'Manual', 2: 'LLMAssisted'
};
const SUITE_STATUS_MAP: Record<number, string> = {
  0: 'Draft', 1: 'Active', 2: 'Ready', 3: 'Archived'
};
const APPROVAL_STATUS_MAP: Record<number, string> = {
  0: 'Pending', 1: 'Approved', 2: 'Rejected'
};

// Hàm normalize
function normalizeEnum(value: any, map: Record<number, string>): string {
  if (typeof value === 'number' && map[value] !== undefined) return map[value];
  if (typeof value === 'string') return value;
  return String(value);
}

function normalizeTestSuite<T extends Record<string, any>>(suite: T): T {
  return {
    ...suite,
    generationType: normalizeEnum(suite.generationType, GENERATION_TYPE_MAP),
    status: normalizeEnum(suite.status, SUITE_STATUS_MAP),
    approvalStatus: normalizeEnum(suite.approvalStatus, APPROVAL_STATUS_MAP),
  };
}
```

**Áp dụng `normalizeTestSuite` tại 3 nơi:**
- `getTestSuites()` — `.map(normalizeTestSuite)` trên mảng kết quả
- `getTestSuiteDetail()` — `normalizeTestSuite(response)` trên kết quả đơn
- `createTestSuite()` — `normalizeTestSuite(response)` trên kết quả đơn

---

### H-05: Xoá duplicate auto LLM trigger

**File:** `src/pages/TestRunsPage.tsx`

**Vấn đề:** Hàm `handleStartTestRun` có ~60 dòng code inline gọi trực tiếp LLM suggestion generation + failure explanation SAU khi start run. Nhưng hệ thống đã có hook `useAutoLLMAnalysis` lắng nghe SignalR event `TestRunStatusChanged` và tự động trigger. → **Duplicate triggers**, gây race condition.

**Thay đổi:**

Xoá toàn bộ block code inline fallback (dòng ~330-390 cũ):
```typescript
// ĐÃ XOÁ: ~60 dòng code bao gồm:
// - Lấy suiteDetail → gọi POST /llm-suggestions/generate
// - Lấy runDetail → filter failedCases → gọi POST /failures/{id}/explanation
// - Ghi localStorage autoLLMAnalysis_processedRuns
```

Thay bằng comment giải thích:
```typescript
// Post-run LLM analysis (suggestions + failure explanations) is handled
// by the useAutoLLMAnalysis hook via SignalR TestRunStatusChanged events.
// No inline fallback trigger needed here to avoid duplicate side effects.
```

---

### H-06: Fix auth token key khi 401

**File:** `src/services/apiService.ts`

**Vấn đề:** Khi gặp 401, code xoá `localStorage.removeItem("token")` — nhưng key thực tế lưu token là `"authToken"` (xem `src/config/api.ts`). → Token không bị xoá, user bị stuck.

**Thay đổi — tại 5 vị trí trong file** (tất cả các 401 handler):

```typescript
// TRƯỚC (5 chỗ):
localStorage.removeItem("token");

// SAU (5 chỗ):
localStorage.removeItem("authToken");
localStorage.removeItem("refreshToken");
```

**Vị trí cụ thể:**
1. `performRequest()` — 401 handler cho JSON response
2. `performRequest()` — 401 handler cho non-JSON response
3. `uploadFile()` — 401 handler
4. `downloadFile()` — 401 handler
5. (Nếu có thêm handler nào cũng đã được sửa)

---

## Medium Priority Fixes

### M-01: Fix pagination param

**File:** `src/services/projectService.ts`

**Vấn đề:** FE gửi `pageNumber` nhưng BE contract là `GET /api/projects?page=&pageSize=`.

**Thay đổi** (dòng ~81-92):
```typescript
// TRƯỚC:
const params = new URLSearchParams({
  pageNumber: page.toString(),
  pageSize: pageSize.toString(),
});

// SAU:
const params = new URLSearchParams({
  page: page.toString(),
  pageSize: pageSize.toString(),
});
```

---

### M-02: Thêm strictValidation toggle

**Files:** `src/services/testRunService.ts`, `src/pages/TestRunsPage.tsx`

**Vấn đề:** BE hỗ trợ `strictValidation` param trong `POST /test-runs/start` nhưng FE không gửi.

**Thay đổi 1 — `src/services/testRunService.ts`:**

Thêm field vào interface (dòng ~278-281):
```typescript
export interface StartTestRunRequest {
  testSuiteId: string;
  environmentId?: string;
  selectedTestCaseIds?: string[];
  strictValidation?: boolean; // ← MỚI
}
```
Đã include `strictValidation` trong body gửi lên BE.

**Thay đổi 2 — `src/pages/TestRunsPage.tsx`:**

- Thêm state (dòng 91):
  ```typescript
  const [strictValidation, setStrictValidation] = useState(false);
  ```

- Gửi trong `handleStartTestRun`:
  ```typescript
  await startTestRun({
    ...otherParams,
    strictValidation, // ← MỚI
  });
  ```

- Thêm UI toggle trong start run modal (dòng ~1280-1310):
  ```tsx
  {/* Strict Validation Toggle */}
  <div className="flex items-center justify-between py-2">
    <div>
      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
        Strict Validation
      </label>
      <p className="text-xs text-on-surface-variant mt-0.5">
        When enabled, test cases without expectations will fail instead of warn.
      </p>
    </div>
    <button type="button" onClick={() => setStrictValidation((prev) => !prev)}
      className={cn("relative inline-flex h-6 w-11 items-center rounded-full ...",
        strictValidation ? "bg-primary" : "bg-slate-300"
      )}>
      <span className={cn("inline-block h-4 w-4 rounded-full bg-white ...",
        strictValidation ? "translate-x-6" : "translate-x-1"
      )} />
    </button>
  </div>
  ```

- Reset khi đóng modal:
  ```typescript
  setStrictValidation(false);
  ```

---

### M-03: Thêm LLMAssisted generationType

**File:** `src/services/testSuiteService.ts`

**Vấn đề:** BE hỗ trợ `generationType = 2 (LLMAssisted)` nhưng FE type chỉ có `'Auto' | 'Manual'`.

**Thay đổi:**

- Interface `TestSuite.generationType`: thêm `| 'LLMAssisted'`
- Interface `CreateTestSuiteRequest.generationType`: thêm `| 'LLMAssisted'`
- Interface `TestSuite.status`: thêm `| 'Ready'`
- Enum map: `GENERATION_TYPE_MAP[2] = 'LLMAssisted'`, `SUITE_STATUS_MAP[2] = 'Ready'`

---

### M-04: Parse validation field errors từ BE

**File:** `src/services/apiService.ts`

**Vấn đề:** BE trả validation errors dạng dictionary `{ errors: { fieldName: ["error1", "error2"] } }`, nhưng FE chỉ parse dạng array `errors[0].message` → validation messages bị mất.

**Thay đổi** (dòng ~85-104):

```typescript
// TRƯỚC:
errorMessage =
  errorData.message ||
  errorData.errors?.[0]?.message ||
  errorData.detail ||
  errorMessage;

// SAU:
if (errorData.errors && typeof errorData.errors === 'object' && !Array.isArray(errorData.errors)) {
  // Parse dictionary format: { fieldName: ["msg1", "msg2"] }
  const fieldErrors = Object.entries(errorData.errors)
    .map(([field, messages]) => {
      const msgs = Array.isArray(messages) ? messages.join(', ') : String(messages);
      return `${field}: ${msgs}`;
    })
    .join('; ');
  errorMessage = fieldErrors || errorData.title || errorMessage;
} else {
  // Fallback: array format hoặc các field khác
  errorMessage =
    errorData.message || errorData.title || errorData.error ||
    errorData.detail ||
    (Array.isArray(errorData.errors) && errorData.errors[0]?.message) ||
    errorMessage;
}
```

**Ví dụ output:**
- Input BE: `{ errors: { Name: ["Name is required"], Email: ["Invalid format"] } }`
- Output FE: `"Name: Name is required; Email: Invalid format"`

---

## Tổng kết files đã thay đổi

| # | File | Fixes áp dụng |
|---|------|--------------|
| 1 | `src/pages/GeneratingTestCasesPage.tsx` | C-01, C-02 |
| 2 | `src/hooks/useSpecifications.ts` | C-03 |
| 3 | `src/pages/SpecificationPage.tsx` | C-03 |
| 4 | `src/services/apiService.ts` | H-06, M-04 |
| 5 | `src/services/specificationService.ts` | H-02 |
| 6 | `src/services/testSuiteService.ts` | H-01, H-04, M-03 |
| 7 | `src/services/projectService.ts` | M-01 |
| 8 | `src/services/testRunService.ts` | M-02 |
| 9 | `src/pages/TestSuitesPage.tsx` | H-03 |
| 10 | `src/pages/TestRunsPage.tsx` | H-05, M-02 |
| 11 | `src/pages/TestSuiteDetailPage.tsx` | H-01 |
