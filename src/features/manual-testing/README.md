# Manual Testing Feature

This directory contains the Manual Testing Tab feature - a Postman-like API testing interface integrated into the application.

## Directory Structure

```
manual-testing/
├── types/           # TypeScript type definitions
│   └── index.ts     # Core types (RequestConfig, ResponseData, Environment, Collection, etc.)
├── components/      # React components (to be implemented)
├── contexts/        # React contexts for state management (to be implemented)
├── services/        # Business logic and API services (to be implemented)
├── hooks/           # Custom React hooks (to be implemented)
├── utils/           # Utility functions (to be implemented)
└── index.ts         # Barrel export
```

## Core Types

The feature defines the following core types:

- **RequestConfig**: HTTP request configuration (method, URL, headers, body, auth)
- **ResponseData**: HTTP response data (status, headers, body, cookies, timing)
- **Environment**: Named set of variables for request configuration
- **Collection**: Saved group of related HTTP requests
- **RequestHistoryEntry**: Historical record of executed requests

## Route Configuration

The feature is accessible at `/manual-testing` and is protected by authentication.

## Requirements

This feature implements Requirements 1.1 and 1.2 from the specification:

- Manual Testing Tab appears in sidebar navigation
- Application navigates to manual testing interface when clicked
