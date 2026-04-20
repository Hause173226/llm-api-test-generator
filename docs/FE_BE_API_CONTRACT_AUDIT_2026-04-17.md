# FE-BE API Contract Audit Report

Ngay tao: 2026-04-17

## 1. Muc tieu

Tong hop ket qua doi chieu source FE voi hop dong API trong:

- BE/GSP26SE43.ModularMonolith/docs/frontend

Trong pham vi:

- Route API
- HTTP method
- Query params
- Request body params bat buoc
- Cac quy tac runtime de FE khong goi sai contract

## 2. Tai lieu da doi chieu

Da doc toan bo nhom handoff FE:

- FE-02-api-documentation-frontend
- FE-03-json-parsing-endpoints-frontend
- FE-04-test-configuration-frontend
- FE-05-test-generation-frontend
- FE-06-boundary-negative-generation-frontend
- FE-07-08-test-execution-validation-frontend
- FE-09-failure-explanation-frontend
- FE-10-reports-export-frontend
- FE-12-path-parameter-templating-frontend
- FE-14-subscription-billing-frontend
- FE-15-llm-suggestion-review-frontend
- FE-16-llm-feedback-frontend
- FE-17-llm-suggestion-bulk-review-frontend
- FE-18-project-delete-quota-cascade-guide.md

## 3. Ket luan nhanh

FE hien tai co nhieu diem lech contract, trong do co cac loi nghiem trong anh huong truc tiep toi kha nang goi API thanh cong:

- Reports dang goi sai nhom endpoint
- Subscribe payment thieu param bat buoc billingCycle
- Create/Update endpoint dang truyen sai ten truong bat buoc (method thay vi httpMethod)

## 4. Findings theo muc do nghiem trong

### 4.1 Critical

#### C1. Reports dang goi sai route group so voi FE-10

- FE hien tai:
  - FE/llm-api-test-generator/src/services/reportService.ts:77
  - FE/llm-api-test-generator/src/services/reportService.ts:87
  - FE/llm-api-test-generator/src/services/reportService.ts:101
  - FE/llm-api-test-generator/src/pages/ReportsPage.tsx:55
- Dang goi theo project-level: /projects/{projectId}/reports...
- Contract FE-10 yeu cau route theo test run:
  - /test-suites/{suiteId}/test-runs/{runId}/reports
  - /test-suites/{suiteId}/test-runs/{runId}/reports/{reportId}/download
- Doc tham chieu:
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-10-reports-export-frontend/reports-api.json
- Tac dong:
  - Nguy co cao route khong ton tai/khong dung payload theo backend hien tai

#### C2. Subscribe payment thieu billingCycle bat buoc

- FE hien tai:
  - FE/llm-api-test-generator/src/services/subscriptionService.ts:86
  - FE/llm-api-test-generator/src/pages/BillingPage.tsx:49
- Dang goi POST /payments/subscribe/{planId} voi body rong
- Contract FE-14 yeu cau body CreateSubscriptionPaymentModel co billingCycle
- Doc tham chieu:
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-14-subscription-billing-frontend/payments-api.json
- Tac dong:
  - De bi 400 validation error hoac tao intent sai chu ky

#### C3. Create/Update endpoint dang truyen sai ten field bat buoc

- FE hien tai:
  - FE/llm-api-test-generator/src/services/endpointService.ts:82
  - FE/llm-api-test-generator/src/services/endpointService.ts:94
  - FE/llm-api-test-generator/src/pages/EndpointsPage.tsx:156
  - FE/llm-api-test-generator/src/pages/EndpointsPage.tsx:167
- FE model dung field method
- Contract FE-03 yeu cau field httpMethod (bat buoc) + path (bat buoc)
- Doc tham chieu:
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-03-json-parsing-endpoints-frontend/endpoints-api.json
- Tac dong:
  - Co the tao/update endpoint that bai hoac backend bo qua gia tri method

### 4.2 High

#### H1. Param phan trang projects sai ten

- FE hien tai:
  - FE/llm-api-test-generator/src/services/projectService.ts:153
  - FE/llm-api-test-generator/src/services/projectService.ts:154
  - FE/llm-api-test-generator/src/services/projectService.ts:159
- Dang gui pageNumber/pageSize
- Contract FE-02 ghi nhan page/pageSize
- Doc tham chieu:
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-02-api-documentation-frontend/projects-api.json
- Tac dong:
  - Backend co the fallback default page, dan den phan trang sai

#### H2. Test run service dang su dung nhieu route ngoai contract FE-07/08

- FE hien tai:
  - FE/llm-api-test-generator/src/services/testRunService.ts:294
  - FE/llm-api-test-generator/src/services/testRunService.ts:316
  - FE/llm-api-test-generator/src/services/testRunService.ts:329
  - FE/llm-api-test-generator/src/services/testRunService.ts:345
  - FE/llm-api-test-generator/src/services/testRunService.ts:352
  - FE/llm-api-test-generator/src/services/testRunService.ts:357
- Contract FE-07/08 handoff theo nhom /test-suites/{suiteId}/test-runs...
- Doc tham chieu:
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-07-08-test-execution-validation-frontend/test-runs-api.json
- Tac dong:
  - De gap mismatch route va behavior khong dung voi runtime notes

#### H3. Upload specification co GraphQL option khong nam trong contract hien tai

- FE hien tai:
  - FE/llm-api-test-generator/src/services/specificationService.ts:52
  - FE/llm-api-test-generator/src/pages/SpecificationPage.tsx:560
- FE cho chon GraphQL va map SourceType=2
- Contract FE-03 mo ta upload file chi nhan OpenAPI/Postman
- Doc tham chieu:
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-03-json-parsing-endpoints-frontend/README.md
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-03-json-parsing-endpoints-frontend/specifications-api.json
- Tac dong:
  - Upload GraphQL co kha nang that bai validation

#### H4. Luong Billing chua hoan tat tao payment link theo contract

- FE hien tai:
  - FE/llm-api-test-generator/src/pages/BillingPage.tsx:66
- Co TODO cho payos/create, hien tai thong bao Payment integration incomplete
- Contract FE-14 co nhom /payments/payos/create va redirect flow
- Tac dong:
  - Luong thanh toan dang dang do

#### H5. FE-18 spec soft-delete/restore chua duoc tich hop

- FE-18 yeu cau bo sung:
  - GET specifications ho tro includeDeleted=true (trash view)
  - POST /projects/{projectId}/specifications/{specId}/restore
  - model spec co isDeleted va deletedAt
- FE hien tai:
  - FE/llm-api-test-generator/src/services/specificationService.ts:32
  - FE/llm-api-test-generator/src/services/specificationService.ts:75
  - FE/llm-api-test-generator/src/hooks/useSpecifications.ts:13
- Khong co includeDeleted query.
- Khong co API restore specification.
- Khong co truong isDeleted/deletedAt trong interface Specification.
- Tac dong:
  - FE chua co kha nang xay dung trash va khoi phuc specification theo FE-18.

### 4.3 Medium

#### M1. Update specification route dang duoc goi nhung khong thay trong handoff FE-02/03

- FE hien tai:
  - FE/llm-api-test-generator/src/services/specificationService.ts:65
  - FE/llm-api-test-generator/src/services/specificationService.ts:70
- Khong thay route PUT /projects/{projectId}/specifications/{specId} trong docs frontend
- Doc tham chieu:
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-02-api-documentation-frontend/specifications-api.json
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-03-json-parsing-endpoints-frontend/specifications-api.json
- Tac dong:
  - Rui ro goi route khong ton tai

#### M2. Generate test cases dang goi route legacy duy nhat

- FE hien tai:
  - FE/llm-api-test-generator/src/pages/GeneratingTestCasesPage.tsx:92
- Chi goi /test-suites/{suiteId}/generate-tests
- Khong thay goi generate-happy-path va generate-boundary-negative
- Doc tham chieu:
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-05-test-generation-frontend/happy-path-test-cases-api.json
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-06-boundary-negative-generation-frontend/boundary-negative-test-cases-api.json
- Tac dong:
  - Khong truyen duoc cac param quan trong nhu specificationId, forceRegenerate, includePathMutations...

#### M3. Cancel subscription body field chua dung ten theo contract

- FE hien tai:
  - FE/llm-api-test-generator/src/services/subscriptionService.ts:91
- FE gui reason
- Contract mo ta CancelSubscriptionModel co effectiveDate va changeReason
- Doc tham chieu:
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-14-subscription-billing-frontend/subscriptions-api.json
- Tac dong:
  - Backend co the bo qua ly do huy

#### M4. FE-12 path parameter templating chua duoc tich hop vao UI

- Khong thay call den:
  - /resolved-url
  - /path-param-mutations
- Trong khi FE-12 handoff coi day la API chinh de preview va generate mutation
- Doc tham chieu:
  - BE/GSP26SE43.ModularMonolith/docs/frontend/FE-12-path-parameter-templating-frontend/path-parameter-templating-api.json
- Tac dong:
  - Chua khai thac du tinh nang FE-12

#### M5. Chua co UX theo guide FE-18 cho delete spec

- FE hien tai sau khi xoa spec chi refetch list va show toast thanh cong:
  - FE/llm-api-test-generator/src/pages/SpecificationPage.tsx:142
- Chua co:
  - Trash tab/list
  - Nut khoi phuc
  - Undo nhanh sau khi delete
- Tac dong:
  - Nguoi dung khong the khoi phuc spec da soft-delete du backend da ho tro.

### 4.4 Low

#### L1. Nhanh suggestions cu theo project van ton tai (de gay nham)

- FE hien tai:
  - FE/llm-api-test-generator/src/services/llmSuggestionService.ts:47
  - FE/llm-api-test-generator/src/services/llmSuggestionService.ts:109
- Nhom nay khong theo flow suite-level FE-15/16/17
- Hien khong thay duoc su dung truc tiep o pages
- Tac dong:
  - De lam team hieu nham route chuan

## 5. Cac diem dang dung contract tot

- Execution environment CRUD + rowVersion query cho delete:
  - FE/llm-api-test-generator/src/services/environmentService.ts:185
- FE-18 project delete + usage refresh da co best-effort implementation:
  - FE/llm-api-test-generator/src/hooks/useProjects.ts:108
  - FE/llm-api-test-generator/src/hooks/useProjects.ts:113
  - FE/llm-api-test-generator/src/hooks/useSubscription.ts:68
- Suite-level LLM suggestions flow (generate/list/review/bulk):
  - FE/llm-api-test-generator/src/services/testSuiteLlmSuggestionService.ts:110
- Failure explanation GET/POST theo FE-09:
  - FE/llm-api-test-generator/src/hooks/useAutoLLMAnalysis.ts:219
  - FE/llm-api-test-generator/src/pages/SuggestionsPage.tsx:255

## 6. De xuat thu tu sua

### Pha 1 (uu tien ngay)

- Sua Reports service + ReportsPage theo route FE-10 (suiteId + runId)
- Them billingCycle vao luong subscribe
- Chuyen payload endpoint create/update tu method sang httpMethod

### Pha 2

- Chuan hoa test-run service theo route FE-07/08
- Chuan hoa upload spec bo GraphQL option neu backend chua ho tro
- Chuyen projects pagination sang page/pageSize

### Pha 3

- Lam sach code legacy (llmSuggestionService cu)
- Tich hop FE-12 resolved-url/path-param-mutations vao UI endpoint detail
- Tich hop FE-16 feedback UI

### 6.1 Huong dan sua C1 (Reports migration sang FE-10)

Muc tieu:

- Chuyen toan bo report APIs tu project-level sang test-run-level.

Files can sua:

- FE/llm-api-test-generator/src/services/reportService.ts
- FE/llm-api-test-generator/src/hooks/useReports.ts
- FE/llm-api-test-generator/src/pages/ReportsPage.tsx

Huong dan:

1. Refactor reportService theo contract FE-10:

- generateReport:
  - tu: POST /projects/{projectId}/reports/generate
  - thanh: POST /test-suites/{suiteId}/test-runs/{runId}/reports
- getReports:
  - tu: GET /projects/{projectId}/reports
  - thanh: GET /test-suites/{suiteId}/test-runs/{runId}/reports
- getReportById:
  - tu: GET /projects/{projectId}/reports/{reportId}
  - thanh: GET /test-suites/{suiteId}/test-runs/{runId}/reports/{reportId}
- exportReport:
  - tu: /projects/{projectId}/reports/{reportId}/export
  - thanh: /test-suites/{suiteId}/test-runs/{runId}/reports/{reportId}/download

2. Doi type request generate theo FE-10:

- bat buoc reportType, format
- optional recentHistoryLimit

3. Cap nhat UI ReportsPage de nguoi dung chon suite + run truoc khi goi API.
4. Bo/canh bao cac widget coverage/trend/performance neu backend hien tai khong co route tuong ung trong handoff FE-10.

Dieu kien pass:

- Tao report thanh cong (201)
- List report theo run tra ve dung du lieu
- Download report tra blob hop le

### 6.2 Huong dan sua C2 (Subscribe payment)

Muc tieu:

- Truyen du billingCycle vao POST /payments/subscribe/{planId}.

Files can sua:

- FE/llm-api-test-generator/src/services/subscriptionService.ts
- FE/llm-api-test-generator/src/hooks/useSubscription.ts
- FE/llm-api-test-generator/src/pages/BillingPage.tsx

Huong dan:

1. Doi signatue subscribeToPlan:

- tu: subscribeToPlan(planId)
- thanh: subscribeToPlan(planId, billingCycle)

2. Body request phai co billingCycle:

- Monthly = 0
- Yearly = 1

3. Tren UI BillingPage:

- Them picker chu ky thanh toan truoc khi bam Subscribe
- Truyen dung billingCycle vao hook/service

4. Bo TODO khong can thiet va noi day du flow payos/create neu response subscribe yeu cau buoc tiep theo.

Dieu kien pass:

- Khong con 400 do thieu billingCycle
- Nhan duoc checkout flow dung chu ky user chon

### 6.3 Huong dan sua C3 (Endpoint payload method -> httpMethod)

Muc tieu:

- Dam bao request create/update endpoint gui dung httpMethod + path.

Files can sua:

- FE/llm-api-test-generator/src/services/endpointService.ts
- FE/llm-api-test-generator/src/pages/EndpointsPage.tsx
- FE/llm-api-test-generator/src/types (neu can tach model form va model API)

Huong dan:

1. Tach model giao dien va model API:

- UI co the giu field method de render.
- Payload API phai map sang httpMethod.

2. Khi create/update:

- map method -> httpMethod
- giu nguyen path

3. Neu co parameters/responses trong form, map dung shape contract FE-03.

Dieu kien pass:

- Create endpoint khong bi validation loi truong bat buoc
- Update endpoint thanh cong voi method da doi

### 6.4 Huong dan sua H2 (TestRun service chuan FE-07/08)

Muc tieu:

- Dong bo test-run APIs theo nhom /test-suites/{suiteId}/test-runs.

Files can sua:

- FE/llm-api-test-generator/src/services/testRunService.ts
- FE/llm-api-test-generator/src/services/dashboardService.ts
- FE/llm-api-test-generator/src/hooks/useTestRuns.ts

Huong dan:

1. Uu tien route suite-level cho list/detail/results.
2. Loai bo hoac danh dau legacy cho cac route:

- /projects/{projectId}/test-runs
- /test-runs/{id}/cancel
- /test-runs/{id}/retry-failed
- /test-runs/{id}/export

3. Neu chua co route thay the trong handoff, tach service thanh:

- stableContract APIs (theo docs)
- legacy APIs (flag/tam thoi)

Dieu kien pass:

- Start run/list/results hoat dong on dinh voi suiteId
- Khong con phu thuoc chinh vao project-level test-run routes

### 6.5 Huong dan sua FE-18 (Specification soft-delete/restore)

Muc tieu:

- Ho tro trash view va restore specification theo guide FE-18.

Files can sua:

- FE/llm-api-test-generator/src/services/specificationService.ts
- FE/llm-api-test-generator/src/hooks/useSpecifications.ts
- FE/llm-api-test-generator/src/pages/SpecificationPage.tsx

Huong dan:

1. Nang cap model Specification:

- Them isDeleted?: boolean
- Them deletedAt?: string | null

2. Nang cap service:

- getSpecifications(projectId, includeDeleted?)
- restoreSpecification(projectId, specId)

3. Nang cap hook:

- Ho tro refetch theo mode Main/Trash

4. Nang cap page:

- Them filter tab Main/Trash
- Trash tab goi includeDeleted=true
- Them nut Restore cho item trash
- Sau restore: refetch Main + toast thanh cong

5. Optional UX:

- Undo nhanh sau delete (goi restore trong khoang ngan)

Dieu kien pass:

- Xoa spec thanh cong va spec bien mat khoi Main
- Trash hien dung spec da xoa
- Restore dua spec tro lai Main

### 6.6 Checklist verify sau khi sua

1. Project delete:

- Delete project thanh cong
- Usage tren billing cap nhat sau su kien usage:updated

2. Subscribe:

- Subscribe voi Monthly/Yearly deu gui dung billingCycle

3. Endpoints:

- Create/update payload co httpMethod

4. Reports:

- Generate/list/download theo suite+run

5. Specifications FE-18:

- Main/Trash va Restore hoat dong

6. Regression:

- Chay lint/typecheck/test (neu co)

## 7. Kiem tra rieng FE-18

### 7.1 Ket qua tong quan

- Da dat mot phan:
  - Xoa project xong co goi refresh usage best-effort va broadcast su kien usage:updated.
- Chua dat phan moi cua FE-18:
  - Soft-delete specification co trash view + restore flow.

### 7.2 Mapping yeu cau FE-18 -> trang thai FE

1. DELETE /projects/{id} xong refresh quota:

- Trang thai: Da co (best-effort)
- Bang chung:
  - FE/llm-api-test-generator/src/hooks/useProjects.ts:108
  - FE/llm-api-test-generator/src/hooks/useProjects.ts:113

2. Broadcast de trang billing cap nhat usage:

- Trang thai: Da co
- Bang chung:
  - FE/llm-api-test-generator/src/hooks/useProjects.ts:116
  - FE/llm-api-test-generator/src/hooks/useSubscription.ts:68

3. GET specifications?includeDeleted=true:

- Trang thai: Chua co
- Bang chung:
  - FE/llm-api-test-generator/src/services/specificationService.ts:32

4. POST specifications/{specId}/restore:

- Trang thai: Chua co
- Bang chung:
  - Khong tim thay call /restore trong src

5. Spec model co isDeleted/deletedAt:

- Trang thai: Chua co
- Bang chung:
  - FE/llm-api-test-generator/src/services/specificationService.ts:4

6. UX trash + restore + undo:

- Trang thai: Chua co
- Bang chung:
  - FE/llm-api-test-generator/src/pages/SpecificationPage.tsx:142

### 7.3 De xuat sua FE-18

1. Nang cap specificationService:

- Them getSpecifications(projectId, includeDeleted?)
- Them restoreSpecification(projectId, specId)

2. Nang cap Specification interface:

- Them isDeleted?: boolean
- Them deletedAt?: string | null

3. Nang cap SpecificationPage:

- Them bo loc Main/Trash
- Them action Restore cho item trong Trash
- Them toast Undo sau delete (goi restore)

## 8. Ghi chu

- Bao cao nay coi docs frontend handoff la nguon su that chinh theo yeu cau doi chieu.
- Neu backend runtime da mo them route ngoai handoff, can cap nhat lai docs/frontend de tranh mismatch giua FE team va BE team.
