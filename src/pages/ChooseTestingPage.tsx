import React from "react";
import MainLayout from "../components/layout/MainLayout";
import { useNavigate } from "react-router-dom";
import { Play, Terminal, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ChooseTestingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <MainLayout title={t("pages.ChooseTestingPage.select_testing_mode")}>
      <div>
        {/* Overlay: white in light mode, black in dark mode */}
        <div className="fixed inset-0 z-40 bg-white/60 dark:bg-black/50 backdrop-blur-sm" />

        {/* Modal container centered */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="flex flex-col sm:flex-row gap-8 items-stretch max-w-5xl w-full justify-center">
            <div className="w-full sm:w-96 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Play className="w-7 h-7 text-indigo-600" />
                <h3 className="text-lg font-bold">
                  {t("pages.ChooseTestingPage.automated_api_testing")}
                </h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex-1">
                {t(
                  "pages.ChooseTestingPage.schedule_and_run_automated_api_test_suit",
                )}
              </p>
              <div className="mt-6 text-right">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition"
                >
                  {t("pages.ChooseTestingPage.go_to_automated")}
                </button>
              </div>
            </div>

            <div className="w-full sm:w-96 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Terminal className="w-7 h-7 text-indigo-600" />
                <h3 className="text-lg font-bold">
                  {t("pages.ChooseTestingPage.manual_testing")}
                </h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex-1">
                {t(
                  "pages.ChooseTestingPage.interactively_send_http_requests_inspect",
                )}
              </p>
              <div className="mt-6 text-right">
                <button
                  onClick={() => navigate("/manual-testing")}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition"
                >
                  {t("pages.ChooseTestingPage.go_to_manual")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
