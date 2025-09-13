"use client";

import { suppressLiveKitErrorsGlobally } from "@/lib/livekit-error-handler";
import React, { useEffect } from "react";

interface LiveKitErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Error boundary component that suppresses LiveKit DataChannel errors
 * These errors are non-critical and related to WebRTC data channel setup
 */
export function LiveKitErrorBoundary({ children }: LiveKitErrorBoundaryProps) {
  useEffect(() => {
    // Suppress LiveKit errors globally when this component mounts
    const cleanup = suppressLiveKitErrorsGlobally();

    return () => {
      // Restore original error handling when component unmounts
      cleanup();
    };
  }, []);

  return <>{children}</>;
}
