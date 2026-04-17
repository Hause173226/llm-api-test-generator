import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface Project {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  workspaceMode?: "Manual" | "Automated";
}

interface ProjectContextType {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  clearSelectedProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(
    null,
  );

  // Load selected project from localStorage on mount
  useEffect(() => {
    const savedProject = localStorage.getItem("selectedProject");
    if (savedProject) {
      try {
        const parsed = JSON.parse(savedProject);

        // Workaround: Remove trailing 'b' from ID if exists
        if (
          parsed &&
          parsed.id &&
          typeof parsed.id === "string" &&
          parsed.id.endsWith("b")
        ) {
          console.warn(
            "ProjectContext - Found trailing 'b' in project ID, removing it",
          );
          parsed.id = parsed.id.slice(0, -1);
          // Save the corrected version back to localStorage
          localStorage.setItem("selectedProject", JSON.stringify(parsed));
        }

        setSelectedProjectState(parsed);
      } catch (err) {
        console.error("Failed to parse selected project:", err);
        localStorage.removeItem("selectedProject");
      }
    }
  }, []);

  const setSelectedProject = (project: Project | null) => {
    // Workaround: Remove trailing 'b' from ID if exists
    if (
      project &&
      project.id &&
      typeof project.id === "string" &&
      project.id.endsWith("b")
    ) {
      console.warn(
        "ProjectContext - Found trailing 'b' in project ID, removing it",
      );
      project = { ...project, id: project.id.slice(0, -1) };
    }

    setSelectedProjectState(project);
    if (project) {
      localStorage.setItem("selectedProject", JSON.stringify(project));
    } else {
      localStorage.removeItem("selectedProject");
    }
  };

  const clearSelectedProject = () => {
    setSelectedProjectState(null);
    localStorage.removeItem("selectedProject");
  };

  return (
    <ProjectContext.Provider
      value={{
        selectedProject,
        setSelectedProject,
        clearSelectedProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
