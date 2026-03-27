# Create Test Suite from Endpoints - Implementation

## Overview

Implemented the ability to create test suites from selected endpoints in the Endpoints page. The system now allows users to select multiple endpoints and create a test suite that will automatically generate test cases using LLM.

## Changes Made

### 1. Updated `testSuiteService.ts`

#### Updated `CreateTestSuiteRequest` Interface

Changed from:

```typescript
export interface CreateTestSuiteRequest {
  name: string;
  specificationId: string;
  environmentId?: string;
  endpointIds: string[];
}
```

To match Backend's `CreateTestSuiteScopeRequest`:

```typescript
export interface CreateTestSuiteRequest {
  name: string;
  description?: string;
  apiSpecId: string;
  generationType?: "Auto" | "Manual";
  selectedEndpointIds: string[];
  endpointBusinessContexts?: Record<string, string>;
  globalBusinessRules?: string;
}
```

#### Updated `createTestSuite` Method

- Added PascalCase field mapping to match Backend expectations
- Maps frontend camelCase to Backend PascalCase:
  - `name` → `Name`
  - `description` → `Description`
  - `apiSpecId` → `ApiSpecId`
  - `generationType` → `GenerationType`
  - `selectedEndpointIds` → `SelectedEndpointIds`
  - `endpointBusinessContexts` → `EndpointBusinessContexts`
  - `globalBusinessRules` → `GlobalBusinessRules`

### 2. Updated `EndpointsPage.tsx`

#### Implemented `handleCreateTestSuite` Function

- Validates suite name and selected endpoints
- Validates that a specification is selected
- Calls `testSuiteService.createTestSuite()` with proper payload
- Shows success toast with message about automatic LLM test generation
- Clears form and selected endpoints
- Navigates to Test Suites page after successful creation

## Backend API Endpoint

```
POST /api/projects/{projectId}/test-suites
```

### Request Body (PascalCase)

```json
{
  "Name": "Products API Test Suite",
  "Description": "Test suite for products endpoints",
  "ApiSpecId": "9af0928c-8727-4b28-b616-f01e9ed79ad9",
  "GenerationType": "Auto",
  "SelectedEndpointIds": [
    "3435ec81-769d-49d1-b303-996e1f384189",
    "7f8e9d2c-4b5a-6c7d-8e9f-0a1b2c3d4e5f"
  ],
  "EndpointBusinessContexts": {},
  "GlobalBusinessRules": ""
}
```

### Response

```json
{
  "id": "suite-id",
  "name": "Products API Test Suite",
  "description": "Test suite for products endpoints",
  ...
}
```

## User Flow

1. User navigates to Endpoints page
2. User selects specification from dropdown
3. User checks checkboxes to select endpoints
4. "Create Test Suite" button appears showing count of selected endpoints
5. User clicks "Create Test Suite" button
6. Modal opens with:
   - Suite Name field (required)
   - Description field (optional)
   - Count of selected endpoints
   - Note about automatic LLM test generation
7. User fills in suite name and clicks "Create Suite"
8. System creates test suite via API
9. Success toast shows: "Test suite created with X endpoints. LLM will generate test cases automatically."
10. User is automatically navigated to Test Suites page

## Features

- ✅ Select individual endpoints via checkbox
- ✅ Select all endpoints at once
- ✅ Show count of selected endpoints in button
- ✅ Validation for required fields
- ✅ Validation for specification selection
- ✅ PascalCase field mapping for Backend compatibility
- ✅ Success/error toast notifications
- ✅ Auto-navigation to Test Suites page
- ✅ Loading state during API call
- ✅ Clear form after successful creation

## Backend Processing

After test suite creation, the Backend will:

1. Save test suite to database
2. Publish `TestSuiteCreated` domain event
3. Background worker picks up event
4. Calls n8n workflow to generate test cases using LLM
5. LLM generates test cases for each endpoint
6. Test cases saved to database
7. User can view and execute test suite

## Related Files

- `FE/llm-api-test-generator/src/services/testSuiteService.ts`
- `FE/llm-api-test-generator/src/pages/EndpointsPage.tsx`
- `BE/GSP26SE43.ModularMonolith/ClassifiedAds.Modules.TestGeneration/Controllers/TestSuitesController.cs`
- `BE/GSP26SE43.ModularMonolith/ClassifiedAds.Modules.TestGeneration/Models/Requests/CreateTestSuiteScopeRequest.cs`

## Next Steps

1. Implement Test Suites page to display created test suites
2. Show test generation progress/status
3. Allow viewing generated test cases
4. Implement test suite execution
5. Add ability to edit endpoint business contexts
6. Add ability to set global business rules

---

**Status**: ✅ Complete
**Date**: 2026-03-27
