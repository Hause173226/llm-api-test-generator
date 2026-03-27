# Guide: Apply Project Context to All Pages

## Summary

Đã tạo sẵn:

- ✅ ProjectContext (`src/contexts/ProjectContext.tsx`)
- ✅ NoProjectSelected component (`src/components/common/NoProjectSelected.tsx`)
- ✅ Project Selector in Sidebar
- ✅ SpecificationPage đã update

## Cần apply cho các trang sau:

### 1. Import statements cần thêm

```typescript
import { useProject } from "../contexts/ProjectContext";
import NoProjectSelected from "../components/common/NoProjectSelected";
```

### 2. Trong component, thêm:

```typescript
const { selectedProject } = useProject();
const projectId = selectedProject?.id || "";
```

### 3. Thêm check trước return chính:

```typescript
if (!projectId) {
  return (
    <MainLayout title={t("page.title")}>
      <NoProjectSelected />
    </MainLayout>
  );
}
```

## Danh sách trang cần update:

### Trang có sẵn (cần check và update):

1. **EndpointsPage** (`src/pages/EndpointsPage.tsx`)
   - Hiện tại: Có thể đang hardcode hoặc không có projectId
   - Cần: Lấy từ selectedProject

2. **TestSuitesPage** (`src/pages/TestSuitesPage.tsx`)
   - Hiện tại: Có thể đang lấy từ URL
   - Cần: Lấy từ selectedProject

3. **EnvironmentsPage** (`src/pages/EnvironmentsPage.tsx`)
   - Hiện tại: Có thể đang lấy từ URL
   - Cần: Lấy từ selectedProject

4. **TestRunsPage** (`src/pages/TestRunsPage.tsx`)
   - Hiện tại: Có thể đang lấy từ URL
   - Cần: Lấy từ selectedProject

5. **ReportsPage** (`src/pages/ReportsPage.tsx`)
   - Hiện tại: Có thể đang lấy từ URL
   - Cần: Lấy từ selectedProject

6. **SuggestionsPage** (`src/pages/SuggestionsPage.tsx`)
   - Hiện tại: Có thể đang lấy từ URL
   - Cần: Lấy từ selectedProject

### Trang có thể chưa implement:

7. **StudioPage** (Test Case Studio)
8. **OrderGatePage** (Test Execution Order Gate)
9. **FailureExplanationPage**

## Example: Complete Update for a Page

```typescript
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import MainLayout from "../components/layout/MainLayout";
import { useProject } from "../contexts/ProjectContext";
import NoProjectSelected from "../components/common/NoProjectSelected";

export default function ExamplePage() {
  const { t } = useTranslation();
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id || "";

  // Show "No Project Selected" if no project
  if (!projectId) {
    return (
      <MainLayout title={t("example.title")}>
        <NoProjectSelected />
      </MainLayout>
    );
  }

  // Rest of the page logic with projectId
  return (
    <MainLayout title={t("example.title")}>
      <div>
        <h1>Project: {selectedProject.name}</h1>
        {/* Page content here */}
      </div>
    </MainLayout>
  );
}
```

## Testing Checklist

Sau khi update mỗi trang, test:

1. ✅ Chưa chọn project → Hiển thị "No Project Selected"
2. ✅ Chọn project từ sidebar → Trang load đúng data
3. ✅ Switch project → Data update theo project mới
4. ✅ Refresh page → Selected project vẫn còn (localStorage)

## Priority Order

Update theo thứ tự ưu tiên:

1. **High**: TestSuitesPage, EndpointsPage (core workflow)
2. **Medium**: EnvironmentsPage, TestRunsPage
3. **Low**: ReportsPage, SuggestionsPage, các trang khác
