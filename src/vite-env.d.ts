/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SIGNALR_HUB_URL?: string;
  readonly VITE_SPLINE_SCENE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
