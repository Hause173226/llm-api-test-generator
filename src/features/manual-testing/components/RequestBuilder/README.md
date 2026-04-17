# RequestBuilder Components

This directory contains the components that make up the RequestBuilder interface for the Manual Testing Tab feature.

## Components

### RequestLine

The top bar of the RequestBuilder that provides the primary interface for configuring and sending HTTP requests.

**Features:**

- HTTP method dropdown selector (GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD)
- URL input field with support for variable syntax ({{variable}})
- Send button with loading state
- Keyboard shortcut support (Ctrl+Enter / Cmd+Enter to send)
- Automatic disabling when URL is empty or request is in progress

**Props:**

```typescript
interface RequestLineProps {
  onSend: () => void; // Callback when Send button is clicked
  isLoading: boolean; // Whether a request is currently executing
}
```

**Usage:**

```tsx
import { RequestLine } from "./RequestBuilder";

function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    setIsLoading(true);
    try {
      // Execute request
    } finally {
      setIsLoading(false);
    }
  };

  return <RequestLine onSend={handleSend} isLoading={isLoading} />;
}
```

**Requirements Satisfied:**

- 2.1: HTTP method dropdown selector
- 2.2: Support for all standard HTTP methods
- 2.3: Method selection updates request configuration
- 3.1: URL input field
- 8.1: Send button to execute requests
- 8.3: Loading indicator during request execution

**Integration:**

- Uses `useRequestConfig` hook from ManualTestingContext for state management
- Uses `useTranslation` hook for internationalization
- Integrates with Lucide React for icons

## Future Components

The following components will be added to this directory as part of the implementation plan:

- **ParamsTab**: Query parameter configuration (Task 6.3)
- **HeadersTab**: HTTP headers configuration (Task 6.4)
- **BodyTab**: Request body configuration (Task 6.5)
- **AuthTab**: Authentication configuration (Task 6.6)
- **RequestActions**: Save, Share, and Generate Test buttons (Task 6.7)

## Testing

All components in this directory have corresponding test files with the `.test.tsx` extension. Tests use:

- Vitest as the test runner
- React Testing Library for component testing
- Mock implementations for external dependencies

Run tests with:

```bash
npm test RequestLine.test.tsx
```
