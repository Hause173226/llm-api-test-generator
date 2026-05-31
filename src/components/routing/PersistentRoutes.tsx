import React, { useEffect, useRef, useState } from "react";
import { Routes, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getNavSectionKey, updateNavHistory } from "../../utils/navHistory";

type RouterLocation = ReturnType<typeof useLocation>;

type CacheEntry = {
  key: string;
  location: RouterLocation;
};

type CacheRule = {
  pattern: RegExp;
  params: string[];
};

const PUBLIC_PATHS = new Set([
  "/",
  "/product",
  "/intelligence",
  "/enterprise",
  "/pricing",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/payment/result",
  "/payment/cancel",
]);

const CACHE_RULES: CacheRule[] = [
  { pattern: /^\/specifications$/, params: ["projectId"] },
  { pattern: /^\/srs-documents$/, params: ["projectId"] },
  { pattern: /^\/endpoints$/, params: ["projectId", "specId"] },
  { pattern: /^\/test-suites$/, params: ["projectId"] },
  { pattern: /^\/test-suites\/[^/]+$/, params: [] },
  { pattern: /^\/test-suites\/[^/]+\/generating$/, params: [] },
  {
    pattern: /^\/test-suites\/[^/]+\/generation-run$/,
    params: ["projectId", "batchLabel", "generatedAt", "testCaseIds"],
  },
  {
    pattern: /^\/test-suites\/[^/]+\/runs\/start-watch$/,
    params: ["projectId", "environmentId", "testCaseIds"],
  },
  {
    pattern: /^\/test-suites\/[^/]+\/runs\/[^/]+\/watch$/,
    params: ["projectId"],
  },
  {
    pattern: /^\/test-suites\/[^/]+\/test-cases\/[^/]+$/,
    params: ["projectId"],
  },
  { pattern: /^\/studio$/, params: ["projectId"] },
  { pattern: /^\/suggestions$/, params: ["projectId", "suiteId", "runId"] },
  { pattern: /^\/environments$/, params: ["projectId"] },
  { pattern: /^\/runs$/, params: ["projectId", "suiteId"] },
  { pattern: /^\/reports$/, params: ["projectId"] },
  { pattern: /^\/manual-testing$/, params: ["projectId"] },
  { pattern: /^\/traceability$/, params: ["projectId"] },
  { pattern: /^\/test-order-gate$/, params: ["projectId", "suiteId"] },
];

const MAX_CACHE_PAGES = 30;
const NAV_STATE_KEY = "nav-last-locations";

const isPublicPath = (pathname: string) => PUBLIC_PATHS.has(pathname);

const getCacheRule = (pathname: string) =>
  CACHE_RULES.find((rule) => rule.pattern.test(pathname));

const buildCacheKey = (location: RouterLocation) => {
  const rule = getCacheRule(location.pathname);
  if (!rule) {
    return location.pathname;
  }

  if (rule.params.length === 0) {
    return location.pathname;
  }

  const params = new URLSearchParams(location.search);
  const filtered = new URLSearchParams();

  for (const key of rule.params) {
    const value = params.get(key);
    if (value) {
      filtered.set(key, value);
    }
  }

  const query = filtered.toString();
  return query ? `${location.pathname}?${query}` : location.pathname;
};

const shouldCachePath = (pathname: string) => !isPublicPath(pathname);

const loadNavState = (): Record<string, string> => {
  try {
    const raw = sessionStorage.getItem(NAV_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const saveNavState = (next: Record<string, string>) => {
  try {
    sessionStorage.setItem(NAV_STATE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
};

export default function PersistentRoutes({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [entries, setEntries] = useState<CacheEntry[]>(() => {
    if (!shouldCachePath(location.pathname)) {
      return [];
    }
    return [{ key: buildCacheKey(location), location }];
  });
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const nextUserId = isAuthenticated ? (user?.id ?? "unknown") : null;
    if (lastUserIdRef.current !== nextUserId) {
      lastUserIdRef.current = nextUserId;
      setEntries([]);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!shouldCachePath(location.pathname)) {
      return;
    }

    const key = buildCacheKey(location);
    setEntries((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.key === key);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { key, location };
        return next;
      }

      const next = [...prev, { key, location }];
      if (next.length > MAX_CACHE_PAGES) {
        next.shift();
      }
      return next;
    });
  }, [location]);

  useEffect(() => {
    if (!shouldCachePath(location.pathname)) {
      return;
    }

    const sectionKey = getNavSectionKey(location.pathname);
    if (!sectionKey) {
      return;
    }

    const nextLocation = `${location.pathname}${location.search}`;
    const current = loadNavState();
    if (current[sectionKey] === nextLocation) {
      return;
    }

    const next = { ...current, [sectionKey]: nextLocation };
    saveNavState(next);
    updateNavHistory(location.pathname, location.search);
  }, [location]);

  const isCacheable = shouldCachePath(location.pathname);
  const activeKey = isCacheable ? buildCacheKey(location) : null;
  const hasActiveEntry =
    activeKey !== null && entries.some((entry) => entry.key === activeKey);
  const renderEntries =
    activeKey !== null && !hasActiveEntry
      ? [...entries, { key: activeKey, location }]
      : entries;

  return (
    <>
      {renderEntries.length > 0 && (
        <div className="relative min-h-full">
          {renderEntries.map((entry) => {
            const isActive = entry.key === activeKey;
            return (
              <div
                key={entry.key}
                aria-hidden={!isActive}
                style={{
                  position: isActive ? "relative" : "absolute",
                  inset: isActive ? undefined : 0,
                  width: "100%",
                  opacity: isActive ? 1 : 0,
                  visibility: isActive ? "visible" : "hidden",
                  pointerEvents: isActive ? "auto" : "none",
                  transform: isActive ? "translateY(0px)" : "translateY(6px)",
                  transition:
                    "opacity 180ms ease, transform 220ms ease, visibility 180ms ease",
                  willChange: "opacity, transform",
                }}
              >
                <Routes location={entry.location}>{children}</Routes>
              </div>
            );
          })}
        </div>
      )}

      {!isCacheable && <Routes location={location}>{children}</Routes>}
    </>
  );
}
