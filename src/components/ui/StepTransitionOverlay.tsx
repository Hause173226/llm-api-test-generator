import React from "react";
import GlobalSpinner from "./GlobalSpinner";

interface StepTransitionOverlayProps {
  isVisible: boolean;
  title: string;
  message: string;
  stepLabel?: string;
}

export default function StepTransitionOverlay({
  isVisible,
  title,
  message,
}: StepTransitionOverlayProps) {
  if (!isVisible) return null;

  return <GlobalSpinner label={title} />;
}
