# Backend API Endpoints - Danh sách API đã implement

## Ngày cập nhật: 27/03/2026

Tài liệu này liệt kê TẤT CẢ các API endpoints đã được implement trong Backend. Frontend CHỈ NÊN implement các API có trong danh sách này.

---

## 1. Authentication & Authorization (Identity Module)

### Base URL: `/api/auth`

| Method | Endpoint                              | Description                 | Status         |
| ------ | ------------------------------------- | --------------------------- | -------------- |
| POST   | `/api/auth/register`                  | Đăng ký tài khoản mới       | ✅ Implemented |
| POST   | `/api/auth/login`                     | Đăng nhập                   | ✅ Implemented |
| POST   | `/api/auth/refresh-token`             | Làm mới access token        | ✅ Implemented |
| POST   | `/api/auth/logout`                    | Đăng xuất                   | ✅ Implemented |
| GET    | `/api/auth/me`                        | Lấy thông tin user hiện tại | ✅ Implemented |
| POST   | `/api/auth/forgot-password`           | Yêu cầu reset mật khẩu      | ✅ Implemented |
| POST   | `/api/auth/reset-password`            | Reset mật khẩu              | ✅ Implemented |
| POST   | `/api/auth/change-password`           | Đổi mật khẩu                | ✅ Implemented |
| POST   | `/api/auth/confirm-email`             | Xác nhận email              | ✅ Implemented |
| POST   | `/api/auth/resend-confirmation-email` | Gửi lại email xác nhận      | ✅ Implemented |
| GET    | `/api/auth/me/profile`                | Lấy profile user            | ✅ Implemented |
| PUT    | `/api/auth/me/profile`                | Cập nhật profile            | ✅ Implemented |
| POST   | `/api/auth/me/avatar`                 | Upload avatar               | ✅ Implemented |

---

## 2. Projects (API Documentation Module)

### Base URL: `/api/projects`

| Method | Endpoint                       | Description            | Status         |
| ------ | ------------------------------ | ---------------------- | -------------- |
| GET    | `/api/projects`                | Lấy danh sách projects | ✅ Implemented |
| GET    | `/api/projects/{id}`           | Lấy chi tiết project   | ✅ Implemented |
| POST   | `/api/projects`                | Tạo project mới        | ✅ Implemented |
| PUT    | `/api/projects/{id}`           | Cập nhật project       | ✅ Implemented |
| PUT    | `/api/projects/{id}/archive`   | Archive project        | ✅ Implemented |
| PUT    | `/api/projects/{id}/unarchive` | Unarchive project      | ✅ Implemented |
| DELETE | `/api/projects/{id}`           | Xóa project            | ✅ Implemented |
| GET    | `/api/projects/{id}/auditlogs` | Lấy audit logs         | ✅ Implemented |

---

## 3. Test Suites (Test Generation Module)

### Base URL: `/api/projects/{projectId}/test-suites`

| Method | Endpoint                                          | Description               | Status         |
| ------ | ------------------------------------------------- | ------------------------- | -------------- |
| GET    | `/api/projects/{projectId}/test-suites`           | Lấy danh sách test suites | ✅ Implemented |
| GET    | `/api/projects/{projectId}/test-suites/{suiteId}` | Lấy chi tiết test suite   | ✅ Implemented |
| POST   | `/api/projects/{projectId}/test-suites`           | Tạo test suite mới        | ✅ Implemented |
| PUT    | `/api/projects/{projectId}/test-suites/{suiteId}` | Cập nhật test suite       | ✅ Implemented |
| DELETE | `/api/projects/{projectId}/test-suites/{suiteId}` | Archive test suite        | ✅ Implemented |

---

## 4. Test Cases (Test Generation Module)

### Base URL: `/api/test-suites/{suiteId}/test-cases`

| Method | Endpoint                                                           | Description                           | Status         |
| ------ | ------------------------------------------------------------------ | ------------------------------------- | -------------- |
| GET    | `/api/test-suites/{suiteId}/test-cases`                            | Lấy danh sách test cases              | ✅ Implemented |
| GET    | `/api/test-suites/{suiteId}/test-cases/{testCaseId}`               | Lấy chi tiết test case                | ✅ Implemented |
| POST   | `/api/test-suites/{suiteId}/test-cases`                            | Tạo test case mới                     | ✅ Implemented |
| PUT    | `/api/test-suites/{suiteId}/test-cases/{testCaseId}`               | Cập nhật test case                    | ✅ Implemented |
| DELETE | `/api/test-suites/{suiteId}/test-cases/{testCaseId}`               | Xóa test case                         | ✅ Implemented |
| PATCH  | `/api/test-suites/{suiteId}/test-cases/{testCaseId}/toggle`        | Bật/tắt test case                     | ✅ Implemented |
| PATCH  | `/api/test-suites/{suiteId}/test-cases/reorder`                    | Sắp xếp lại test cases                | ✅ Implemented |
| POST   | `/api/test-suites/{suiteId}/test-cases/generate-happy-path`        | Generate happy-path test cases        | ✅ Implemented |
| POST   | `/api/test-suites/{suiteId}/test-cases/generate-boundary-negative` | Generate boundary/negative test cases | ✅ Implemented |

---

## 5. Test Runs (Test Execution Module)

### Base URL: `/api/test-suites/{suiteId}/test-runs`

| Method | Endpoint                                               | Description             | Status         |
| ------ | ------------------------------------------------------ | ----------------------- | -------------- |
| POST   | `/api/test-suites/{suiteId}/test-runs`                 | Bắt đầu test run        | ✅ Implemented |
| GET    | `/api/test-suites/{suiteId}/test-runs`                 | Lấy danh sách test runs | ✅ Implemented |
| GET    | `/api/test-suites/{suiteId}/test-runs/{runId}`         | Lấy chi tiết test run   | ✅ Implemented |
| GET    | `/api/test-suites/{suiteId}/test-runs/{runId}/results` | Lấy kết quả test run    | ✅ Implemented |

---

## 6. Execution Environments (Test Execution Module)

### Base URL: `/api/projects/{projectId}/execution-environments`

| Method | Endpoint                                                           | Description                | Status         |
| ------ | ------------------------------------------------------------------ | -------------------------- | -------------- |
| GET    | `/api/projects/{projectId}/execution-environments`                 | Lấy danh sách environments | ✅ Implemented |
| GET    | `/api/projects/{projectId}/execution-environments/{environmentId}` | Lấy chi tiết environment   | ✅ Implemented |
| POST   | `/api/projects/{projectId}/execution-environments`                 | Tạo environment mới        | ✅ Implemented |
| PUT    | `/api/projects/{projectId}/execution-environments/{environmentId}` | Cập nhật environment       | ✅ Implemented |
| DELETE | `/api/projects/{projectId}/execution-environments/{environmentId}` | Xóa environment            | ✅ Implemented |

---

## 7. Test Reports (Test Reporting Module)

### Base URL: `/api/test-suites/{suiteId}/test-runs/{runId}/reports`

| Method | Endpoint                                               | Description           | Status         |
| ------ | ------------------------------------------------------ | --------------------- | -------------- |
| POST   | `/api/test-suites/{suiteId}/test-runs/{runId}/reports` | Tạo report            | ✅ Implemented |
| GET    | `/api/test-suites/{suiteId}/test-runs/{runId}/reports` | Lấy danh sách reports | ✅ Implemented |

---

## 8. LLM Suggestions (Test Generation Module)

### Base URL: `/api/test-suites/{suiteId}/llm-suggestions`

| Method | Endpoint                                     | Description                   | Status         |
| ------ | -------------------------------------------- | ----------------------------- | -------------- |
| GET    | `/api/test-suites/{suiteId}/llm-suggestions` | Lấy danh sách LLM suggestions | ✅ Implemented |

---

## 9. Failure Explanations (LLM Assistant Module)

### Base URL: `/api/failure-explanations`

| Method              | Endpoint | Description | Status          |
| ------------------- | -------- | ----------- | --------------- |
| (Cần kiểm tra thêm) | -        | -           | ⚠️ Cần xác nhận |

---

## 10. Files (Storage Module)

### Base URL: `/api/files`

| Method              | Endpoint | Description | Status          |
| ------------------- | -------- | ----------- | --------------- |
| (Cần kiểm tra thêm) | -        | -           | ⚠️ Cần xác nhận |

---

## 11. Audit Logs (Audit Log Module)

### Base URL: `/api/auditlogs`

| Method              | Endpoint | Description | Status          |
| ------------------- | -------- | ----------- | --------------- |
| (Cần kiểm tra thêm) | -        | -           | ⚠️ Cần xác nhận |

---

## ❌ API KHÔNG CÓ TRONG BACKEND (Frontend không nên implement)

### Notifications (CHƯA CÓ)

- ❌ GET `/api/notifications` - Không có trong Backend
- ❌ GET `/api/notifications/unread-count` - Không có trong Backend
- ❌ GET `/api/notifications/settings` - Không có trong Backend
- ❌ POST `/api/notifications/{id}/read` - Không có trong Backend
- ❌ DELETE `/api/notifications/{id}` - Không có trong Backend

### User Preferences (CHƯA CÓ)

- ❌ GET `/api/users/me/preferences` - Không có trong Backend
- ❌ PUT `/api/users/me/preferences` - Không có trong Backend

### User Avatar (CÓ NHƯNG KHÁC)

- ✅ POST `/api/auth/me/avatar` - CÓ trong Backend (upload)
- ❌ DELETE `/api/users/me/avatar` - KHÔNG CÓ trong Backend

---

## 📝 Ghi chú quan trọng

### 1. Authentication

- Backend sử dụng JWT tokens với refresh token rotation
- Refresh token được lưu trong HTTP-only cookie
- Access token có thời gian sống ngắn (cần refresh thường xuyên)

### 2. Authorization

- Tất cả endpoints (trừ auth) đều yêu cầu authentication
- Sử dụng permission-based authorization
- Mỗi endpoint có permission riêng (ví dụ: `Permissions.GetProjects`)

### 3. Error Handling

- Backend trả về error messages bằng tiếng Việt
- Status codes: 200, 201, 204, 400, 401, 403, 404, 409, 429, 500
- Error format: `{ "Error": "message" }` hoặc `{ "Errors": ["message1", "message2"] }`

### 4. Pagination

- Sử dụng `page` và `pageSize` query parameters
- Response format: `Paged<T>` với `items`, `totalCount`, `pageNumber`, `pageSize`

### 5. File Upload

- Maximum file size: 2MB
- Allowed types: JPEG, PNG, GIF, WebP
- Validation bằng magic bytes (không tin tưởng file extension)

---

## 🔄 Cập nhật Frontend

### Các service cần giữ lại (đã có API trong Backend):

- ✅ `authService.ts` - Authentication APIs
- ✅ `projectService.ts` - Project APIs (nếu có)
- ✅ `testSuiteService.ts` - Test Suite APIs
- ✅ `testCaseService.ts` - Test Case APIs
- ✅ `testRunService.ts` - Test Run APIs
- ✅ `environmentService.ts` - Execution Environment APIs
- ✅ `reportService.ts` - Report APIs
- ✅ `llmSuggestionService.ts` - LLM Suggestion APIs

### Các service cần xóa hoặc disable (KHÔNG có API trong Backend):

- ❌ `notificationService.ts` - KHÔNG CÓ API
- ❌ `userService.ts` (phần preferences) - KHÔNG CÓ API

### Các component cần disable:

- ❌ `NotificationCenter.tsx` - Đã disable trong TopAppBar
- ❌ Các tính năng liên quan đến notifications

---

## 🎯 Hành động tiếp theo

1. **Kiểm tra lại các service trong Frontend**
   - Xóa hoặc comment out các API calls không có trong Backend
   - Cập nhật error handling theo format của Backend
   - Đảm bảo tất cả API calls sử dụng đúng endpoints

2. **Cập nhật documentation**
   - Cập nhật `API_INTEGRATION_MAPPING.md`
   - Đánh dấu các API nào đã có, chưa có

3. **Testing**
   - Test tất cả các API calls với Backend thật
   - Xác nhận error handling hoạt động đúng
   - Kiểm tra authentication flow

4. **Cleanup**
   - Xóa mock data không cần thiết
   - Xóa các service không sử dụng
   - Cleanup unused imports

---

**Lưu ý**: Tài liệu này cần được cập nhật thường xuyên khi Backend thêm API mới.
