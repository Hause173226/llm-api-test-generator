import React from "react";

interface StepTransitionOverlayProps {
  isVisible: boolean;
  title: string;
  message: string;
  stepLabel?: string;
}

const SPLINE_SCENE_URL =
  import.meta.env.VITE_SPLINE_SCENE_URL ||
  "https://prod.spline.design/tdcIufnnJhSvzWrg/scene.splinecode";

export default function StepTransitionOverlay({
  isVisible,
  title,
  message,
}: StepTransitionOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative h-[300px] w-[320px] md:h-[340px] md:w-[420px]">
        <div className="absolute bottom-0 right-0 h-[220px] w-[220px] md:h-[260px] md:w-[260px] overflow-hidden">
          <spline-viewer
            url={SPLINE_SCENE_URL}
            className="absolute -left-[8%] -top-[5%] h-[112%] w-[112%]"
          />
        </div>

        <div className="absolute top-2 right-12 md:right-24 max-w-[250px] md:max-w-[300px]">
          <div className="bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 shadow-2xl">
            <p className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              {title}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
              {message}
            </p>
          </div>
          <div className="absolute right-6 -bottom-2 w-4 h-4 rotate-45 bg-white/95 dark:bg-slate-800/95 border-r border-b border-slate-200 dark:border-slate-700" />
        </div>
      </div>
    </div>
  );
}
