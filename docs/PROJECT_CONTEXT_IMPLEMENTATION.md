# Project Context Implementation

## Đã hoàn thành:

### 1. Tạo ProjectContext

- File: `src/contexts/ProjectContext.tsx`
- Lưu selected project vào localStorage
- Provide `selectedProject`, `setSelectedProject`, `clearSelectedProject`

### 2. Thêm ProjectProvider vào App

- Wrap toàn bộ app với ProjectProvider
- Hierarchy: ErrorBoundary > AuthProvider > ProjectProvider > SignalRProvider

### 3. Thêm Project Selector vào Sidebar

- Hiển thị dropdown để chọn project
- Show tên project đang chọn
- Button X để clear selection
- Fetch danh sách projects khi mở dropdown

## Cần làm tiếp:

### 4. Update các trang để sử dụng selectedProject

#### SpecificationPage

- Thay vì lấy `projectId` từ URL query param
- Sử dụng `selectedProject.id` từ context
- Nếu chưa chọn project → hiển thị message "Please select a project first"

#### EndpointsPage

- Tương tự SpecificationPage
- Filter endpoints theo `selectedProject.id`

#### TestSuitesPage

- Filter test suites theo `selectedProject.id`

#### TestRunsPage

- Filter test runs theo `selectedProject.id`

#### EnvironmentsPage

- Filter environments theo `selectedProject.id`

#### ReportsPage

- Filter reports theo `selectedProject.id`

#### SuggestionsPage

- Filter suggestions theo `selectedProject.id`

### 5. Update ProjectManagementPage

- Khi click vào một project → setSelectedProject()
- Có thể redirect đến trang khác (ví dụ: Specifications)

### 6. Update navigation links

- Các link trong sidebar không cần `projectId` nữa
- Các trang tự động lấy từ context

## Lợi ích:

1. **UX tốt hơn**: User chọn project 1 lần, tất cả tabs tự động filter
2. **Code sạch hơn**: Không cần truyền projectId qua URL
3. **Persistent**: Selected project được lưu trong localStorage
4. **Flexible**: Dễ dàng switch giữa các projects

## Workflow mới:

1. User vào trang Projects
2. Click chọn 1 project → setSelectedProject()
3. Sidebar hiển thị project đang chọn
4. Navigate đến bất kỳ tab nào (Specifications, Endpoints, Test Suites, etc.)
5. Tất cả tabs tự động filter theo selected project
6. Click X trong sidebar để clear selection
