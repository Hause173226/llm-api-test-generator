import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { ManualTestingProvider } from "../features/manual-testing/contexts/ManualTestingContext";
import { EnvironmentProvider } from "../features/manual-testing/contexts/EnvironmentContext";
import RequestBuilder from "../features/manual-testing/components/RequestBuilder";
import ResponseViewer from "../features/manual-testing/components/ResponseViewer";

const ManualTestingPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || undefined;

  return (
    <ManualTestingProvider>
      <EnvironmentProvider projectId={projectId}>
        <MainLayout title={t("manualTesting.title")}>
          <div className="space-y-5 mt-2">
            <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base">
                  {t("manualTesting.subtitle")}
                </p>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  API Workspace
                </span>
              </div>
            </div>

            <main className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm">
              <RequestBuilder />
              <div className="mt-7 pt-6 border-t border-slate-200/70 dark:border-slate-800">
                <ResponseViewer />
              </div>
            </main>
          </div>
        </MainLayout>
      </EnvironmentProvider>
    </ManualTestingProvider>
  );
};

export default ManualTestingPage;
