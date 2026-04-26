import React, { useEffect, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useProject } from "../contexts/ProjectContext";
import { useProjectBreadcrumbs } from "../hooks/useProjectBreadcrumbs";
import { useTestSuites } from "../hooks/useTestSuites";
import { srsService } from "../services/srsService";
import { handleError } from "../utils/errorHandler";
import { Loader2, ShieldCheck } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function TraceabilityPage() {
  const { selectedProject } = useProject();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const suiteId = searchParams.get("suiteId") || "";
  const projectId = selectedProject?.id || "";
  const breadcrumbs = useProjectBreadcrumbs("Traceability");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { testSuites, isLoading: suitesLoading } = useTestSuites(projectId);

  useEffect(() => {
    if (!projectId || !suiteId) return;
    (async () => {
      try {
        setLoading(true);
        const result = await srsService.getTraceability(projectId, suiteId);
        setData(result);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, suiteId]);

  return (
    <MainLayout title="Traceability" breadcrumbs={breadcrumbs}>
      <div className="space-y-8 pb-8">
        <section className="rounded-[2rem] border border-outline-variant/10 bg-gradient-to-br from-emerald-600 via-slate-900 to-slate-950 text-white p-6 md:p-8 shadow-2xl shadow-emerald-950/20">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5" />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                Coverage report
              </p>
              <h1 className="text-3xl md:text-4xl font-black">
                Requirement to Test Case Traceability
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-white/80">
            View the coverage matrix for requirements, review status, and linked
            test cases.
          </p>
        </section>

        {!suiteId ? (
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-8 space-y-4">
            <p className="text-on-surface font-semibold">
              Select a test suite to view traceability
            </p>
            {suitesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              </div>
            ) : testSuites.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No test suites found for this project.
              </p>
            ) : (
              <select
                className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value)
                    navigate(`/traceability?suiteId=${e.target.value}`);
                }}
              >
                <option value="" disabled>
                  Choose a test suite…
                </option>
                {testSuites.map((suite: any) => (
                  <option key={suite.id} value={suite.id}>
                    {suite.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : loading ? (
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : !data ? (
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-8 text-on-surface-variant">
            No traceability data loaded.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                  Total
                </p>
                <p className="mt-2 text-3xl font-black text-on-surface">
                  {data.totalRequirements}
                </p>
              </div>
              <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                  Covered
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-700">
                  {data.coveredRequirements}
                </p>
              </div>
              <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                  Uncovered
                </p>
                <p className="mt-2 text-3xl font-black text-rose-700">
                  {data.uncoveredRequirements}
                </p>
              </div>
              <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5">
                <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                  Coverage
                </p>
                <p className="mt-2 text-3xl font-black text-on-surface">
                  {data.coveragePercent}%
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {(data.requirements || []).map((row: any) => (
                <div
                  key={row.requirementId}
                  className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                          {row.requirementCode}
                        </span>
                        {row.requirementType != null && (
                          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                            {[
                              "Functional",
                              "NonFunctional",
                              "Security",
                              "Performance",
                              "Constraint",
                            ][row.requirementType] ??
                              `Type ${row.requirementType}`}
                          </span>
                        )}
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                          {row.isReviewed ? "Reviewed" : "Pending review"}
                        </span>
                        <span
                          className={
                            row.isCovered
                              ? "rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
                              : "rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700"
                          }
                        >
                          {row.isCovered ? "Covered" : "Uncovered"}
                        </span>
                      </div>
                      <h2 className="mt-3 text-lg font-bold text-on-surface">
                        {row.title}
                      </h2>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        Confidence score: {row.confidenceScore ?? "-"}
                      </p>
                    </div>
                    <div className="text-sm text-on-surface-variant">
                      Requirement ID: {row.requirementId}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {(row.testCases || []).map((tc: any) => (
                      <div
                        key={tc.testCaseId}
                        className="rounded-2xl bg-surface-container-low p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-on-surface">
                              {tc.testCaseName}
                            </p>
                            {tc.mappingRationale && (
                              <p className="mt-1 text-sm text-on-surface-variant">
                                {tc.mappingRationale}
                              </p>
                            )}
                          </div>
                          <div className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                            {tc.traceabilityScore ?? "-"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
