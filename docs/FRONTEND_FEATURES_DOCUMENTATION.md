# Frontend Features Documentation - TestFlow Intelligence Platform

## 📋 Tổng quan (Overview)

TestFlow Intelligence là nền tảng kiểm thử API tự động được hỗ trợ bởi LLM (Large Language Model), cho phép các nhà phát triển tự động hóa toàn bộ quy trình kiểm thử API từ phân tích đặc tả, tạo test case, thực thi kiểm thử đến phân tích lỗi.

### Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Material Design 3
- **Routing**: React Router v6
- **i18n**: react-i18next (English & Vietnamese)
- **AI Integration**: Google Gemini AI (gemini-3-flash-preview)

### Kiến trúc Frontend

```
src/
├── components/
│   ├── layout/          # Layout components (Sidebar, TopAppBar, MainLayout)
│   └── ui/              # Reusable UI components (Modal, etc.)
├── pages/               # Page components (13 main pages)
├── services/            # API services (geminiService)
├── types/               # TypeScript type definitions
├── locales/             # i18n translations (en.json, vi.json)
├── lib/                 # Utility functions
└── App.tsx              # Main app component
```

---

## 🎨 Design System

### Material Design 3 Theme

- **Primary Color**: Indigo (#3525CD)
- **Surface Colors**: Dynamic light/dark mode
- **Typography**: Sans-serif, tracking-tight
- **Spacing**: 8px base unit
- **Border Radius**: 8px-24px (rounded-xl to rounded-3xl)

### Dark Mode Support

- Automatic theme switching
- Persisted in localStorage
- Smooth transitions between themes

---

## 📱 Các Trang Chính (Main Pages)

### 1. Dashboard (Bảng điều khiển)

**Route**: `/dashboard`

**Chức năng**:

- Hiển thị tổng quan hệ thống với metrics chính
- Real-time system health monitoring
- Recent activity feed
- Top API collections table

**Metrics hiển thị**:

- Active Projects: 24 dự án
- Total Endpoints: 1,402 endpoints
- Monthly Test Runs: 12.5k runs
- Pass Rate: 98.4%

**Components**:

- Hero header với welcome message
- Metric bento grid (4 cards)
- System health chart (SVG visualization)
- AI insights card với LLM suggestions
- Recent activity timeline
- Top API collections table với search/filter

**Features đặc biệt**:

- Live/24h/7d time range selector
- Real-time latency monitoring
- Coverage percentage với progress bars
- Status indicators (Active/Error/Warning)

---

### 2. Project Management (Quản lý Dự án)

**Route**: `/projects`

**Chức năng**:

- Quản lý danh sách dự án API testing
- Tạo mới, chỉnh sửa, xóa dự án
- Xem chi tiết dự án
- Filter và search projects

**Dữ liệu Project**:

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
```

**Actions**:

- Edit Project (Edit2 icon)
- View Details (Eye icon) → Navigate to `/project/:id`
- Delete Project (Trash2 icon)

**Modal - Create Project**:

- Project Legal Name (input)
- Description (textarea)
- Data Source Selection (select: OpenAPI, Postman Collection)

**Table Columns**:

- Project Name & Description
- API Specification Document (với icon)
- Last Run Date
- Status Badge (Active/Archived)
- Actions (Edit/View/Delete)

**Pagination**: 10 items per page

---

### 3. API Specifications (Đặc tả API)

**Route**: `/specifications`

**Chức năng**:

- Upload và quản lý API specification files
- Parse và validate schemas
- Manual specification entry
- View recent specifications

**Supported Formats**:

- OpenAPI Specification (v3.1.0)
- Swagger JSON (v2.0)
- GraphQL Schema Definition
- Postman Collection

**Upload Methods**:

1. **Drag & Drop**: Kéo thả file vào upload zone
2. **File Picker**: Chọn file từ local
3. **Manual Entry**: Nhập specification thủ công

**Recent Specifications Table**:

- Specification Document Name
- Format Type (OpenAPI/Swagger/GraphQL)
- Version
- Parse Status (Success/Failed)
- Status (Active/Archived)
- Actions (View Details/Delete)

---

### 4. Endpoints Management (Quản lý Điểm cuối)

**Route**: `/endpoints`

**Chức năng**:

- Hiển thị tất cả API endpoints đã discover
- Monitor endpoint status, latency, coverage
- Filter theo HTTP method
- Export endpoint list
- Sync endpoints từ specifications

**Endpoint Data**:

```typescript
interface ApplicationProgrammingInterfaceEndpoint {
  id: string;
  path: string;
  method: HttpMethod; // GET | POST | PUT | DELETE | PATCH
  description?: string;
  status: "active" | "deprecated" | "error";
  latency?: number;
  coverage?: number;
}
```

**Filter Bar**:

- Search by path/description
- Method filter: ALL, GET, POST, PUT, DELETE
- Advanced filters

**Endpoint Card Display**:

- HTTP Method badge (color-coded)
- Endpoint path với external link icon
- Description
- Status indicator (Active/Warning/Error)
- Latency (ms)
- Test Coverage (% với progress bar)

**Actions**:

- Export List (Download button)
- Sync Endpoints (RefreshCw button)
- Load More (pagination)

---

### 5. Test Suites (Bộ Kiểm thử)

**Route**: `/test-suites`

**Chức năng**:

- Tạo và quản lý test suites
- Organize test collections
- Run test suites
- Monitor suite status

**Test Suite Data**:

```typescript
interface TestSuite {
  id: string;
  name: string;
  specificationId: string;
  generationType: "manual" | "llm-assisted" | "automated";
  endpointCount: number;
  status: "active" | "archived";
}
```

**Suite Card Display**:

- Suite icon (Layers)
- Status badge (Stable/Degraded)
- Suite name & ID
- Specification reference
- Endpoint count
- Generation type (manual/llm-assisted/automated)
- Last run timestamp

**Actions per Suite**:

- Settings (cấu hình suite)
- Copy (duplicate suite)
- Delete (xóa suite)
- Run Suite (thực thi)

**Modal - Create Suite**:

- Suite Document Name
- Testing Environment (Dev/Staging/Production)
- Select API Endpoints (checkbox list)

**Grid Layout**: Responsive 1-3 columns với "Add New" placeholder card

---

### 6. Test Execution Order Gate (Cổng Thứ tự Thực thi)

**Route**: `/order-gate`

**Chức năng**:

- Visualize test execution dependencies
- Define logical execution flow
- Prevent race conditions
- Optimize test order với LLM

**Execution Order Data**:

```typescript
interface TestExecutionOrderPlan {
  nodes: TestExecutionNode[];
  edges: TestExecutionEdge[];
  reasoningNotes: string;
}

interface TestExecutionNode {
  id: string;
  label: string;
  method: HttpMethod;
  url: string;
  stepNumber: number;
  type: "root" | "child" | "leaf";
}
```

**Features**:

- **Visual Graph Editor**: Drag & drop nodes để reorder
- **LLM Intelligence**: Tự động phân tích dependencies
- **Parallel Paths**: Xác định các test có thể chạy song song
- **Complexity Analysis**: Medium/High/Low complexity score

**Stats Display**:

- Total Steps
- Parallel Paths count
- Complexity level

**Actions**:

- Save Graph
- Execute Sequence
- Regenerate Optimal Path (LLM)

**Pro Tip**: Context menu để thêm conditional logic gates

---

### 7. Test Case Studio (Phòng thiết kế Kịch bản)

**Route**: `/studio`

**Chức năng**:

- Design individual test cases
- Real-time validation
- AI-assisted test generation
- Code editor với syntax highlighting

**Test Case Editor**:

- Test Case Name input
- Endpoint Target selector
- Request payload editor (JSON)
- Assertions builder
- Response validation

**AI Assistant Panel**:

- Analyze endpoint schema
- Generate 12+ additional test cases
- Cover boundary values & error states
- Suggest edge cases

**Execution Console**:

- Real-time test runner output
- Connection status
- Execution results (passed/failed)
- Format button cho JSON

**Actions**:

- Save Case
- Run Test
- Format Code
- Generate Suggestions (AI)

---

### 8. LLM Suggestions (Gợi ý từ LLM)

**Route**: `/suggestions`

**Chức năng**:

- AI-powered test coverage analysis
- Identify critical gaps
- Suggest optimizations
- Estimate time savings

**Metrics Dashboard**:

- **Overall Intelligence Score**: 94.2/100 (+4.2% trend)
- **Identified Gaps**: 18 critical vulnerabilities
- **Time Saved**: 42.5 hours

**Suggestion Items**:
Mỗi suggestion hiển thị:

- Title & Description
- Impact level (High/Medium/Low)
- Difficulty (Easy/Medium/Hard)
- Estimated Implementation Time (mins)
- Actions: Add to Suite / Dismiss

**Suggestion Types**:

1. **Boundary Value Testing**: Test với giá trị biên
2. **Negative Scenarios**: Test với input không hợp lệ
3. **Security Vulnerabilities**: SQL injection, XSS, etc.
4. **Performance Edge Cases**: Large payloads, timeouts

**Banner CTA**:

- "Launch Autonomous Generator" để tạo toàn bộ suite tự động

**Sort Options**: By Impact, By Difficulty, By Time

---

### 9. Environments (Môi trường)

**Route**: `/environments`

**Chức năng**:

- Manage test environments
- Configure authentication
- Monitor environment status
- Set environment variables

**Environment Data**:

```typescript
interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  isDefault: boolean;
  authType: "bearer" | "api-key" | "oauth2" | "basic";
  status: "operational" | "degraded" | "down";
}
```

**Environment Card Display**:

- Environment name & status badge
- Base URL với copy button
- Auth method indicator
- Region information
- SSL verification status
- Auto-sync toggle

**Status Types**:

- **Operational**: Green indicator, fully functional
- **Degraded**: Yellow indicator, có issues
- **Down**: Red indicator, không available

**Actions**:

- Add Environment
- Configure Variables
- Copy URL
- Edit Settings
- Delete Environment

**Register New Environment Form**:

- Environment Name
- Base URL
- Authentication Type
- Region Selection
- SSL Certificate Upload

---

### 10. Test Execution Runs (Lượt thực thi)

**Route**: `/runs`

**Chức năng**:

- Track all test executions
- View execution history
- Download audit logs
- Filter by date range

**Stats Summary**:

- Total Runs: 1,242
- Success Rate: 98.4%
- Failures: 12
- Average Duration: 3m 15s

**Runs Table Columns**:

- Run ID & Date
- Test Suite Name
- Environment
- Status (Passed/Failed/Warning)
- Tests Count (passed/total)
- Duration
- Initiator (User/Scheduled/Autonomous)
- Actions (View Report)

**Filter Options**:

- Search by Run ID or Suite Name
- Date Range: Last 7 Days / Last 30 Days / Custom
- Status Filter
- Environment Filter

**Status Badges**:

- **Passed**: Green với CheckCircle2 icon
- **Failed**: Red với XCircle icon
- **Warning**: Yellow với Clock icon

**Actions**:

- Download Audit Log
- Run New Execution
- View Report (navigate to detail)

**Pagination**: Show X of Y runs với prev/next buttons

---

### 11. Failure Explanation (Giải thích Lỗi)

**Route**: `/failure-explanation`

**Chức năng**:

- AI-powered root cause analysis
- Compare expected vs actual requests
- Suggest fixes
- Identify similar failures

**Analysis Sections**:

1. **AI Root Cause Analysis**:
   - Expected Behavior description
   - Actual Behavior description
   - Suggested Resolution steps

2. **Payload Comparison**:
   - Side-by-side JSON diff
   - Actual Request (Failed)
   - Expected Request (Success)
   - Highlighted differences

3. **Impact Analysis**:
   - Risk Level: Critical/High/Medium/Low
   - Affected Users count
   - Business impact description
   - Generate Fix PR button

4. **Similar Failures**:
   - List of similar past failures
   - Match percentage
   - Link to previous analyses

5. **Self-Healing Tip**:
   - Enable Auto-Fix suggestion
   - LLM auto-update capability
   - Schema change detection

**Actions**:

- Re-Analyze Failure
- Generate Fix PR
- Apply Suggested Fix
- Dismiss

---

### 12. Reports (Báo cáo)

**Route**: `/reports`

**Chức năng**:

- Analytics dashboard
- Performance metrics
- Reliability trends
- Failure distribution

**High-Level Metrics**:

- Pass Rate: 98.4% (+2.1% trend)
- Response Time: 142ms (-12ms improvement)
- Test Coverage: 86.5% (+5.4% increase)
- Total Executions: 12.5k (+1.2k growth)

**Charts & Visualizations**:

1. **Reliability Trend Chart**:
   - 15-day bar chart
   - Production vs Staging comparison
   - Daily pass rate percentage
   - Hover tooltips

2. **Failure Distribution Pie Chart**:
   - Authentication failures: 6
   - Timeout errors: 4
   - Validation errors: 2
   - Color-coded segments

3. **Top Performing Suites**:
   - Suite name & reliability score
   - Execution count
   - Performance trend
   - Link to full leaderboard

**Export Options**:

- Export PDF report
- Download raw data (CSV/JSON)
- Schedule automated reports

**Date Range Selector**:

- Last 30 Days (default)
- Last 7 Days
- Last 90 Days
- Custom Range

---

### 13. Subscription & Billing (Gói dịch vụ & Thanh toán)

**Route**: `/billing`

**Chức năng**:

- Manage subscription plans
- View usage statistics
- Billing history
- Upgrade/downgrade plans

**Usage Dashboard**:

- **Monthly Test Runs**: 8,420 / 50,000 (16.8% used)
- **Active Projects**: 3 / 3 (limit reached)
- **AI Tokens Used**: 142k / 500k (resetting in 12 days)

**Available Plans**:

1. **Starter Plan** - $0/month:
   - Up to 3 projects
   - 1,000 test runs/month
   - Basic AI suggestions
   - 24h data retention
   - Community support
   - Button: "Current Plan"

2. **Professional Plan** - $49/month (Most Popular):
   - Unlimited projects
   - 50,000 test runs/month
   - Advanced LLM reasoning
   - 30-day data retention
   - Priority email support
   - Custom environments
   - Button: "Upgrade to Pro"

3. **Enterprise Plan** - Custom pricing:
   - Unlimited everything
   - On-premise deployment
   - Dedicated account manager
   - SLA guarantees
   - Custom AI model training
   - SSO & Advanced Security
   - Button: "Contact Sales"

**Billing Toggle**: Monthly / Yearly (Save 20%)

**Billing History Table**:

- Invoice ID
- Date
- Amount
- Status (Paid/Pending/Failed)
- Download Invoice action

**Actions**:

- Download All Invoices
- Update Payment Method
- Cancel Subscription
- Request Invoice

---

### 14. Account Settings (Cài đặt Tài khoản)

**Route**: `/settings`

**Chức năng**:

- Manage personal information
- Security settings
- Notification preferences
- Theme preferences

**Tabs**:

1. **Profile Information**:
   - Full Legal Name (input)
   - Electronic Mail Address (input)
   - Email change warning message
   - Save Changes button

2. **Security and Password**:
   - Current Password (input)
   - New Password (input)
   - Confirm New Password (input)
   - Password strength indicator
   - Save Changes button

3. **Notification Preferences**:
   - Critical System Alerts (toggle)
   - Weekly Performance Reports (toggle)
   - Security and Login Notifications (toggle)
   - Product Updates and News (toggle)
   - Each với description text

**Success Toast**: "Your settings have been updated successfully."

---

### 15. Help Center (Trung tâm Trợ giúp)

**Route**: `/help`

**Chức năng**:

- Documentation hub
- FAQ section
- Contact support
- Community forum links

**Search Bar**: "How can we assist you today?"

**Categories**:

1. **Getting Started**: Basics & first project setup
2. **API Testing**: Projects, suites, test cases docs
3. **LLM Integration**: Core engine & integration reference
4. **Billing & Subscription**: Pricing & payment help

**FAQ Section**:

- Q1: How to connect OpenAPI Specification?
- Q2: What is Test Execution Order Gate?
- Q3: Can I export test reports?
- Q4: How does LLM Suggestions work?

**Contact Support**:

- Contact Support button
- Live Chat button (24/7 available)
- Email support link

**Footer Links**:

- Community Forum
- System Status
- Release Notes

---

## 🔐 Authentication Pages

### Login Page

**Route**: `/` (landing) → `/login`

**Features**:

- Email & Password login
- "Forgot Password?" link
- Social login (Google OAuth)
- "Don't have an account? Register Free" link
- Remember me checkbox

**Side Panel**:

- Hero title: "Testing that thinks for you."
- Benefits list (4 items)
- "Joined by 12k+ developers" social proof

### Register Page

**Route**: `/register`

**Form Fields**:

- Full Legal Name
- Electronic Mail Address
- Create Password
- Confirm Password (với validation)

**Features**:

- Password mismatch validation
- Social registration (Google)
- "Already have an account? Sign In" link
- Terms of Service checkbox

### Forgot Password Page

**Route**: `/forgot-password`

**Features**:

- Email input
- "Send Reset Instruction" button
- "Return to Sign In Page" link
- Success state: "Instructions Sent" với email confirmation

---

## 🧩 Shared Components

### MainLayout

**Location**: `src/components/layout/MainLayout.tsx`

**Structure**:

```
<MainLayout>
  <Sidebar /> (collapsible)
  <main>
    <TopAppBar />
    <div className="content">
      {children}
    </div>
  </main>
</MainLayout>
```

**Props**:

- `children`: React.ReactNode
- `title`: string (for TopAppBar)

**Features**:

- Responsive sidebar (72px collapsed, 288px expanded)
- Smooth transitions
- Dark mode support

---

### Sidebar

**Location**: `src/components/layout/Sidebar.tsx`

**Navigation Items** (13 items):

1. Dashboard (LayoutDashboard icon)
2. Project Management (FolderKanban icon)
3. API Specifications (FileText icon)
4. Endpoints Management (Network icon)
5. Test Suites (Layers icon)
6. Test Execution Order Gate (DoorOpen icon)
7. Test Case Studio (Edit3 icon)
8. LLM Suggestions (Sparkles icon)
9. Environments (Settings2 icon)
10. Test Execution Runs (PlayCircle icon)
11. Failure Explanation (AlertCircle icon)
12. Reports (BarChart3 icon)
13. Subscription & Billing (CreditCard icon)

**Bottom Items**:

- Account Settings (Settings icon)
- Help (HelpCircle icon)

**Features**:

- Active link highlighting (border-r-4 border-indigo-600)
- Hover effects
- Collapse/expand animation
- Icon-only mode when collapsed
- Tooltips in collapsed mode

**Logo**: Sparkles icon trong indigo-700 rounded-xl box

---

### TopAppBar

**Location**: `src/components/layout/TopAppBar.tsx`

**Left Section**:

- Menu button (toggle sidebar)
- Page title

**Right Section**:

- LLM Active badge (Sparkles icon)
- Dark/Light mode toggle (Moon/Sun icon)
- Language toggle (EN/VI)
- Notification bell (với red dot indicator)
- User profile dropdown

**User Dropdown Menu**:

- User avatar & name
- Role: "Software Engineering Student"
- Account Settings link
- Log Out button (red color)

**Features**:

- Sticky positioning
- Backdrop blur effect
- Click outside to close dropdown
- Theme persistence in localStorage
- Language persistence

---

### Modal Component

**Location**: `src/components/ui/Modal.tsx`

**Props**:

- `isOpen`: boolean
- `onClose`: () => void
- `title`: string
- `children`: React.ReactNode
- `footer`: React.ReactNode

**Features**:

- Backdrop overlay (dark transparent)
- Center positioning
- Close button (X icon)
- Smooth fade-in animation
- Click outside to close
- ESC key to close

**Usage Example**:

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Create New Project"
  footer={
    <>
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onConfirm}>Confirm</button>
    </>
  }
>
  <form>...</form>
</Modal>
```

---

## 🌐 Internationalization (i18n)

### Supported Languages

- **English (en)**: Default language
- **Vietnamese (vi)**: Full translation

### Translation Structure

```json
{
  "common": { ... },           // Shared UI text
  "dashboard": { ... },        // Dashboard page
  "projects": { ... },         // Projects page
  "testSuites": { ... },       // Test Suites page
  // ... etc for all pages
}
```

### Usage in Components

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();

  return (
    <h1>{t('dashboard.title')}</h1>
    <button onClick={() => i18n.changeLanguage('vi')}>
      Switch to Vietnamese
    </button>
  );
}
```

### Language Toggle

- TopAppBar có language toggle button
- Click để switch giữa EN/VI
- Persisted in i18next config
- Instant UI update

---

## 🤖 AI/LLM Integration

### Gemini Service

**Location**: `src/services/geminiService.ts`

**Model**: `gemini-3-flash-preview`

**Functions**:

1. **generateTestCases(specContent: string)**:
   - Input: API specification content
   - Output: Structured test cases
   - System Instruction: "Expert API test engineer"

2. **explainFailure(errorLog: string, codeSnippet: string)**:
   - Input: Error log + code snippet
   - Output: Root cause analysis + fix suggestion
   - System Instruction: "Senior QA automation engineer"

3. **suggestExecutionOrder(endpoints: any[])**:
   - Input: Array of endpoints
   - Output: Optimal execution order + reasoning
   - System Instruction: "Test architect"

**Error Handling**:

- Try-catch blocks
- Console error logging
- Throw errors to caller

**API Key**: Loaded from `process.env.GEMINI_API_KEY`

---

## 🎯 Routing Structure

### Public Routes

- `/` - Landing page
- `/login` - Login page
- `/register` - Register page
- `/forgot-password` - Password recovery

### Protected Routes (require authentication)

- `/dashboard` - Dashboard
- `/projects` - Project Management
- `/project/:id` - Project Detail
- `/specifications` - API Specifications
- `/endpoints` - Endpoints Management
- `/test-suites` - Test Suites
- `/order-gate` - Test Execution Order Gate
- `/studio` - Test Case Studio
- `/suggestions` - LLM Suggestions
- `/environments` - Environments
- `/runs` - Test Execution Runs
- `/failure-explanation` - Failure Explanation
- `/reports` - Reports
- `/billing` - Subscription & Billing
- `/settings` - Account Settings
- `/help` - Help Center

### Route Guards

- Check `authToken` in localStorage
- Redirect to `/login` if not authenticated
- Redirect to `/dashboard` if authenticated user visits public routes

---

## 🎨 UI/UX Features

### Responsive Design

- **Mobile**: Single column layout, hamburger menu
- **Tablet**: 2-column grid, collapsible sidebar
- **Desktop**: 3-4 column grid, full sidebar

### Animations & Transitions

- Smooth page transitions
- Hover effects on buttons/cards
- Loading states
- Skeleton screens
- Fade-in animations
- Scale transforms on active states

### Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus indicators
- Screen reader support
- Color contrast compliance

### Loading States

- Skeleton loaders
- Spinner components
- Progress bars
- Shimmer effects

### Empty States

- "No data found" messages
- Illustration placeholders
- Call-to-action buttons
- Helpful guidance text

### Error States

- Error boundaries
- Toast notifications
- Inline validation messages
- Retry buttons

---

## 📊 Data Flow

### State Management

- **Local State**: useState for component-level state
- **Context**: Potential AuthContext for user state
- **URL State**: Query params for filters/tabs
- **LocalStorage**: Theme, language, auth token

### API Integration Pattern

```typescript
// Example API call pattern
const fetchProjects = async () => {
  try {
    setLoading(true);
    const response = await fetch("/api/projects");
    const data = await response.json();
    setProjects(data);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

### Data Fetching Strategy

- Fetch on component mount
- Refetch on user actions
- Optimistic updates
- Error retry logic
- Cache invalidation

---

## 🔧 Utility Functions

### cn() - Class Name Utility

**Location**: `src/lib/utils.ts`

**Purpose**: Merge Tailwind classes conditionally

**Usage**:

```tsx
<div
  className={cn(
    "base-class",
    isActive && "active-class",
    isPrimary ? "primary-class" : "secondary-class",
  )}
/>
```

### Date Formatting

- Relative time: "12 mins ago", "Yesterday"
- Absolute time: "2024-03-27 14:30"
- Duration: "4m 12s"

### Number Formatting

- Thousands separator: "12,500"
- Percentage: "98.4%"
- Currency: "$49/month"

---

## 🚀 Performance Optimizations

### Code Splitting

- Route-based code splitting
- Lazy loading components
- Dynamic imports

### Image Optimization

- Lazy loading images
- Responsive images
- WebP format support

### Bundle Size

- Tree shaking
- Minification
- Compression (gzip/brotli)

### Caching Strategy

- Service Worker (potential)
- LocalStorage caching
- API response caching

---

## 🧪 Testing Strategy (Recommended)

### Unit Tests

- Component rendering tests
- Utility function tests
- Hook tests

### Integration Tests

- User flow tests
- API integration tests
- Form submission tests

### E2E Tests

- Critical user journeys
- Authentication flows
- CRUD operations

### Testing Tools (Suggested)

- Vitest for unit tests
- React Testing Library
- Playwright for E2E
- MSW for API mocking

---

## 📦 Build & Deployment

### Development

```bash
npm run dev
# Runs on http://localhost:5173
```

### Build

```bash
npm run build
# Output: dist/
```

### Preview

```bash
npm run preview
# Preview production build
```

### Environment Variables

```env
VITE_API_BASE_URL=http://localhost:5000
GEMINI_API_KEY=your_gemini_api_key
```

---

## 🔮 Future Enhancements

### Planned Features

1. **Real-time Collaboration**: Multiple users editing test cases
2. **WebSocket Integration**: Live test execution updates
3. **Advanced Filtering**: Complex query builder
4. **Custom Dashboards**: User-configurable widgets
5. **Export Templates**: Custom report templates
6. **Webhook Integration**: Notify external systems
7. **API Versioning**: Support multiple API versions
8. **Test Scheduling**: Cron-based test execution
9. **Performance Monitoring**: APM integration
10. **Mobile App**: Native iOS/Android apps

### Technical Debt

- Add comprehensive error boundaries
- Implement proper loading states
- Add unit test coverage
- Optimize bundle size
- Improve accessibility
- Add E2E tests
- Document component props
- Create Storybook stories

---

## 📚 Key Differences from Other FE Project

### FE/llm-api-test-generator vs FE/LLM-AssistedAPITest_DOAN

**llm-api-test-generator** (This project):

- ✅ Modern Material Design 3
- ✅ Full i18n support (EN/VI)
- ✅ Comprehensive feature set (13 pages)
- ✅ AI-first approach với Gemini integration
- ✅ Professional UI/UX
- ✅ Dark mode support
- ✅ Advanced visualizations

**LLM-AssistedAPITest_DOAN** (Other project):

- Basic UI design
- Limited features
- No i18n
- Simpler architecture
- Focus on core functionality

**Recommendation**: Use `llm-api-test-generator` as the main frontend, migrate any unique features from the other project if needed.

---

## 🎓 Learning Resources

### React 19 Features Used

- Concurrent rendering
- Automatic batching
- Transitions
- Suspense

### Tailwind CSS Patterns

- Utility-first approach
- Custom color palette
- Responsive design
- Dark mode variants

### TypeScript Best Practices

- Strict type checking
- Interface definitions
- Type inference
- Generic types

---

## 📞 Support & Contact

### Documentation

- Frontend docs: `/docs/FRONTEND_FEATURES_DOCUMENTATION.md`
- Backend docs: `/BE/GSP26SE43.ModularMonolith/docs/BACKEND_FEATURES_DOCUMENTATION.md`

### Developer

- Name: Đỗ Trần Phúc Hậu
- Role: Software Engineering Student
- Project: TestFlow Intelligence Platform

---

**Last Updated**: March 27, 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
