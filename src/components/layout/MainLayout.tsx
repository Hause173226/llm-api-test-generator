import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopAppBar, { BreadcrumbItem } from './TopAppBar';
import { cn } from '../../lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: BreadcrumbItem[];
}

export default function MainLayout({ children, title, breadcrumbs }: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar isCollapsed={isSidebarCollapsed} />
      <main
        className={cn(
          "flex-1 min-h-0 min-w-0 flex flex-col relative transition-all duration-300 ease-in-out h-screen overflow-hidden",
          isSidebarCollapsed ? "ml-20" : "ml-72"
        )}
      >
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          <TopAppBar
            title={title}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            breadcrumbs={breadcrumbs}
          />
          <div className="p-8 pb-8 pt-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
