type SectionHistory = Record<string, string[]>;

type NavSection = {
  key: string;
  pattern: RegExp;
};

const NAV_HISTORY_KEY = "nav-section-history";
const MAX_SECTION_HISTORY = 20;

const NAV_SECTIONS: NavSection[] = [
  { key: "/dashboard", pattern: /^\/dashboard/ },
  { key: "/projects", pattern: /^\/projects|^\/project\// },
  { key: "/specifications", pattern: /^\/specifications/ },
  { key: "/endpoints", pattern: /^\/endpoints/ },
  { key: "/test-suites", pattern: /^\/test-suites/ },
  { key: "/srs-documents", pattern: /^\/srs-documents/ },
  { key: "/traceability", pattern: /^\/traceability/ },
  { key: "/runs", pattern: /^\/suggestions/ },
  { key: "/runs", pattern: /^\/runs/ },
  { key: "/environments", pattern: /^\/environments/ },
  { key: "/reports", pattern: /^\/reports/ },
  { key: "/billing", pattern: /^\/billing/ },
  { key: "/settings", pattern: /^\/settings/ },
  { key: "/help", pattern: /^\/help/ },
  { key: "/manual-testing", pattern: /^\/manual-testing/ },
  { key: "/studio", pattern: /^\/studio/ },
  { key: "/choose-testing", pattern: /^\/choose-testing/ },
];

export const getNavSectionKey = (pathname: string) =>
  NAV_SECTIONS.find((section) => section.pattern.test(pathname))?.key;

const loadNavHistory = (): SectionHistory => {
  try {
    const raw = sessionStorage.getItem(NAV_HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const saveNavHistory = (next: SectionHistory) => {
  try {
    sessionStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
};

export const updateNavHistory = (pathname: string, search: string) => {
  const sectionKey = getNavSectionKey(pathname);
  if (!sectionKey) return;

  const nextLocation = `${pathname}${search}`;
  const current = loadNavHistory();
  const history = current[sectionKey] || [];
  const existingIndex = history.lastIndexOf(nextLocation);

  let nextHistory: string[] = [];
  if (existingIndex >= 0) {
    nextHistory = history.slice(0, existingIndex + 1);
  } else {
    nextHistory = [...history, nextLocation];
    if (nextHistory.length > MAX_SECTION_HISTORY) {
      nextHistory = nextHistory.slice(-MAX_SECTION_HISTORY);
    }
  }

  const next = { ...current, [sectionKey]: nextHistory };
  saveNavHistory(next);
};

export const getSectionBackTarget = (pathname: string, search: string) => {
  const sectionKey = getNavSectionKey(pathname);
  if (!sectionKey) return null;

  const currentLocation = `${pathname}${search}`;
  const history = loadNavHistory()[sectionKey] || [];
  const currentIndex = history.lastIndexOf(currentLocation);

  if (currentIndex > 0) {
    return history[currentIndex - 1];
  }

  if (pathname !== sectionKey) {
    return sectionKey;
  }

  return null;
};
