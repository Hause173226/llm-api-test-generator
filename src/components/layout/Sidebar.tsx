import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Network,
  Layers,
  Edit3,
  Sparkles,
  Settings2,
  PlayCircle,
  AlertCircle,
  BarChart3,
  CreditCard,
  HelpCircle,
  Settings,
  Menu,
  ChevronDown,
  FolderOpen,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useProject } from "../../contexts/ProjectContext";
import { projectService } from "../../services";

export default function Sidebar({ isCollapsed }: { isCollapsed: boolean }) {
  const location = useLocation();
  const { t } = useTranslation();
  const { selectedProject, setSelectedProject, clearSelectedProject } =
    useProject();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Fetch projects on mount to validate selected project
  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch projects when dropdown opens
  useEffect(() => {
    if (isProjectDropdownOpen && projects.length === 0) {
      fetchProjects();
    }
  }, [isProjectDropdownOpen]);

  const fetchProjects = async () => {
    try {
      setIsLoadingProjects(true);
      const data = await projectService.getProjects(1, 50);
      const projectList = data.items || [];
      setProjects(projectList);

      // Validate selected project only once here
      if (selectedProject) {
        const projectExists = projectList.some(
          (p: any) => p.id === selectedProject.id,
        );
        if (!projectExists) {
          console.warn(
            "Selected project no longer exists, clearing selection",
            selectedProject.id,
          );
          clearSelectedProject();
        }
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleSelectProject = (project: any) => {
    console.log("Sidebar - Selecting project:", project);
    console.log("Sidebar - Project ID:", project.id);

    // Workaround: Remove trailing 'b' if exists
    let cleanId = project.id;
    if (typeof cleanId === "string" && cleanId.endsWith("b")) {
      cleanId = cleanId.slice(0, -1);
      console.log("Sidebar - Cleaned ID:", cleanId);
    }

    setSelectedProject({
      id: cleanId,
      name: project.name,
      description: project.description,
      isActive: project.isActive,
    });
    setIsProjectDropdownOpen(false);
  };

  const navItems = [
    { icon: LayoutDashboard, label: t("common.dashboard"), path: "/dashboard" },
    {
      icon: FolderKanban,
      label: t("common.projectManagement"),
      path: "/projects",
    },
    {
      icon: FileText,
      label: t("common.apiSpecifications"),
      path: "/specifications",
    },
    {
      icon: Network,
      label: t("common.endpointsManagement"),
      path: "/endpoints",
    },
    { icon: Layers, label: t("common.testSuites"), path: "/test-suites" },
{ icon: PlayCircle, label: t("common.testExecutionRuns"), path: "/runs" },
    { icon: Sparkles, label: t("common.llmSuggestions"), path: "/suggestions" },
    { icon: Settings2, label: t("common.environments"), path: "/environments" },
    
    {
      icon: AlertCircle,
      label: t("common.failureExplanation"),
      path: "/failure-explanation",
    },
    { icon: BarChart3, label: t("common.reports"), path: "/reports" },
    {
      icon: CreditCard,
      label: t("common.subscriptionBilling"),
      path: "/billing",
    },
  ];

  const isPathActive = (basePath: string) => {
    const currentPath = location.pathname;

    // Exact match first.
    if (currentPath === basePath) {
      return true;
    }

    // Keep parent tab active for nested routes.
    if (currentPath.startsWith(`${basePath}/`)) {
      return true;
    }

    // Project detail route is singular: /project/:id, while menu item is /projects.
    if (basePath === "/projects" && currentPath.startsWith("/project/")) {
      return true;
    }

    return false;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col p-4 z-40 bg-slate-50 dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-800 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-72",
      )}
    >
      <div
        className={cn(
          "mb-10 px-4 py-4 flex items-center",
          isCollapsed ? "justify-center" : "justify-start",
        )}
      >
        <div className="w-10 h-10 bg-indigo-700 dark:bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 shrink-0">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        {!isCollapsed && (
          <span className="ml-3 text-xl font-bold tracking-tighter text-indigo-700 dark:text-indigo-400 whitespace-nowrap overflow-hidden animate-in fade-in duration-500">
            TestFlow Intelligence
          </span>
        )}
      </div>

      {/* Project Selector */}
      {!isCollapsed && (
        <div className="mb-6 px-2">
          <div className="relative">
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                  {selectedProject ? selectedProject.name : "Select Project"}
                </span>
              </div>
              {selectedProject ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelectedProject();
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>

            {/* Dropdown */}
            {isProjectDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg max-h-64 overflow-y-auto z-50">
                {isLoadingProjects ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    Loading projects...
                  </div>
                ) : projects.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No projects found
                  </div>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project)}
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0",
                        selectedProject?.id === project.id &&
                          "bg-indigo-50 dark:bg-indigo-900/20",
                      )}
                    >
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {project.name}
                      </div>
                      {project.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {project.description}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar font-sans text-sm font-medium tracking-tight">
        {navItems.map((item) => {
          const isActive = isPathActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center px-4 py-3 rounded-lg transition-all duration-200",
                isCollapsed ? "justify-center" : "justify-start gap-3",
                isActive
                  ? "text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800 font-semibold border-r-4 border-indigo-600 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50",
              )}
              title={isCollapsed ? item.label : ""}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0",
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-400 dark:text-slate-500",
                )}
              />
              {!isCollapsed && (
                <span className="whitespace-nowrap overflow-hidden animate-in fade-in duration-500">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        <div className="mt-auto pt-8 flex flex-col gap-1">
          <Link
            to="/settings"
            className={cn(
              "flex items-center px-4 py-3 rounded-lg transition-all duration-200",
              isCollapsed ? "justify-center" : "justify-start gap-3",
              location.pathname === "/settings"
                ? "text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800 font-semibold border-r-4 border-indigo-600 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50",
            )}
            title={isCollapsed ? t("common.accountSettings") : ""}
          >
            <Settings
              className={cn(
                "w-5 h-5 shrink-0",
                location.pathname === "/settings"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 dark:text-slate-500",
              )}
            />
            {!isCollapsed && (
              <span className="whitespace-nowrap overflow-hidden animate-in fade-in duration-500">
                {t("common.accountSettings")}
              </span>
            )}
          </Link>
          <Link
            to="/help"
            className={cn(
              "flex items-center px-4 py-3 rounded-lg transition-all duration-200",
              isCollapsed ? "justify-center" : "justify-start gap-3",
              location.pathname === "/help"
                ? "text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800 font-semibold border-r-4 border-indigo-600 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50",
            )}
            title={isCollapsed ? t("common.help") : ""}
          >
            <HelpCircle
              className={cn(
                "w-5 h-5 shrink-0",
                location.pathname === "/help"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 dark:text-slate-500",
              )}
            />
            {!isCollapsed && (
              <span className="whitespace-nowrap overflow-hidden animate-in fade-in duration-500">
                {t("common.help")}
              </span>
            )}
          </Link>
        </div>
      </nav>
    </aside>
  );
}
