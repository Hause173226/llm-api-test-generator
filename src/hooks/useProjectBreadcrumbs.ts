import { useTranslation } from "react-i18next";
import { useProject } from "../contexts/ProjectContext";
import type { BreadcrumbItem } from "../components/layout/TopAppBar";

/**
 * Builds breadcrumbs based on route hierarchy, NOT browser history.
 *
 *  useProjectBreadcrumbs()
 *    → [Projects, {projectName}]
 *
 *  useProjectBreadcrumbs(moduleName)
 *    → [Projects, {projectName}, {module}]
 *
 *  useProjectBreadcrumbs(moduleName, resourceName)
 *    → [Projects, {projectName}, {module (clickable)}, {resource}]
 *    e.g. API Specifications / Endpoints Management
 */
export function useProjectBreadcrumbs(
    moduleName?: string,
    resourceName?: string,
): BreadcrumbItem[] {
    const { t } = useTranslation();
    const { selectedProject } = useProject();

    if (!selectedProject) return [];

    const projectsItem: BreadcrumbItem = {
        label: t("common.projectManagement"),
        href: "/projects",
    };

    const projectItem: BreadcrumbItem = {
        label: selectedProject.name,
        href: `/project/${selectedProject.id}`,
    };

    if (!moduleName) {
        return [projectsItem, { label: selectedProject.name }];
    }

    if (!resourceName) {
        return [projectsItem, projectItem, { label: moduleName }];
    }

    // 4-level: module item có href để click được
    const moduleHref = moduleName === t("common.apiSpecifications")
        ? "/specifications"
        : moduleName === t("common.testSuites")
            ? "/test-suites"
            : moduleName === t("common.endpointsManagement")
                ? "/endpoints"
                : undefined;

    return [
        projectsItem,
        projectItem,
        { label: moduleName, href: moduleHref },
        { label: resourceName },
    ];
}
