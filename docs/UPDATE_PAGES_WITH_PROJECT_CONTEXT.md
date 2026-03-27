# Update All Pages to Use Project Context

## Pattern to Apply

### 1. Import useProject hook

```typescript
import { useProject } from "../contexts/ProjectContext";
```

### 2. Get selectedProject from context

```typescript
const { selectedProject } = useProject();
const projectId = selectedProject?.id || "";
```

### 3. Show "No Project Selected" message if no project

```typescript
if (!projectId) {
  return (
    <MainLayout title="Page Title">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-on-surface font-bold text-lg mb-2">
            No Project Selected
          </p>
          <p className="text-on-surface-variant mb-6">
            Please select a project from the sidebar or go to Projects page
          </p>
          <Link
            to="/projects"
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 inline-block"
          >
            Go to Projects
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
```

## Pages to Update

- [ ] EndpointsPage
- [ ] TestSuitesPage
- [ ] EnvironmentsPage
- [ ] TestRunsPage
- [ ] ReportsPage
- [ ] SuggestionsPage
- [ ] StudioPage (Test Case Studio)
- [ ] OrderGatePage (Test Execution Order Gate)
- [ ] FailureExplanationPage

## Benefits

1. Consistent UX across all pages
2. No need to pass projectId via URL
3. Selected project persists across navigation
4. Clear message when no project selected
