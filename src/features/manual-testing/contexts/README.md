# Manual Testing Contexts

This directory contains React Context implementations for the Manual Testing Tab feature.

## ManualTestingContext

The `ManualTestingContext` manages the core state for manual API testing, including request configuration, response data, and execution state.

### Provider

```tsx
import { ManualTestingProvider } from "./contexts";

function App() {
  return <ManualTestingProvider>{/* Your components */}</ManualTestingProvider>;
}
```

### Hooks

#### useManualTesting

The main hook that provides access to all context values and methods.

```tsx
import { useManualTesting } from "./contexts";

function MyComponent() {
  const {
    requestConfig,
    responseData,
    isLoading,
    error,
    setRequestConfig,
    updateRequestConfig,
    setResponseData,
    setLoading,
    setError,
    resetRequest,
  } = useManualTesting();

  // Use the context values and methods
}
```

#### useRequestConfig

A specialized hook for managing request configuration.

```tsx
import { useRequestConfig } from "./contexts";

function RequestBuilder() {
  const { requestConfig, setRequestConfig, updateRequestConfig, resetRequest } =
    useRequestConfig();

  // Update method
  updateRequestConfig({ method: "POST" });

  // Update URL
  updateRequestConfig({ url: "https://api.example.com" });
}
```

#### useResponseData

A specialized hook for managing response data and execution state.

```tsx
import { useResponseData } from "./contexts";

function ResponseViewer() {
  const {
    responseData,
    isLoading,
    error,
    setResponseData,
    setLoading,
    setError,
  } = useResponseData();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!responseData) return <div>No response yet</div>;

  return <div>Status: {responseData.status}</div>;
}
```

## State Management

The context manages the following state:

- **requestConfig**: The current HTTP request configuration (method, URL, headers, body, auth, etc.)
- **responseData**: The response from the last executed request (status, headers, body, timing, etc.)
- **isLoading**: Boolean indicating if a request is currently executing
- **error**: Any error that occurred during request execution

## Methods

- **setRequestConfig**: Replace the entire request configuration
- **updateRequestConfig**: Partially update the request configuration
- **setResponseData**: Set the response data from an executed request
- **setLoading**: Update the loading state
- **setError**: Set an error state
- **resetRequest**: Reset the request configuration to default values and clear response/error

## Requirements Satisfied

This implementation satisfies the following requirements:

- **2.1**: Request configuration management
- **2.2**: Response data management
- **2.3**: Execution state management (loading, error)
- **8.1**: Support for request execution state
- **8.2**: Support for response data storage
