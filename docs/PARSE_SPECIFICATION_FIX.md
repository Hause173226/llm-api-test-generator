# Parse Specification Fix

## Issue

Frontend was calling a non-existent parse endpoint: `POST /api/projects/{projectId}/specifications/{specId}/parse`

When users clicked the "PARSE" button, they received a 404 error.

## Root Cause

The Backend does NOT have a manual parse endpoint. Parsing happens automatically via background jobs:

1. User uploads specification → `SpecUploaded` event is created
2. OutBox publisher picks up the event → triggers `ParseUploadedSpecificationCommand`
3. Parse happens automatically in the background
4. `parseStatus` field is updated: `Pending` → `Success` or `Failed`

## Solution

### Backend Architecture

- **Automatic Parsing**: Specifications are parsed automatically after upload via OutBox pattern
- **Parse Status Enum**:
  - `Pending` (0): Waiting to be parsed
  - `Success` (1): Successfully parsed
  - `Failed` (2): Parse failed
- **No Manual Trigger**: There is no HTTP endpoint to manually trigger parsing

### Frontend Changes

#### 1. Updated `specificationService.ts`

- Removed `parseSpecification()` method
- Added `parseStatus` and `parsedAt` fields to `Specification` interface
- Added comment explaining automatic parsing

#### 2. Updated `useSpecifications.ts` hook

- Removed `parseSpecification` function
- Removed from return object

#### 3. Updated `SpecificationPage.tsx`

- Removed "Parse" button
- Removed `handleParse()` function
- Added `getParseStatusBadge()` function to display status
- Now shows parse status badges:
  - **Success**: Green badge with checkmark
  - **Pending**: Amber badge with spinner animation
  - **Failed**: Red badge with error indicator

#### 4. Updated `ProjectDetailedViewPage.tsx`

- Changed "Parse Specification" button text to "View Specifications"
- Updated message: "Specification is Being Parsed" instead of "No Endpoints Yet"
- Clarified that parsing happens automatically

## User Experience

### Before

1. User uploads specification
2. User sees "Parse" button
3. User clicks "Parse" → 404 error ❌

### After

1. User uploads specification
2. Parse status shows "Parsing..." with spinner
3. After a few moments, status changes to "Success" ✅
4. Endpoints are automatically extracted
5. User can create test suites

## Technical Details

### Backend Files

- `ClassifiedAds.Modules.ApiDocumentation/Controllers/SpecificationsController.cs` - No parse endpoint
- `ClassifiedAds.Modules.ApiDocumentation/Commands/ParseUploadedSpecificationCommand.cs` - Parse logic
- `ClassifiedAds.Modules.ApiDocumentation/OutBoxEventPublishers/SpecOutBoxMessagePublisher.cs` - Triggers parse
- `ClassifiedAds.Modules.ApiDocumentation/Entities/ApiSpecification.cs` - ParseStatus enum

### Frontend Files Changed

- `FE/llm-api-test-generator/src/services/specificationService.ts`
- `FE/llm-api-test-generator/src/hooks/useSpecifications.ts`
- `FE/llm-api-test-generator/src/pages/SpecificationPage.tsx`
- `FE/llm-api-test-generator/src/pages/ProjectDetailedViewPage.tsx`

## Testing

To test the fix:

1. Upload a new specification
2. Observe "Parsing..." status with spinner
3. Wait a few seconds
4. Refresh the page
5. Status should change to "Success"
6. Endpoints should be available

## Notes

- Parsing is asynchronous and happens in the background
- Users may need to refresh to see updated status
- Consider adding auto-refresh or WebSocket for real-time status updates
- If parse fails, status will show "Failed" - user should re-upload

---

**Fixed**: 2024-03-27
**Issue**: 404 error when clicking Parse button
**Solution**: Removed manual parse button, show automatic parse status instead
