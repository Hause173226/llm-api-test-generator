import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export default function NoProjectSelected() {
  return (
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
  );
}
