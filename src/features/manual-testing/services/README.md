# Manual Testing Services

This directory contains service layer implementations for the Manual Testing Tab feature.

## HttpClientService

The `HttpClientService` is responsible for executing HTTP requests and returning structured response data.

### Features

- **Request Execution**: Executes HTTP requests using Axios with full support for all HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD)
- **Timeout Configuration**: Configurable request timeout (default: 30 seconds)
- **Request Cancellation**: Support for cancelling ongoing requests
- **Response Parsing**: Structures response data including status, headers, body, cookies, and timing information
- **Authentication**: Automatic header injection for Bearer, Basic, and API Key authentication
- **Error Handling**: User-friendly error messages for network errors, timeouts, and CORS issues

### Usage

```typescript
import { httpClientService } from "./services";
import type { RequestConfig } from "./types";

const config: RequestConfig = {
  method: "GET",
  url: "https://api.example.com/users",
  params: [{ id: "1", key: "page", value: "1", enabled: true }],
  headers: [
    { id: "2", key: "Accept", value: "application/json", enabled: true },
  ],
  body: { type: "none", content: "" },
  auth: {
    type: "bearer",
    bearer: { token: "your-token-here" },
  },
  timeout: 5000,
};

try {
  const response = await httpClientService.executeRequest(config);
  console.log("Status:", response.status);
  console.log("Time:", response.time, "ms");
  console.log("Body:", response.body);
} catch (error) {
  console.error("Request failed:", error.message);
}
```

### Request Cancellation

```typescript
const config: RequestConfig = {
  id: "my-request-123",
  method: "GET",
  url: "https://api.example.com/slow-endpoint",
  // ... other config
};

// Start the request
httpClientService.executeRequest(config);

// Cancel it if needed
httpClientService.cancelRequest("my-request-123");
```

### Response Structure

The service returns a `ResponseData` object with the following structure:

```typescript
interface ResponseData {
  status: number; // HTTP status code (e.g., 200, 404)
  statusText: string; // Status text (e.g., "OK", "Not Found")
  headers: Record<string, string>; // Response headers
  body: string; // Response body as string
  contentType: string; // Content-Type header value
  size: number; // Response size in bytes
  time: number; // Response time in milliseconds
  cookies: Cookie[]; // Parsed cookies from Set-Cookie headers
  timestamp: Date; // When the response was received
}
```

### Error Handling

The service provides detailed error information:

- **Network Errors**: Connection failures, DNS issues
- **Timeout Errors**: Request exceeded configured timeout
- **CORS Errors**: Cross-origin request blocked by browser
- **HTTP Errors**: Non-2xx status codes with full response data
- **Cancellation**: User-initiated request cancellation

All errors include appropriate metadata for debugging and user feedback.

### Testing

Comprehensive unit tests are available in `HttpClientService.test.ts`, covering:

- Successful request execution
- Query parameter handling
- Header management
- Request body formatting (JSON, XML, Form, Raw)
- Authentication (Bearer, Basic, API Key)
- Timeout configuration
- Cookie parsing
- Error handling scenarios
- Request cancellation

Run tests with:

```bash
npm test -- HttpClientService.test.ts
```
