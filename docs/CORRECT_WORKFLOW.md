# Correct Workflow - Frontend Implementation

## 📋 Workflow đúng theo Backend

### 1. Tạo Project (Create Project)

**Page**: `ProjectManagementPage.tsx`
**Action**: User tạo project mới với name, description, specType

```
POST /api/projects
Body: {
  "name": "My API Project",
  "description": "Project description",
  "type": "REST" | "GraphQL" | "gRPC"
}
```

**After Success**: Redirect đến `/specifications?projectId={newProjectId}`

---

### 2. Upload API Specification

**Page**: `SpecificationPage.tsx`
**Action**: User upload API spec file (OpenAPI/Swagger/Postman)

```
POST /api/projects/{projectId}/specifications
Body: FormData {
  "name": "API Spec v1.0",
  "description": "...",
  "type": "openapi",
  "file": File
}
```

**After Success**:

- Specification được lưu vào database
- User có thể click "Parse" để extract endpoints

---

### 3. Parse Specification (Extract Endpoints)

**Page**: `SpecificationPage.tsx`
**Action**: System parse spec file và extract endpoints

```
POST /api/specifications/{specId}/parse
```

**Result**:

- System tạo các `Endpoint` entities từ spec file
- Mỗi endpoint có: method, path, parameters, request/response schemas
- Endpoints được lưu vào database

**After Success**: User có thể xem endpoints trong `EndpointsPage`

---

### 4. View Endpoints

**Page**: `EndpointsPage.tsx`
**Action**: User xem danh sách endpoints đã được parse

```
GET /api/specifications/{specId}/endpoints
```

**Display**:

- List of endpoints với method, path, description
- Endpoint details: parameters, schemas
- Status: parsed, ready for test generation

---

### 5. Generate Test Suite

**Page**: `TestSuitesPage.tsx` hoặc `ProjectDetailedViewPage.tsx`
**Action**: User tạo test suite từ endpoints

```
POST /api/projects/{projectId}/test-suites/generate
Body: {
  "name": "API Test Suite",
  "description": "...",
  "endpointIds": ["endpoint1", "endpoint2", ...],
  "config": {
    "includeHappyPath": true,
    "includeNegative": true,
    "includeBoundary": true,
    "includeSecurity": false
  }
}
```

**Backend Process**:

1. Backend gửi request đến n8n workflow
2. n8n calls LLM (OpenAI/Claude) để generate test cases
3. LLM returns test cases + execution order proposal
4. Backend saves test cases vào database
5. Backend returns test suite ID

**After Success**: User có thể review test cases

---

### 6. Review Test Cases

**Page**: `TestCaseStudioPage.tsx`
**Action**: User xem và edit test cases

```
GET /api/test-suites/{suiteId}/test-cases
```

**Display**:

- List of test cases
- Each test case: name, request, expectations
- User có thể edit, delete, hoặc add new test cases

---

### 7. Review Test Order Proposal

**Page**: `TestOrderGatePage.tsx`
**Action**: User xem và approve test execution order

```
GET /api/test-suites/{suiteId}/order-proposal
```

**Display**:

- Visual graph of test execution order
- Dependencies between tests
- User có thể approve hoặc reject

```
POST /api/test-suites/{suiteId}/order-proposal/approve
```

---

### 8. Create Execution Environment

**Page**: `EnvironmentsPage.tsx`
**Action**: User tạo environment configuration

```
POST /api/projects/{projectId}/environments
Body: {
  "name": "Development",
  "baseUrl": "https://api.dev.example.com",
  "headers": {
    "Authorization": "Bearer {{token}}",
    "Content-Type": "application/json"
  },
  "variables": {
    "token": "dev-token-123"
  }
}
```

---

### 9. Execute Test Suite

**Page**: `TestSuitesPage.tsx` hoặc `TestRunsPage.tsx`
**Action**: User chạy test suite

```
POST /api/test-suites/{suiteId}/execute
Body: {
  "environmentId": "env-id",
  "parallel": false
}
```

**Backend Process**:

1. Resolve environment variables
2. Execute tests theo order đã approve
3. Validate responses
4. Log results
5. Generate report

**After Success**: User có thể xem results

---

### 10. View Test Results

**Page**: `TestRunsPage.tsx`
**Action**: User xem test execution results

```
GET /api/test-suites/{suiteId}/test-runs
GET /api/test-runs/{runId}/results
```

**Display**:

- Test run summary: passed, failed, skipped
- Detailed results for each test case
- Failure reasons
- Response logs

---

### 11. Analyze Failures (Optional)

**Page**: `FailureExplanationPage.tsx`
**Action**: User request LLM to explain failures

```
POST /api/test-runs/{runId}/failures/{testId}/explain
```

**LLM Analysis**:

- Root cause of failure
- Suggested fix
- Similar failures

---

### 12. Generate Report

**Page**: `ReportsPage.tsx`
**Action**: User generate test report

```
POST /api/test-runs/{runId}/reports/generate
Body: {
  "format": "PDF" | "HTML" | "JSON"
}
```

---

## 🔄 Complete Flow Diagram

```
1. Create Project
   ↓
2. Upload API Specification
   ↓
3. Parse Specification → Extract Endpoints
   ↓
4. View Endpoints
   ↓
5. Generate Test Suite (LLM)
   ↓
6. Review Test Cases
   ↓
7. Review & Approve Test Order
   ↓
8. Create Execution Environment
   ↓
9. Execute Test Suite
   ↓
10. View Test Results
   ↓
11. Analyze Failures (if any)
   ↓
12. Generate Report
```

---

## ✅ Frontend Changes Made

### 1. ProjectManagementPage.tsx

- ✅ After creating project, redirect to `/specifications?projectId={id}`
- ❌ OLD: Redirect to `/project/{id}` (project detail)

### 2. SpecificationPage.tsx

- ✅ Accept `projectId` from query parameter
- ✅ Upload specification functionality already exists
- ✅ Parse specification button

### 3. ProjectDetailedViewPage.tsx

- ✅ Fetch project from API (no mock data)
- ✅ Show "Create Test Suite" button
- ✅ Link to specifications page if no spec uploaded

---

## 🚧 TODO: Additional Improvements

### 1. Add Workflow Guidance

- Show progress indicator: "Step 1 of 12"
- Highlight next action user should take
- Disable actions that require previous steps

### 2. Add Validation

- Cannot generate test suite without endpoints
- Cannot execute tests without environment
- Cannot parse specification without upload

### 3. Add Notifications

- "Specification uploaded successfully. Click Parse to extract endpoints."
- "Endpoints extracted. Ready to generate test suite."
- "Test suite generated. Review test cases before execution."

### 4. Add Empty States

- "No specifications uploaded. Upload your first API spec to get started."
- "No endpoints found. Parse your specification first."
- "No test suites. Generate your first test suite from endpoints."

---

## 📝 Notes

- Backend sử dụng n8n workflow để generate test cases với LLM
- Test generation là async process (có thể mất vài giây)
- User cần approve test order trước khi execute
- Environment variables được resolve tại runtime

---

**Date**: 2026-03-27
**Status**: ✅ IMPLEMENTED
