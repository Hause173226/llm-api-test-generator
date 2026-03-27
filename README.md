# LLM-Assisted API Test Generator - Frontend

> A modern, AI-powered API testing platform built with React 19, TypeScript, and Material Design 3

[![Status](https://img.shields.io/badge/status-production--ready-success)](https://github.com)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com)
[![TypeScript](https://img.shields.io/badge/typescript-100%25-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-19-61dafb)](https://react.dev/)

---

## 🎯 Overview

A comprehensive frontend application for automated API testing with AI-powered test generation, real-time monitoring, and intelligent suggestions. Built to integrate seamlessly with the .NET backend API.

### Key Features

- 🤖 **AI-Powered Test Generation** - LLM-based test case suggestions
- 📊 **Real-time Monitoring** - Live test execution with SignalR
- 📝 **Advanced Code Editor** - Monaco Editor for test case editing
- 🎨 **Modern UI** - Material Design 3 with dark mode
- 🔒 **Secure Authentication** - JWT-based auth with refresh tokens
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🌐 **Internationalization** - Multi-language support (i18next)
- ⚡ **High Performance** - Optimized with Vite and React 19

---

## 📸 Screenshots

### Dashboard

![Dashboard](docs/screenshots/dashboard.png)

### Test Case Studio

![Test Case Studio](docs/screenshots/test-studio.png)

### Real-time Test Execution

![Test Execution](docs/screenshots/test-execution.png)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Backend API running (see backend documentation)

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to frontend directory
cd FE/llm-api-test-generator

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API URLs

# Start development server
npm run dev
```

Access the application at `http://localhost:5173`

### Default Credentials (Development)

```
Email: admin@example.com
Password: Admin@123
```

---

## 🏗️ Tech Stack

### Core Technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing

### UI & Styling

- **Tailwind CSS** - Utility-first CSS
- **Material Design 3** - Design system
- **Lucide React** - Icon library
- **React Hot Toast** - Toast notifications

### State Management

- **React Context** - Global state (Auth, SignalR)
- **Custom Hooks** - Data fetching and management

### API & Real-time

- **Axios** - HTTP client
- **SignalR** - Real-time communication
- **Monaco Editor** - Code editing

### Internationalization

- **i18next** - Translation framework
- **react-i18next** - React integration

---

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── error/          # Error boundary
│   ├── layout/         # Layout components
│   ├── notifications/  # Notification center
│   └── ui/             # UI primitives
├── config/             # Configuration files
│   └── api.ts          # API configuration
├── contexts/           # React contexts
│   ├── AuthContext.tsx # Authentication state
│   └── SignalRContext.tsx # SignalR connection
├── hooks/              # Custom React hooks
│   ├── useDashboard.ts
│   ├── useProjects.ts
│   ├── useTestCase.ts
│   └── ... (11 hooks total)
├── pages/              # Page components
│   ├── DashboardPage.tsx
│   ├── ProjectManagementPage.tsx
│   ├── TestCaseStudioPage.tsx
│   └── ... (11 pages total)
├── services/           # API services
│   ├── apiService.ts   # Base API service
│   ├── authService.ts
│   ├── projectService.ts
│   └── ... (15 services total)
├── utils/              # Utility functions
│   └── errorHandler.ts
├── lib/                # Third-party integrations
│   └── utils.ts
├── App.tsx             # Root component
├── AppRouter.tsx       # Route configuration
└── main.tsx            # Application entry point
```

---

## 🎨 Features

### 1. Authentication & Authorization

- Login, register, logout
- Forgot password flow
- JWT token management
- Automatic token refresh
- Protected routes

### 2. Dashboard

- Real-time metrics
- Activity feed
- Top endpoints
- Quick actions
- SignalR live updates

### 3. Project Management

- Create, edit, delete projects
- Search and pagination
- Project details
- Specification upload

### 4. Specification Management

- Upload OpenAPI, Swagger, Postman collections
- Parse specifications
- Extract endpoints automatically
- Version management

### 5. Endpoint Discovery

- List all API endpoints
- Filter by HTTP method
- Search functionality
- Endpoint statistics

### 6. Test Suite Management

- Create test suites
- Organize test cases
- Clone test suites
- Run entire suites

### 7. Test Case Studio

- Advanced code editor (Monaco)
- JSON request body editing
- Assertion builder
- Real-time console output
- Save and run tests

### 8. Test Execution

- Run individual tests
- Run test suites
- Real-time progress updates
- Detailed results
- Retry failed tests

### 9. AI Suggestions

- LLM-powered test generation
- Edge case detection
- Security test suggestions
- Performance test recommendations
- Accept/reject/implement suggestions

### 10. Environment Management

- Multiple environments (dev, staging, prod)
- Environment variables
- Custom headers
- Test connectivity

### 11. Reports & Analytics

- Test run reports
- Coverage analysis
- Performance metrics
- Trend analysis
- Export (PDF, Excel, JSON)

### 12. Real-time Notifications

- Test completion alerts
- System notifications
- Unread count badge
- Mark as read/unread

### 13. User Settings

- Profile management
- Avatar upload
- Password change
- Notification preferences
- Theme selection

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=https://localhost:44312/api
VITE_SIGNALR_HUB_URL=https://localhost:44312/hubs/testrun

# Optional: Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_TRACKING=false
```

### API Configuration

Edit `src/config/api.ts` for advanced API settings:

```typescript
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
};
```

---

## 📚 Documentation

- [API Integration Mapping](docs/API_INTEGRATION_MAPPING.md)
- [Frontend Features](docs/FRONTEND_FEATURES_DOCUMENTATION.md)
- [Implementation Progress](docs/IMPLEMENTATION_PROGRESS.md)
- [Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)
- [Phase 7 & 8 Completion](docs/PHASE_7_8_COMPLETION.md)
- [Final Completion](docs/FINAL_COMPLETION.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests (if configured)
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Manual Testing

See [Testing Checklist](docs/DEPLOYMENT_GUIDE.md#testing-before-deployment)

---

## 🏗️ Build & Deploy

### Development Build

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

Output: `dist/` directory

### Preview Production Build

```bash
npm run preview
```

### Deploy

See [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 🎯 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🤝 Contributing

### Development Workflow

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier
- Write meaningful commit messages
- Add comments for complex logic

### Commit Convention

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

---

## 📊 Project Statistics

- **Total Files**: 46+
- **Lines of Code**: ~13,000+
- **Components**: 6
- **Pages**: 11
- **Services**: 15
- **Hooks**: 11
- **API Endpoints**: 80+
- **TypeScript Interfaces**: 50+

---

## 🔒 Security

- JWT authentication
- Token refresh mechanism
- Protected routes
- XSS prevention
- HTTPS only
- CORS configuration
- Input validation

---

## 📈 Performance

- Code splitting
- Lazy loading
- Optimized bundle size
- Debounced search
- Pagination
- SignalR connection pooling
- Monaco Editor lazy loading

---

## 🐛 Troubleshooting

### Common Issues

**API Connection Failed**

- Check if backend is running
- Verify API URL in `.env`
- Check CORS configuration

**SignalR Not Connecting**

- Verify SignalR hub URL
- Check WebSocket support
- Review browser console

**Build Errors**

- Clear `node_modules` and reinstall
- Check Node.js version (18+)
- Verify all dependencies

See [Deployment Guide](docs/DEPLOYMENT_GUIDE.md#troubleshooting) for more.

---

## 📝 License

[Your License Here]

---

## 👥 Team

- **Development**: AI Assistant (Kiro)
- **Supervision**: Project Team
- **Architecture**: Full-stack integration

---

## 🙏 Acknowledgments

- React team for React 19
- Vite team for amazing build tool
- Material Design team for design system
- Monaco Editor team for code editor
- SignalR team for real-time communication

---

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Email**: [Your email]

---

## 🎉 Status

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Completion**: 100%  
**Last Updated**: March 27, 2026

---

**Built with ❤️ using React, TypeScript, and AI assistance**
