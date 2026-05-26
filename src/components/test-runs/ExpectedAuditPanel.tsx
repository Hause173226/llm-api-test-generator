import { AlertTriangle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

type ExpectedSource =
  | "srs"
  | "openapi"
  | "n8n"
  | "business_rule"
  | "observed_response"
  | "ai_inferred"
  | "unknown"
  | string;

export interface ExpectedProvenanceItem {
  field?: string | null;
  expected?: string | null;
  type?: string | null;
  source?: ExpectedSource | null;
  requirementCode?: string | null;
  evidence?: string | null;
  confidence?: "high" | "medium" | "low" | string | null;
}

export interface ExpectedAuditPanelProps {
  title?: string;
  expectedStatus?: unknown;
  bodyContains?: unknown;
  bodyNotContains?: unknown;
  jsonPathChecks?: unknown;
  headerChecks?: unknown;
  variables?: Array<{
    variableName?: string;
    extractFrom?: string;
    jsonPath?: string;
    headerName?: string;
    regex?: string;
  }>;
  maxResponseTime?: number | null;
  expectedProvenance?: unknown;
  expectationSource?: string | null;
  requirementCode?: string | null;
  actualStatusCode?: number | null;
  responseBodyPreview?: string | null;
  responseHeaders?: Record<string, unknown> | null;
  compact?: boolean;
  className?: string;
}

interface AuditItem {
  group: string;
  type: string;
  field: string;
  expected: string;
  provenance?: ExpectedProvenanceItem | null;
}

const parseJson = <T,>(value: unknown): T | null => {
  if (value == null) return null;
  if (typeof value !== "string") return value as T;
  if (!value.trim()) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const toStatusList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "number") return [String(value)];
  if (typeof value === "string") {
    const parsed = parseJson<Array<number | string>>(value);
    if (Array.isArray(parsed)) return parsed.map(String);
    return value.trim() ? [value.trim()] : [];
  }
  return [];
};

const toStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  const parsed = parseJson<string[]>(value);
  return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
};

const toMap = (value: unknown): Record<string, string> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        val == null ? "" : String(val),
      ]),
    );
  }
  return parseJson<Record<string, string>>(value) ?? {};
};

const toProvenance = (value: unknown): ExpectedProvenanceItem[] => {
  if (Array.isArray(value)) return value as ExpectedProvenanceItem[];
  const parsed = parseJson<ExpectedProvenanceItem[]>(value);
  return Array.isArray(parsed) ? parsed : [];
};

const normalizeSource = (source?: string | null) =>
  (source || "unknown").trim().toLowerCase();

const sourceLabel = (source?: string | null) => {
  switch (normalizeSource(source)) {
    case "srs":
      return "Source: SRS";
    case "openapi":
    case "swagger":
      return "Source: OpenAPI";
    case "n8n":
      return "Source: n8n";
    case "business_rule":
    case "businessrule":
      return "Source: Business Rule";
    case "observed_response":
      return "Source: Observed response";
    case "ai_inferred":
    case "llm":
      return "Source: AI inferred";
    default:
      return "Unverified / No evidence";
  }
};

const sourceClass = (source?: string | null, hasEvidence?: boolean) => {
  const normalized = normalizeSource(source);
  if (!hasEvidence || normalized === "unknown") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  }
  if (normalized === "ai_inferred" || normalized === "llm") {
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200";
  }
  if (normalized === "srs") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  }
  if (normalized === "openapi" || normalized === "swagger") {
    return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200";
  }
  if (normalized === "observed_response") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  }
  return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200";
};

const findProvenance = (
  item: AuditItem,
  provenanceItems: ExpectedProvenanceItem[],
): ExpectedProvenanceItem | null => {
  return (
    provenanceItems.find((p) => {
      const typeMatches =
        normalizeSource(p.type) === normalizeSource(item.type) ||
        normalizeSource(p.type) === normalizeSource(item.group);
      const fieldMatches =
        !p.field ||
        p.field === item.field ||
        p.field === item.expected ||
        (item.type === "status" && p.field === "expectedStatus");
      const expectedMatches =
        p.expected == null || String(p.expected) === String(item.expected);
      return typeMatches && fieldMatches && expectedMatches;
    }) ?? null
  );
};

const shouldPreferRuntimeEvidence = (item?: ExpectedProvenanceItem | null) => {
  const source = normalizeSource(item?.source);
  return (
    !item?.evidence ||
    source === "unknown" ||
    source === "ai_inferred" ||
    source === "llm"
  );
};

const tryParseBody = (body?: string | null): unknown => {
  if (!body?.trim()) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
};

const getJsonPathValue = (root: unknown, path: string): unknown => {
  if (!path.startsWith("$.")) return undefined;
  return path
    .slice(2)
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((current, segment) => {
      if (
        !current ||
        typeof current !== "object" ||
        !(segment in (current as Record<string, unknown>))
      ) {
        return undefined;
      }
      return (current as Record<string, unknown>)[segment];
    }, root);
};

const normalizeExpectedValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (normalized === "null") return null;
  if (normalized && !Number.isNaN(Number(normalized)))
    return Number(normalized);
  return value;
};

const buildObservedProvenance = (
  item: AuditItem,
  actualStatusCode?: number | null,
  responseBodyPreview?: string | null,
  responseHeaders?: Record<string, unknown> | null,
): ExpectedProvenanceItem | null => {
  if (
    item.type === "status" &&
    actualStatusCode != null &&
    String(actualStatusCode) === item.expected
  ) {
    return {
      field: item.field,
      expected: item.expected,
      type: item.type,
      source: "observed_response",
      evidence: `Observed HTTP status ${actualStatusCode} in this test run.`,
      confidence: "high",
    };
  }

  if (
    item.type === "bodyContains" &&
    responseBodyPreview?.includes(item.expected)
  ) {
    return {
      field: item.field,
      expected: item.expected,
      type: item.type,
      source: "observed_response",
      evidence: `Observed "${item.expected}" in response body preview from this test run.`,
      confidence: "high",
    };
  }

  if (
    item.type === "bodyNotContains" &&
    responseBodyPreview &&
    !responseBodyPreview.includes(item.expected)
  ) {
    return {
      field: item.field,
      expected: item.expected,
      type: item.type,
      source: "observed_response",
      evidence: `Did not observe "${item.expected}" in response body preview from this test run.`,
      confidence: "medium",
    };
  }

  if (item.type === "jsonPathCheck") {
    const actual = getJsonPathValue(
      tryParseBody(responseBodyPreview),
      item.field,
    );
    const expected = normalizeExpectedValue(item.expected);
    const matches =
      item.expected === "*" ||
      actual === expected ||
      (item.expected === "exists" && actual !== undefined);
    if (matches) {
      return {
        field: item.field,
        expected: item.expected,
        type: item.type,
        source: "observed_response",
        evidence: `Observed ${item.field} = ${JSON.stringify(actual)} in response body from this test run.`,
        confidence: "high",
      };
    }
  }

  if (item.type === "headerCheck" && responseHeaders) {
    const actualHeader = Object.entries(responseHeaders).find(
      ([name]) => name.toLowerCase() === item.field.toLowerCase(),
    )?.[1];
    if (actualHeader != null && String(actualHeader) === item.expected) {
      return {
        field: item.field,
        expected: item.expected,
        type: item.type,
        source: "observed_response",
        evidence: `Observed response header ${item.field} = ${String(actualHeader)} in this test run.`,
        confidence: "high",
      };
    }
  }

  return null;
};

export default function ExpectedAuditPanel({
  title,
  expectedStatus,
  bodyContains,
  bodyNotContains,
  jsonPathChecks,
  headerChecks,
  variables,
  maxResponseTime,
  expectedProvenance,
  expectationSource,
  requirementCode,
  actualStatusCode,
  responseBodyPreview,
  responseHeaders,
  compact = false,
  className,
}: ExpectedAuditPanelProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("testRuns.expectedAudit.title");
  const provenanceItems = toProvenance(expectedProvenance);
  const items: AuditItem[] = [];

  toStatusList(expectedStatus).forEach((status) =>
    items.push({
      group: t("testRuns.expectedAudit.groups.status"),
      type: "status",
      field: "expectedStatus",
      expected: status,
    }),
  );
  toStringList(bodyContains).forEach((text) =>
    items.push({
      group: t("testRuns.expectedAudit.groups.bodyContains"),
      type: "bodyContains",
      field: "bodyContains",
      expected: text,
    }),
  );
  toStringList(bodyNotContains).forEach((text) =>
    items.push({
      group: t("testRuns.expectedAudit.groups.bodyNotContains"),
      type: "bodyNotContains",
      field: "bodyNotContains",
      expected: text,
    }),
  );
  Object.entries(toMap(jsonPathChecks)).forEach(([path, expected]) =>
    items.push({
      group: t("testRuns.expectedAudit.groups.jsonPath"),
      type: "jsonPathCheck",
      field: path,
      expected: expected || "*",
    }),
  );
  Object.entries(toMap(headerChecks)).forEach(([header, expected]) =>
    items.push({
      group: t("testRuns.expectedAudit.groups.headers"),
      type: "headerCheck",
      field: header,
      expected: expected || "*",
    }),
  );
  (variables ?? []).forEach((variable) =>
    items.push({
      group: t("testRuns.expectedAudit.groups.variables"),
      type: "variable",
      field:
        variable.variableName ||
        variable.jsonPath ||
        variable.headerName ||
        "variable",
      expected: [
        variable.extractFrom,
        variable.jsonPath,
        variable.headerName,
        variable.regex,
      ]
        .filter(Boolean)
        .join(" | "),
    }),
  );
  if (maxResponseTime != null) {
    items.push({
      group: t("testRuns.expectedAudit.groups.responseTime"),
      type: "responseTime",
      field: "maxResponseTime",
      expected: `${maxResponseTime} ms`,
    });
  }

  const enriched = items.map((item) => {
    const storedProvenance = findProvenance(item, provenanceItems);
    const observedProvenance = buildObservedProvenance(
      item,
      actualStatusCode,
      responseBodyPreview,
      responseHeaders,
    );
    return {
      ...item,
      provenance:
        shouldPreferRuntimeEvidence(storedProvenance) && observedProvenance
          ? observedProvenance
          : storedProvenance,
    };
  });
  const hasUnverified = enriched.some(
    (item) =>
      !item.provenance ||
      !item.provenance.evidence ||
      normalizeSource(item.provenance.source) === "unknown" ||
      normalizeSource(item.provenance.source) === "ai_inferred" ||
      normalizeSource(item.provenance.source) === "llm",
  );

  if (items.length === 0) {
    return (
      <section
        className={cn(
          "rounded-lg border border-outline-variant/20 p-3 text-xs",
          className,
        )}
      >
        <div className="font-semibold text-on-surface">{resolvedTitle}</div>
        <div className="mt-2 text-on-surface-variant">
          {t("testRuns.expectedAudit.empty")}
        </div>
      </section>
    );
  }

  const groups = Array.from(new Set(enriched.map((item) => item.group)));

  return (
    <section
      className={cn(
        "rounded-lg border border-outline-variant/20 bg-surface-container-lowest dark:bg-slate-900 p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">
          {resolvedTitle}
        </h3>
        {hasUnverified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            <AlertTriangle className="h-3 w-3" />
            {t("testRuns.expectedAudit.reviewRequired")}
          </span>
        )}
      </div>

      {hasUnverified && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t("testRuns.expectedAudit.reviewWarning")}</span>
        </div>
      )}

      <div className={cn("mt-3 space-y-3", compact && "space-y-2")}>
        {groups.map((group) => (
          <div key={group}>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
              {group}
            </div>
            <div className="space-y-1.5">
              {enriched
                .filter((item) => item.group === group)
                .map((item, index) => {
                  const provenance = item.provenance;
                  const source = provenance?.source;
                  const evidence = provenance?.evidence;
                  const code = provenance?.requirementCode || requirementCode;
                  return (
                    <details
                      key={`${group}-${item.field}-${item.expected}-${index}`}
                      className="rounded-md border border-outline-variant/20 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-2 text-xs"
                    >
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-on-surface break-all">
                          {item.field}
                        </span>
                        <span className="text-on-surface-variant">=</span>
                        <span className="font-mono text-[11px] text-on-surface break-all">
                          {item.expected}
                        </span>
                        <span
                          className={cn(
                            "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            sourceClass(source, Boolean(evidence)),
                          )}
                        >
                          {sourceLabel(source)}
                        </span>
                      </summary>
                      <div className="mt-2 space-y-1 border-t border-outline-variant/10 pt-2 text-[11px] text-on-surface-variant">
                        <div>Confidence: {provenance?.confidence || "low"}</div>
                        <div>Requirement: {code || "None provided"}</div>
                        <div>
                          Evidence:{" "}
                          {evidence || "No source provided by backend"}
                        </div>
                        {expectationSource && (
                          <div>
                            Legacy expectation source: {expectationSource}
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
