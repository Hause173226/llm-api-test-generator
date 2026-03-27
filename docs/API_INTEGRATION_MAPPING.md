# API Integration Mapping - Frontend to Backend

## 📋 Tổng quan

Tài liệu này map các trang Frontend với Backend API endpoints, bỏ qua:

- ❌ Audit Logs
- ❌ Admin User Management
- ❌ Subscription/Billing Management

## 🔗 Base Configuration

```typescript
// src/config/api.ts
export const API_CONFIG = {
  BASE_URL: process.env.VITE_API_BASE_URL || "http://localhost:5000",
  TIMEOUT: 30000,
  HEADERS: {
    "Content-Type": "application/json",
  },
};

// Token management
export const getAuthToken = () => localStorage.getItem("authToken");
export const setAuthToken = (token: string) =>
  localStorage.setItem("authToken", token);
export const clearAuthToken = () => localStorage.removeItem("authToken");
```

---

## 🔐 Authentication APIs

### Login Page (`/login`)

**Frontend Action**: User login
**Backend Endpoint**: `POST /api/auth/login`

```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
}

// Response
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
  };
}

// Implementation
const login = async (email: string, password: string) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: API_CONFIG.HEADERS,
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  setAuthToken(data.accessToken);
  return data;
};
```

### Register Page (`/register`)

**Frontend Action**: User registration
**Backend Endpoint**: `POST /api/auth/register`

```typescript
interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  userId: string;
  message: string;
  requiresEmailVerification: boolean;
}

const register = async (data: RegisterRequest) => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: API_CONFIG.HEADERS,
    body: JSON.stringify(data),
  });
  return await response.json();
};
```

### Forgot Password Page (`/forgot-password`)

**Backend Endpoints**:

- `POST /api/auth/forgot-password` - Request reset
- `POST /api/auth/reset-password` - Reset with token

```typescript
const forgotPassword = async (email: string) => {
  await fetch(`${API_CONFIG.BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: API_CONFIG.HEADERS,
    body: JSON.stringify({ email }),
  });
};

const resetPassword = async (token: string, newPassword: string) => {
  await fetch(`${API_CONFIG.BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: API_CONFIG.HEADERS,
    body: JSON.stringify({ token, newPassword }),
  });
};
```

### Logout

**Backend Endpoint**: `POST /api/auth/logout`

```typescript
const logout = async () => {
  await fetch(`${API_CONFIG.BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: {
      ...API_CONFIG.HEADERS,
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });
  clearAuthToken();
};
```

### Refresh Token

**Backend Endpoint**: `POST /api/auth/refresh-token`

```typescript
const refreshToken = async (refreshToken: string) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/auth/refresh-token`,
    {
      method: "POST",
      headers: API_CONFIG.HEADERS,
      body: JSON.stringify({ refreshToken }),
    },
  );
  const data = await response.json();
  setAuthToken(data.accessToken);
  return data;
};
```

---

## 📊 Dashboard Page (`/dashboard`)

### Get Dashboard Metrics

**Backend Endpoints**:

- `GET /api/projects?status=active` - Active projects count
- `GET /api/endpoints` - Total endpoints
- `GET /api/test-runs/stats` - Test runs statistics

```typescript
interface DashboardMetrics {
  activeProjects: number;
  totalEndpoints: number;
  monthlyTestRuns: number;
  passRate: number;
}

const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const [projects, endpoints, stats] = await Promise.all([
    fetch(`${API_CONFIG.BASE_URL}/api/projects?status=active`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    }).then((r) => r.json()),

    fetch(`${API_CONFIG.BASE_URL}/api/endpoints`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    }).then((r) => r.json()),

    fetch(`${API_CONFIG.BASE_URL}/api/test-runs/stats`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    }).then((r) => r.json()),
  ]);

  return {
    activeProjects: projects.totalCount,
    totalEndpoints: endpoints.totalCount,
    monthlyTestRuns: stats.monthlyRuns,
    passRate: stats.passRate,
  };
};
```

### Get Recent Activity

**Backend Endpoint**: `GET /api/test-runs?pageSize=10&sortBy=createdAt&sortOrder=desc`

```typescript
interface ActivityItem {
  id: string;
  type: "test_run" | "test_failure" | "ai_suggestion" | "user_joined";
  message: string;
  timestamp: string;
}

const getRecentActivity = async (): Promise<ActivityItem[]> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-runs?pageSize=10&sortBy=createdAt&sortOrder=desc`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items.map((run) => ({
    id: run.id,
    type: run.status === "Failed" ? "test_failure" : "test_run",
    message: `Test Run #${run.id} ${run.status.toLowerCase()}`,
    timestamp: run.createdAt,
  }));
};
```

### Get Top API Collections

**Backend Endpoint**: `GET /api/endpoints?pageSize=10&sortBy=coverage&sortOrder=desc`

```typescript
interface TopEndpoint {
  path: string;
  method: string;
  status: string;
  latency: string;
  coverage: number;
}

const getTopEndpoints = async (): Promise<TopEndpoint[]> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/endpoints?pageSize=10&sortBy=coverage&sortOrder=desc`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

---

## 📁 Project Management Page (`/projects`)

### List Projects

**Backend Endpoint**: `GET /api/projects`

```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  specificationDocument: string;
  lastExecutionDate?: string;
  status: "active" | "archived";
  type: "REST" | "GraphQL" | "gRPC";
}

interface ProjectListResponse {
  items: Project[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

const getProjects = async (
  page: number = 1,
  pageSize: number = 10,
  search?: string,
): Promise<ProjectListResponse> => {
  const params = new URLSearchParams({
    pageNumber: page.toString(),
    pageSize: pageSize.toString(),
    ...(search && { search }),
  });

  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/projects?${params}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Create Project

**Backend Endpoint**: `POST /api/projects`

```typescript
interface CreateProjectRequest {
  name: string;
  description: string;
  type: "REST" | "GraphQL" | "gRPC";
}

const createProject = async (data: CreateProjectRequest): Promise<Project> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      ...API_CONFIG.HEADERS,
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });
  return await response.json();
};
```

### Get Project Detail

**Backend Endpoint**: `GET /api/projects/{id}`

```typescript
const getProjectDetail = async (projectId: string): Promise<Project> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/projects/${projectId}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Update Project

**Backend Endpoint**: `PUT /api/projects/{id}`

```typescript
const updateProject = async (
  projectId: string,
  data: Partial<CreateProjectRequest>,
): Promise<Project> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/projects/${projectId}`,
    {
      method: "PUT",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    },
  );
  return await response.json();
};
```

### Delete/Archive Project

**Backend Endpoint**: `DELETE /api/projects/{id}`

```typescript
const deleteProject = async (projectId: string): Promise<void> => {
  await fetch(`${API_CONFIG.BASE_URL}/api/projects/${projectId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
};
```

---

## 📄 API Specifications Page (`/specifications`)

### Upload API Specification

**Backend Endpoint**: `POST /api/projects/{id}/specifications`

```typescript
interface UploadSpecRequest {
  projectId: string;
  file: File;
  type: "OpenAPI" | "Swagger" | "Postman";
}

const uploadSpecification = async (data: UploadSpecRequest): Promise<any> => {
  const formData = new FormData();
  formData.append("file", data.file);
  formData.append("type", data.type);

  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/projects/${data.projectId}/specifications`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
        // Don't set Content-Type, browser will set it with boundary
      },
      body: formData,
    },
  );
  return await response.json();
};
```

### List Specifications

**Backend Endpoint**: `GET /api/projects/{id}/specifications`

```typescript
interface ApiSpecification {
  id: string;
  projectId: string;
  name: string;
  type: "OpenAPI" | "Swagger" | "Postman";
  version: string;
  parseStatus: "Success" | "Failed" | "Pending";
  status: "Active" | "Archived";
  uploadedAt: string;
  endpointCount: number;
}

const getSpecifications = async (
  projectId: string,
): Promise<ApiSpecification[]> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/projects/${projectId}/specifications`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

### Get Specification Detail

**Backend Endpoint**: `GET /api/specifications/{id}`

```typescript
const getSpecificationDetail = async (
  specId: string,
): Promise<ApiSpecification> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/specifications/${specId}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Delete Specification

**Backend Endpoint**: `DELETE /api/specifications/{id}`

```typescript
const deleteSpecification = async (specId: string): Promise<void> => {
  await fetch(`${API_CONFIG.BASE_URL}/api/specifications/${specId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
};
```

---

## 🌐 Endpoints Management Page (`/endpoints`)

### List Endpoints

**Backend Endpoint**: `GET /api/specifications/{id}/endpoints`

```typescript
interface Endpoint {
  id: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  description?: string;
  status: "active" | "deprecated" | "error";
  latency?: number;
  coverage?: number;
  specificationId: string;
}

const getEndpoints = async (
  specificationId: string,
  filters?: {
    method?: string;
    search?: string;
  },
): Promise<Endpoint[]> => {
  const params = new URLSearchParams();
  if (filters?.method && filters.method !== "ALL") {
    params.append("method", filters.method);
  }
  if (filters?.search) {
    params.append("search", filters.search);
  }

  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/specifications/${specificationId}/endpoints?${params}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

### Get Endpoint Detail

**Backend Endpoint**: `GET /api/endpoints/{id}`

```typescript
interface EndpointDetail extends Endpoint {
  parameters: EndpointParameter[];
  requestSchema?: any;
  responseSchema?: any;
  examples?: any[];
}

interface EndpointParameter {
  name: string;
  in: "path" | "query" | "header" | "body";
  type: string;
  required: boolean;
  description?: string;
}

const getEndpointDetail = async (
  endpointId: string,
): Promise<EndpointDetail> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/endpoints/${endpointId}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Create Endpoint Manually

**Backend Endpoint**: `POST /api/specifications/{id}/endpoints`

```typescript
interface CreateEndpointRequest {
  path: string;
  method: string;
  description?: string;
  parameters?: EndpointParameter[];
  requestSchema?: any;
  responseSchema?: any;
}

const createEndpoint = async (
  specificationId: string,
  data: CreateEndpointRequest,
): Promise<Endpoint> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/specifications/${specificationId}/endpoints`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    },
  );
  return await response.json();
};
```

### Update Endpoint

**Backend Endpoint**: `PUT /api/endpoints/{id}`

```typescript
const updateEndpoint = async (
  endpointId: string,
  data: Partial<CreateEndpointRequest>,
): Promise<Endpoint> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/endpoints/${endpointId}`,
    {
      method: "PUT",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    },
  );
  return await response.json();
};
```

### Delete Endpoint

**Backend Endpoint**: `DELETE /api/endpoints/{id}`

```typescript
const deleteEndpoint = async (endpointId: string): Promise<void> => {
  await fetch(`${API_CONFIG.BASE_URL}/api/endpoints/${endpointId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
};
```

### Sync Endpoints

**Backend Endpoint**: `POST /api/specifications/{id}/sync-endpoints`

```typescript
const syncEndpoints = async (specificationId: string): Promise<void> => {
  await fetch(
    `${API_CONFIG.BASE_URL}/api/specifications/${specificationId}/sync-endpoints`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
    },
  );
};
```

---

## 🧪 Test Suites Page (`/test-suites`)

### List Test Suites

**Backend Endpoint**: `GET /api/projects/{id}/test-suites`

```typescript
interface TestSuite {
  id: string;
  name: string;
  specificationId: string;
  generationType: "manual" | "llm-assisted" | "automated";
  endpointCount: number;
  status: "active" | "archived";
  lastRunDate?: string;
  lastRunStatus?: "Stable" | "Degraded";
}

const getTestSuites = async (projectId: string): Promise<TestSuite[]> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/projects/${projectId}/test-suites`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

### Get Test Suite Detail

**Backend Endpoint**: `GET /api/test-suites/{id}`

```typescript
interface TestSuiteDetail extends TestSuite {
  testCases: TestCase[];
  configuration?: any;
}

const getTestSuiteDetail = async (
  suiteId: string,
): Promise<TestSuiteDetail> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Create Test Suite

**Backend Endpoint**: `POST /api/projects/{id}/test-suites`

```typescript
interface CreateTestSuiteRequest {
  name: string;
  specificationId: string;
  environmentId?: string;
  endpointIds: string[];
}

const createTestSuite = async (
  projectId: string,
  data: CreateTestSuiteRequest,
): Promise<TestSuite> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/projects/${projectId}/test-suites`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    },
  );
  return await response.json();
};
```

### Generate Test Suite (AI)

**Backend Endpoint**: `POST /api/projects/{id}/test-suites/generate`

```typescript
interface GenerateTestSuiteRequest {
  name: string;
  specificationId: string;
  config: {
    includeHappyPath: boolean;
    includeNegative: boolean;
    includeBoundary: boolean;
    includeSecurity: boolean;
  };
}

const generateTestSuite = async (
  projectId: string,
  data: GenerateTestSuiteRequest,
): Promise<{ jobId: string }> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/projects/${projectId}/test-suites/generate`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    },
  );
  return await response.json();
};
```

### Update Test Suite

**Backend Endpoint**: `PUT /api/test-suites/{id}`

```typescript
const updateTestSuite = async (
  suiteId: string,
  data: Partial<CreateTestSuiteRequest>,
): Promise<TestSuite> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}`,
    {
      method: "PUT",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    },
  );
  return await response.json();
};
```

### Delete Test Suite

**Backend Endpoint**: `DELETE /api/test-suites/{id}`

```typescript
const deleteTestSuite = async (suiteId: string): Promise<void> => {
  await fetch(`${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
};
```

### Run Test Suite

**Backend Endpoint**: `POST /api/test-suites/{id}/execute`

```typescript
interface ExecuteTestSuiteRequest {
  environmentId: string;
}

interface ExecuteTestSuiteResponse {
  testRunId: string;
  status: "Running";
}

const executeTestSuite = async (
  suiteId: string,
  environmentId: string,
): Promise<ExecuteTestSuiteResponse> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/execute`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ environmentId }),
    },
  );
  return await response.json();
};
```

---

## 🚪 Test Execution Order Gate Page (`/order-gate`)

### Get Test Order Proposal

**Backend Endpoint**: `GET /api/test-suites/{id}/order-proposal`

```typescript
interface TestExecutionNode {
  id: string;
  label: string;
  method: string;
  url: string;
  stepNumber: number;
  type: "root" | "child" | "leaf";
}

interface TestExecutionEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface TestOrderProposal {
  nodes: TestExecutionNode[];
  edges: TestExecutionEdge[];
  reasoningNotes: string;
  complexity: "Low" | "Medium" | "High";
  totalSteps: number;
  parallelPaths: number;
}

const getTestOrderProposal = async (
  suiteId: string,
): Promise<TestOrderProposal> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/order-proposal`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Approve Test Order

**Backend Endpoint**: `POST /api/test-suites/{id}/order-proposal/approve`

```typescript
const approveTestOrder = async (suiteId: string): Promise<void> => {
  await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/order-proposal/approve`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
    },
  );
};
```

### Reject Test Order

**Backend Endpoint**: `POST /api/test-suites/{id}/order-proposal/reject`

```typescript
interface RejectTestOrderRequest {
  reason: string;
}

const rejectTestOrder = async (
  suiteId: string,
  reason: string,
): Promise<void> => {
  await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/order-proposal/reject`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ reason }),
    },
  );
};
```

### Regenerate Optimal Path

**Backend Endpoint**: `POST /api/test-suites/{id}/order-proposal/regenerate`

```typescript
const regenerateTestOrder = async (
  suiteId: string,
): Promise<TestOrderProposal> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/order-proposal/regenerate`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
    },
  );
  return await response.json();
};
```

### Save Custom Order

**Backend Endpoint**: `PUT /api/test-suites/{id}/order-proposal`

```typescript
interface SaveTestOrderRequest {
  nodes: TestExecutionNode[];
  edges: TestExecutionEdge[];
}

const saveTestOrder = async (
  suiteId: string,
  data: SaveTestOrderRequest,
): Promise<void> => {
  await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/order-proposal`,
    {
      method: "PUT",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    },
  );
};
```

---

## ✏️ Test Case Studio Page (`/studio`)

### List Test Cases

**Backend Endpoint**: `GET /api/test-suites/{id}/test-cases`

```typescript
interface TestCase {
  id: string;
  name: string;
  endpointId: string;
  request: TestCaseRequest;
  expectations: TestCaseExpectation[];
  order: number;
}

interface TestCaseRequest {
  method: string;
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
}

interface TestCaseExpectation {
  type: "status_code" | "response_body" | "response_time" | "header";
  operator:
    | "equals"
    | "contains"
    | "not_contains"
    | "less_than"
    | "greater_than";
  expected: any;
  actual?: any;
}

const getTestCases = async (suiteId: string): Promise<TestCase[]> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/test-cases`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

### Get Test Case Detail

**Backend Endpoint**: `GET /api/test-cases/{id}`

```typescript
const getTestCaseDetail = async (testCaseId: string): Promise<TestCase> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-cases/${testCaseId}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Create Test Case

**Backend Endpoint**: `POST /api/test-suites/{id}/test-cases`

```typescript
interface CreateTestCaseRequest {
  name: string;
  endpointId: string;
  request: TestCaseRequest;
  expectations: TestCaseExpectation[];
}

const createTestCase = async (
  suiteId: string,
  data: CreateTestCaseRequest,
): Promise<TestCase> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/test-cases`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    },
  );
  return await response.json();
};
```

### Update Test Case

**Backend Endpoint**: `PUT /api/test-cases/{id}`

```typescript
const updateTestCase = async (
  testCaseId: string,
  data: Partial<CreateTestCaseRequest>,
): Promise<TestCase> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-cases/${testCaseId}`,
    {
      method: "PUT",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    },
  );
  return await response.json();
};
```

### Delete Test Case

**Backend Endpoint**: `DELETE /api/test-cases/{id}`

```typescript
const deleteTestCase = async (testCaseId: string): Promise<void> => {
  await fetch(`${API_CONFIG.BASE_URL}/api/test-cases/${testCaseId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
};
```

### Run Single Test Case

**Backend Endpoint**: `POST /api/test-cases/{id}/execute`

```typescript
interface ExecuteTestCaseRequest {
  environmentId: string;
}

interface ExecuteTestCaseResponse {
  status: "Passed" | "Failed";
  actualResponse: {
    statusCode: number;
    headers: Record<string, string>;
    body: any;
    responseTime: number;
  };
  expectations: TestCaseExpectation[];
  failureReason?: string;
}

const executeTestCase = async (
  testCaseId: string,
  environmentId: string,
): Promise<ExecuteTestCaseResponse> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-cases/${testCaseId}/execute`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ environmentId }),
    },
  );
  return await response.json();
};
```

---

## ✨ LLM Suggestions Page (`/suggestions`)

### Get LLM Suggestions

**Backend Endpoint**: `GET /api/test-suites/{id}/llm-suggestions`

```typescript
interface LlmSuggestion {
  id: string;
  testSuiteId: string;
  title: string;
  description: string;
  impact: "High" | "Medium" | "Low";
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedTime: number; // minutes
  suggestedTestCase: TestCase;
  status: "Pending" | "Reviewed" | "Accepted" | "Rejected";
  createdAt: string;
}

const getLlmSuggestions = async (suiteId: string): Promise<LlmSuggestion[]> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/llm-suggestions`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

### Generate New Suggestions

**Backend Endpoint**: `POST /api/test-suites/{id}/llm-suggestions/generate`

```typescript
interface GenerateSuggestionsRequest {
  focusAreas?: ("boundary" | "negative" | "security" | "performance")[];
}

const generateSuggestions = async (
  suiteId: string,
  focusAreas?: string[],
): Promise<{ jobId: string }> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/llm-suggestions/generate`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ focusAreas }),
    },
  );
  return await response.json();
};
```

### Review Suggestion

**Backend Endpoint**: `POST /api/test-suites/{suiteId}/llm-suggestions/{id}/review`

```typescript
interface ReviewSuggestionRequest {
  action: "accept" | "reject";
  feedback?: string;
}

const reviewSuggestion = async (
  suiteId: string,
  suggestionId: string,
  action: "accept" | "reject",
  feedback?: string,
): Promise<void> => {
  await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/llm-suggestions/${suggestionId}/review`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ action, feedback }),
    },
  );
};
```

### Submit Feedback (👍👎)

**Backend Endpoint**: `POST /api/test-suites/{suiteId}/llm-suggestions/{id}/feedback`

```typescript
interface SubmitFeedbackRequest {
  rating: "positive" | "negative";
  comment?: string;
}

const submitFeedback = async (
  suiteId: string,
  suggestionId: string,
  rating: "positive" | "negative",
  comment?: string,
): Promise<void> => {
  await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/llm-suggestions/${suggestionId}/feedback`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ rating, comment }),
    },
  );
};
```

### Add Suggestion to Suite

**Backend Endpoint**: `POST /api/test-suites/{suiteId}/llm-suggestions/{id}/add-to-suite`

```typescript
const addSuggestionToSuite = async (
  suiteId: string,
  suggestionId: string,
): Promise<TestCase> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/llm-suggestions/${suggestionId}/add-to-suite`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
    },
  );
  return await response.json();
};
```

### Get Intelligence Score

**Backend Endpoint**: `GET /api/test-suites/{id}/intelligence-score`

```typescript
interface IntelligenceScore {
  overallScore: number;
  trend: number;
  identifiedGaps: number;
  timeSaved: number; // hours
}

const getIntelligenceScore = async (
  suiteId: string,
): Promise<IntelligenceScore> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/intelligence-score`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

---

## 🌍 Environments Page (`/environments`)

### List Environments

**Backend Endpoint**: `GET /api/projects/{id}/environments`

```typescript
interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  isDefault: boolean;
  authType: "bearer" | "api-key" | "oauth2" | "basic";
  status: "operational" | "degraded" | "down";
  region?: string;
  sslVerified: boolean;
  autoSync: boolean;
}

const getEnvironments = async (projectId: string): Promise<Environment[]> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/projects/${projectId}/environments`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

### Get Environment Detail

**Backend Endpoint**: `GET /api/environments/{id}`

```typescript
interface EnvironmentDetail extends Environment {
  variables: Record<string, string>;
  headers: Record<string, string>;
  authConfig?: {
    token?: string;
    apiKey?: string;
    username?: string;
    password?: string;
  };
}

const getEnvironmentDetail = async (
  envId: string,
): Promise<EnvironmentDetail> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/environments/${envId}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Create Environment

**Backend Endpoint**: `POST /api/projects/{id}/environments`

```typescript
interface CreateEnvironmentRequest {
  name: string;
  baseUrl: string;
  authType: "bearer" | "api-key" | "oauth2" | "basic";
  isDefault?: boolean;
  region?: string;
  variables?: Record<string, string>;
  headers?: Record<string, string>;
  authConfig?: {
    token?: string;
    apiKey?: string;
    username?: string;
    password?: string;
  };
}

const createEnvironment = async (
  projectId: string,
  data: CreateEnvironmentRequest,
): Promise<Environment> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/projects/${projectId}/environments`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    },
  );
  return await response.json();
};
```

### Update Environment

**Backend Endpoint**: `PUT /api/environments/{id}`

```typescript
const updateEnvironment = async (
  envId: string,
  data: Partial<CreateEnvironmentRequest>,
): Promise<Environment> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/environments/${envId}`,
    {
      method: "PUT",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    },
  );
  return await response.json();
};
```

### Delete Environment

**Backend Endpoint**: `DELETE /api/environments/{id}`

```typescript
const deleteEnvironment = async (envId: string): Promise<void> => {
  await fetch(`${API_CONFIG.BASE_URL}/api/environments/${envId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
};
```

### Test Environment Connection

**Backend Endpoint**: `POST /api/environments/{id}/test-connection`

```typescript
interface TestConnectionResponse {
  success: boolean;
  responseTime: number;
  message: string;
}

const testEnvironmentConnection = async (
  envId: string,
): Promise<TestConnectionResponse> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/environments/${envId}/test-connection`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
    },
  );
  return await response.json();
};
```

---

## 🏃 Test Execution Runs Page (`/runs`)

### List Test Runs

**Backend Endpoint**: `GET /api/test-suites/{id}/test-runs`

```typescript
interface TestRun {
  id: string;
  testSuiteId: string;
  testSuiteName: string;
  environmentId: string;
  environmentName: string;
  status: "Running" | "Passed" | "Failed" | "Warning";
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number; // seconds
  initiator: string; // User name or 'Autonomous Engine' or 'Scheduled Task'
  createdAt: string;
}

const getTestRuns = async (
  suiteId: string,
  filters?: {
    dateRange?: "last7" | "last30" | "custom";
    status?: string;
    search?: string;
  },
): Promise<TestRun[]> => {
  const params = new URLSearchParams();
  if (filters?.dateRange) params.append("dateRange", filters.dateRange);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.search) params.append("search", filters.search);

  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-suites/${suiteId}/test-runs?${params}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

### Get Test Run Detail

**Backend Endpoint**: `GET /api/test-runs/{id}`

```typescript
interface TestRunDetail extends TestRun {
  results: TestCaseResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
    avgResponseTime: number;
  };
}

interface TestCaseResult {
  testCaseId: string;
  testCaseName: string;
  status: "Passed" | "Failed" | "Skipped";
  duration: number;
  actualResponse?: any;
  expectations: TestCaseExpectation[];
  failureReason?: string;
}

const getTestRunDetail = async (runId: string): Promise<TestRunDetail> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-runs/${runId}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Get Test Run Results

**Backend Endpoint**: `GET /api/test-runs/{id}/results`

```typescript
const getTestRunResults = async (runId: string): Promise<TestCaseResult[]> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-runs/${runId}/results`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

### Retry Failed Tests

**Backend Endpoint**: `POST /api/test-runs/{id}/retry`

```typescript
const retryFailedTests = async (
  runId: string,
): Promise<{ newRunId: string }> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-runs/${runId}/retry`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
    },
  );
  return await response.json();
};
```

### Delete Test Run

**Backend Endpoint**: `DELETE /api/test-runs/{id}`

```typescript
const deleteTestRun = async (runId: string): Promise<void> => {
  await fetch(`${API_CONFIG.BASE_URL}/api/test-runs/${runId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
};
```

### Get Test Run Statistics

**Backend Endpoint**: `GET /api/test-runs/stats`

```typescript
interface TestRunStats {
  totalRuns: number;
  successRate: number;
  failures: number;
  avgDuration: number;
  monthlyRuns: number;
}

const getTestRunStats = async (): Promise<TestRunStats> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/api/test-runs/stats`, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  return await response.json();
};
```

### Download Audit Log

**Backend Endpoint**: `GET /api/test-runs/{id}/audit-log`

```typescript
const downloadAuditLog = async (runId: string): Promise<Blob> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-runs/${runId}/audit-log`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.blob();
};
```

---

## 🔍 Failure Explanation Page (`/failure-explanation`)

### Explain Test Failure

**Backend Endpoint**: `POST /api/test-runs/{runId}/failures/{testId}/explain`

```typescript
interface ExplainFailureRequest {
  testCaseId: string;
  actualResponse: any;
  expectedResponse: any;
}

interface FailureExplanation {
  id: string;
  testRunId: string;
  testCaseId: string;
  rootCause: string;
  expectedBehavior: string;
  actualBehavior: string;
  suggestedFix: string;
  impactAnalysis: {
    riskLevel: "Critical" | "High" | "Medium" | "Low";
    affectedUsers: number;
    businessImpact: string;
  };
  similarFailures: SimilarFailure[];
  createdAt: string;
}

interface SimilarFailure {
  testRunId: string;
  testCaseName: string;
  matchPercentage: number;
  occurredAt: string;
}

const explainFailure = async (
  runId: string,
  testId: string,
): Promise<FailureExplanation> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-runs/${runId}/failures/${testId}/explain`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
    },
  );
  return await response.json();
};
```

### Get Failure Explanation

**Backend Endpoint**: `GET /api/test-runs/{runId}/failures/{testId}/explanation`

```typescript
const getFailureExplanation = async (
  runId: string,
  testId: string,
): Promise<FailureExplanation> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-runs/${runId}/failures/${testId}/explanation`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Re-Analyze Failure

**Backend Endpoint**: `POST /api/test-runs/{runId}/failures/{testId}/re-analyze`

```typescript
const reAnalyzeFailure = async (
  runId: string,
  testId: string,
): Promise<FailureExplanation> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-runs/${runId}/failures/${testId}/re-analyze`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
    },
  );
  return await response.json();
};
```

### Generate Fix PR

**Backend Endpoint**: `POST /api/test-runs/{runId}/failures/{testId}/generate-fix-pr`

```typescript
interface GenerateFixPRRequest {
  repositoryUrl: string;
  branch: string;
}

interface GenerateFixPRResponse {
  prUrl: string;
  prNumber: number;
  changes: string[];
}

const generateFixPR = async (
  runId: string,
  testId: string,
  data: GenerateFixPRRequest,
): Promise<GenerateFixPRResponse> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-runs/${runId}/failures/${testId}/generate-fix-pr`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(data),
    },
  );
  return await response.json();
};
```

### Apply Suggested Fix

**Backend Endpoint**: `POST /api/test-cases/{id}/apply-fix`

```typescript
interface ApplyFixRequest {
  suggestedFix: string;
}

const applySuggestedFix = async (
  testCaseId: string,
  suggestedFix: string,
): Promise<TestCase> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-cases/${testCaseId}/apply-fix`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ suggestedFix }),
    },
  );
  return await response.json();
};
```

---

## 📈 Reports Page (`/reports`)

### Generate Report

**Backend Endpoint**: `POST /api/test-runs/{id}/reports/generate`

```typescript
interface GenerateReportRequest {
  format: "JSON" | "HTML" | "PDF";
  includeDetails: boolean;
}

interface GenerateReportResponse {
  reportId: string;
  status: "Generating" | "Completed";
}

const generateReport = async (
  runId: string,
  format: "JSON" | "HTML" | "PDF",
): Promise<GenerateReportResponse> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-runs/${runId}/reports/generate`,
    {
      method: "POST",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ format, includeDetails: true }),
    },
  );
  return await response.json();
};
```

### List Reports

**Backend Endpoint**: `GET /api/test-runs/{id}/reports`

```typescript
interface TestReport {
  id: string;
  testRunId: string;
  format: "JSON" | "HTML" | "PDF";
  status: "Generating" | "Completed" | "Failed";
  fileSize: number;
  createdAt: string;
}

const getReports = async (runId: string): Promise<TestReport[]> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/test-runs/${runId}/reports`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

### Get Report Detail

**Backend Endpoint**: `GET /api/reports/{id}`

```typescript
const getReportDetail = async (reportId: string): Promise<TestReport> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/reports/${reportId}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Download Report

**Backend Endpoint**: `GET /api/reports/{id}/download`

```typescript
const downloadReport = async (reportId: string): Promise<Blob> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/reports/${reportId}/download`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.blob();
};
```

### Delete Report

**Backend Endpoint**: `DELETE /api/reports/{id}`

```typescript
const deleteReport = async (reportId: string): Promise<void> => {
  await fetch(`${API_CONFIG.BASE_URL}/api/reports/${reportId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
};
```

### Get Analytics Metrics

**Backend Endpoint**: `GET /api/reports/analytics`

```typescript
interface AnalyticsMetrics {
  passRate: number;
  passRateTrend: number;
  avgResponseTime: number;
  responseTimeTrend: number;
  testCoverage: number;
  coverageTrend: number;
  totalExecutions: number;
  executionsTrend: number;
}

const getAnalyticsMetrics = async (
  dateRange: "last7" | "last30" | "last90" = "last30",
): Promise<AnalyticsMetrics> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/reports/analytics?dateRange=${dateRange}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Get Reliability Trend

**Backend Endpoint**: `GET /api/reports/reliability-trend`

```typescript
interface ReliabilityTrendData {
  date: string;
  productionPassRate: number;
  stagingPassRate: number;
}

const getReliabilityTrend = async (
  days: number = 15,
): Promise<ReliabilityTrendData[]> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/reports/reliability-trend?days=${days}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

### Get Failure Distribution

**Backend Endpoint**: `GET /api/reports/failure-distribution`

```typescript
interface FailureDistribution {
  category: string;
  count: number;
  percentage: number;
}

const getFailureDistribution = async (): Promise<FailureDistribution[]> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/reports/failure-distribution`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

### Get Top Performing Suites

**Backend Endpoint**: `GET /api/reports/top-performing-suites`

```typescript
interface TopPerformingSuite {
  suiteId: string;
  suiteName: string;
  reliabilityScore: number;
  executionCount: number;
}

const getTopPerformingSuites = async (
  limit: number = 3,
): Promise<TopPerformingSuite[]> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/reports/top-performing-suites?limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

---

## ⚙️ Settings Page (`/settings`)

### Get User Profile

**Backend Endpoint**: `GET /api/users/{id}`

```typescript
interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  createdAt: string;
}

const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${userId}`, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  return await response.json();
};
```

### Update User Profile

**Backend Endpoint**: `PUT /api/users/{id}`

```typescript
interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
}

const updateUserProfile = async (
  userId: string,
  data: UpdateProfileRequest,
): Promise<UserProfile> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${userId}`, {
    method: "PUT",
    headers: {
      ...API_CONFIG.HEADERS,
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });
  return await response.json();
};
```

### Change Password

**Backend Endpoint**: `POST /api/users/{id}/change-password`

```typescript
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

const changePassword = async (
  userId: string,
  data: ChangePasswordRequest,
): Promise<void> => {
  await fetch(`${API_CONFIG.BASE_URL}/api/users/${userId}/change-password`, {
    method: "POST",
    headers: {
      ...API_CONFIG.HEADERS,
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });
};
```

### Get Notification Preferences

**Backend Endpoint**: `GET /api/users/{id}/notification-preferences`

```typescript
interface NotificationPreferences {
  criticalAlerts: boolean;
  weeklyReports: boolean;
  securityNotifications: boolean;
  productUpdates: boolean;
}

const getNotificationPreferences = async (
  userId: string,
): Promise<NotificationPreferences> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/users/${userId}/notification-preferences`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.json();
};
```

### Update Notification Preferences

**Backend Endpoint**: `PUT /api/users/{id}/notification-preferences`

```typescript
const updateNotificationPreferences = async (
  userId: string,
  preferences: NotificationPreferences,
): Promise<void> => {
  await fetch(
    `${API_CONFIG.BASE_URL}/api/users/${userId}/notification-preferences`,
    {
      method: "PUT",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(preferences),
    },
  );
};
```

---

## 🔔 Notifications

### Get Notifications

**Backend Endpoint**: `GET /api/notifications`

```typescript
interface Notification {
  id: string;
  type: "test_completed" | "test_failed" | "suggestion_ready" | "system_alert";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

const getNotifications = async (
  unreadOnly: boolean = false,
): Promise<Notification[]> => {
  const params = new URLSearchParams();
  if (unreadOnly) params.append("unreadOnly", "true");

  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/notifications?${params}`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  const data = await response.json();
  return data.items;
};
```

### Mark Notification as Read

**Backend Endpoint**: `PUT /api/notifications/{id}/read`

```typescript
const markNotificationAsRead = async (
  notificationId: string,
): Promise<void> => {
  await fetch(
    `${API_CONFIG.BASE_URL}/api/notifications/${notificationId}/read`,
    {
      method: "PUT",
      headers: {
        ...API_CONFIG.HEADERS,
        Authorization: `Bearer ${getAuthToken()}`,
      },
    },
  );
};
```

### Delete Notification

**Backend Endpoint**: `DELETE /api/notifications/{id}`

```typescript
const deleteNotification = async (notificationId: string): Promise<void> => {
  await fetch(`${API_CONFIG.BASE_URL}/api/notifications/${notificationId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
};
```

---

## 📁 File Storage

### Upload File

**Backend Endpoint**: `POST /api/storage/upload`

```typescript
interface UploadFileRequest {
  file: File;
  category: "specification" | "report" | "attachment";
}

interface UploadFileResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  url: string;
}

const uploadFile = async (
  file: File,
  category: string,
): Promise<UploadFileResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  const response = await fetch(`${API_CONFIG.BASE_URL}/api/storage/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: formData,
  });
  return await response.json();
};
```

### Get File Metadata

**Backend Endpoint**: `GET /api/storage/{id}`

```typescript
interface FileMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  category: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

const getFileMetadata = async (fileId: string): Promise<FileMetadata> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/api/storage/${fileId}`, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  return await response.json();
};
```

### Download File

**Backend Endpoint**: `GET /api/storage/{id}/download`

```typescript
const downloadFile = async (fileId: string): Promise<Blob> => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/api/storage/${fileId}/download`,
    {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    },
  );
  return await response.blob();
};
```

### Delete File

**Backend Endpoint**: `DELETE /api/storage/{id}`

```typescript
const deleteFile = async (fileId: string): Promise<void> => {
  await fetch(`${API_CONFIG.BASE_URL}/api/storage/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
};
```

---

## 🛠️ Utility Services

### Create API Service Class

```typescript
// src/services/apiService.ts
import { API_CONFIG, getAuthToken } from "../config/api";

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getAuthToken();

    const config: RequestInit = {
      ...options,
      headers: {
        ...API_CONFIG.HEADERS,
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "API request failed");
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getAuthToken();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "File upload failed");
    }

    return await response.json();
  }

  async downloadFile(endpoint: string): Promise<Blob> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getAuthToken();

    const response = await fetch(url, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error("File download failed");
    }

    return await response.blob();
  }
}

export const apiService = new ApiService();
```

### Error Handling

```typescript
// src/utils/errorHandler.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const handleApiError = (error: any) => {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 401:
        // Redirect to login
        window.location.href = "/login";
        break;
      case 403:
        // Show forbidden message
        console.error("Access forbidden");
        break;
      case 404:
        // Show not found message
        console.error("Resource not found");
        break;
      case 500:
        // Show server error message
        console.error("Server error");
        break;
      default:
        console.error(error.message);
    }
  } else {
    console.error("Unexpected error:", error);
  }
};
```

### Axios Alternative (Optional)

```typescript
// src/services/axiosService.ts
import axios, { AxiosInstance } from "axios";
import { API_CONFIG, getAuthToken, clearAuthToken } from "../config/api";

class AxiosService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: API_CONFIG.HEADERS,
    });

    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          clearAuthToken();
          window.location.href = "/login";
        }
        return Promise.reject(error);
      },
    );
  }

  getInstance(): AxiosInstance {
    return this.instance;
  }
}

export const axiosService = new AxiosService().getInstance();
```

---

## 🔄 Real-time Updates (SignalR)

### SignalR Connection Setup

```typescript
// src/services/signalrService.ts
import * as signalR from "@microsoft/signalr";
import { getAuthToken } from "../config/api";

class SignalRService {
  private connection: signalR.HubConnection | null = null;

  async connect() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_CONFIG.BASE_URL}/hubs/notifications`, {
        accessTokenFactory: () => getAuthToken() || "",
      })
      .withAutomaticReconnect()
      .build();

    try {
      await this.connection.start();
      console.log("SignalR Connected");
      this.setupListeners();
    } catch (error) {
      console.error("SignalR Connection Error:", error);
    }
  }

  private setupListeners() {
    if (!this.connection) return;

    // Test run status updates
    this.connection.on("TestRunStatusChanged", (data) => {
      console.log("Test Run Status:", data);
      // Update UI
    });

    // Test case completed
    this.connection.on("TestCaseCompleted", (data) => {
      console.log("Test Case Completed:", data);
      // Update UI
    });

    // New notification
    this.connection.on("NewNotification", (data) => {
      console.log("New Notification:", data);
      // Show toast notification
    });
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.stop();
      console.log("SignalR Disconnected");
    }
  }

  // Subscribe to test run updates
  async subscribeToTestRun(testRunId: string) {
    if (this.connection) {
      await this.connection.invoke("SubscribeToTestRun", testRunId);
    }
  }

  // Unsubscribe from test run updates
  async unsubscribeFromTestRun(testRunId: string) {
    if (this.connection) {
      await this.connection.invoke("UnsubscribeFromTestRun", testRunId);
    }
  }
}

export const signalRService = new SignalRService();
```

### Usage in Components

```typescript
// Example: TestRunDetail.tsx
import { useEffect, useState } from 'react';
import { signalRService } from '../services/signalrService';

function TestRunDetail({ runId }: { runId: string }) {
  const [status, setStatus] = useState('Running');

  useEffect(() => {
    // Connect to SignalR
    signalRService.connect();

    // Subscribe to this test run
    signalRService.subscribeToTestRun(runId);

    // Cleanup
    return () => {
      signalRService.unsubscribeFromTestRun(runId);
    };
  }, [runId]);

  return (
    <div>
      <h1>Test Run Status: {status}</h1>
    </div>
  );
}
```

---

## 📝 Implementation Checklist

### Phase 1: Core Setup ✅

- [ ] Create API configuration file
- [ ] Implement authentication service
- [ ] Create API service class
- [ ] Setup error handling
- [ ] Configure environment variables

### Phase 2: Authentication 🔐

- [ ] Implement login page
- [ ] Implement register page
- [ ] Implement forgot password flow
- [ ] Setup token management
- [ ] Add refresh token logic
- [ ] Create protected route wrapper

### Phase 3: Core Features 📊

- [ ] Dashboard API integration
- [ ] Projects CRUD operations
- [ ] API Specifications upload
- [ ] Endpoints management
- [ ] Test Suites CRUD
- [ ] Test Cases CRUD

### Phase 4: Advanced Features 🚀

- [ ] Test Execution Order Gate
- [ ] LLM Suggestions integration
- [ ] Test execution & monitoring
- [ ] Failure explanation
- [ ] Reports & analytics
- [ ] Environments management

### Phase 5: Real-time & Polish ✨

- [ ] SignalR integration
- [ ] Real-time test execution updates
- [ ] Notifications system
- [ ] File upload/download
- [ ] Settings page
- [ ] Error boundaries

### Phase 6: Testing & Optimization 🧪

- [ ] Unit tests for services
- [ ] Integration tests
- [ ] E2E tests for critical flows
- [ ] Performance optimization
- [ ] Bundle size optimization
- [ ] Accessibility audit

---

## 🎯 Quick Start Guide

### 1. Install Dependencies

```bash
cd FE/llm-api-test-generator
npm install axios @microsoft/signalr
```

### 2. Create Environment File

```env
# .env
VITE_API_BASE_URL=http://localhost:5000
VITE_SIGNALR_HUB_URL=http://localhost:5000/hubs/notifications
```

### 3. Create API Config

```typescript
// src/config/api.ts
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL,
  TIMEOUT: 30000,
  HEADERS: {
    "Content-Type": "application/json",
  },
};
```

### 4. Create Services

- `src/services/apiService.ts` - Base API service
- `src/services/authService.ts` - Authentication
- `src/services/projectService.ts` - Projects
- `src/services/testSuiteService.ts` - Test Suites
- `src/services/signalrService.ts` - Real-time updates

### 5. Update Components

Replace mock data with actual API calls in all page components.

---

## 📚 Additional Resources

- [Backend API Documentation](../../../BE/GSP26SE43.ModularMonolith/docs/BACKEND_FEATURES_DOCUMENTATION.md)
- [Frontend Features Documentation](./FRONTEND_FEATURES_DOCUMENTATION.md)
- [Frontend Comparison](../../FRONTEND_COMPARISON.md)

---

**Created**: March 27, 2026  
**Last Updated**: March 27, 2026  
**Version**: 1.0.0  
**Status**: Ready for Implementation ✅
