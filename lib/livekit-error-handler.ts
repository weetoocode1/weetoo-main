/**
 * LiveKit Error Handler Utility
 *
 * This utility provides functions to suppress non-critical LiveKit errors
 * that are commonly seen in WebRTC implementations but don't affect functionality.
 * Includes DataChannel errors, signaling errors, and other WebRTC-related issues.
 */

let originalConsoleError: typeof console.error | null = null;

/**
 * Suppresses LiveKit errors from appearing in the console.
 * These errors are typically non-critical and related to WebRTC setup, data channels, and signaling.
 */
export function suppressLiveKitDataChannelErrors() {
  if (originalConsoleError) return; // Already suppressed

  originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString() || "";

    // Suppress specific LiveKit data channel errors
    if (
      message.includes("Unknown DataChannel error on reliable") ||
      message.includes("Unknown DataChannel error on lossy") ||
      message.includes("DataChannel error") ||
      message.includes("WebRTC data channel error") ||
      message.includes("RTCEngine.handleDataError") ||
      message.includes("DataChannel error on") ||
      message.includes("error sending signal message") ||
      message.includes("signal message") ||
      message.includes("signaling error") ||
      message.includes("WebRTC signaling error") ||
      // Additional patterns for LiveKit errors
      (message.includes("DataChannel") && message.includes("error")) ||
      (message.includes("WebRTC") &&
        message.includes("DataChannel") &&
        message.includes("error")) ||
      (message.includes("signal") && message.includes("error")) ||
      (message.includes("signaling") && message.includes("error"))
    ) {
      // These errors are non-critical and can be safely suppressed
      return;
    }

    // Pass through all other errors
    originalConsoleError!.apply(console, args);
  };
}

/**
 * Restores the original console.error function.
 * Call this when cleaning up LiveKit connections.
 */
export function restoreConsoleError() {
  if (originalConsoleError) {
    console.error = originalConsoleError;
    originalConsoleError = null;
  }
}

/**
 * Creates a cleanup function that restores console.error when called.
 * Useful for useEffect cleanup functions.
 */
export function createLiveKitCleanup() {
  suppressLiveKitDataChannelErrors();

  return () => {
    restoreConsoleError();
  };
}

/**
 * Enhanced error suppression that also handles window error events
 * for LiveKit errors that might bypass console.error
 */
export function suppressLiveKitErrorsGlobally() {
  suppressLiveKitDataChannelErrors();

  // Also suppress window error events for LiveKit errors
  const originalWindowError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const errorMessage = message?.toString() || "";

    // Suppress LiveKit DataChannel errors from window error events
    if (
      errorMessage.includes("Unknown DataChannel error") ||
      errorMessage.includes("DataChannel error") ||
      errorMessage.includes("RTCEngine.handleDataError") ||
      errorMessage.includes("error sending signal message") ||
      errorMessage.includes("signal message") ||
      errorMessage.includes("signaling error") ||
      errorMessage.includes("WebRTC signaling error") ||
      (errorMessage.includes("DataChannel") &&
        errorMessage.includes("error")) ||
      (errorMessage.includes("signal") && errorMessage.includes("error")) ||
      (errorMessage.includes("signaling") && errorMessage.includes("error"))
    ) {
      return true; // Prevent default error handling
    }

    // Pass through other errors
    if (originalWindowError) {
      return originalWindowError(message, source, lineno, colno, error);
    }
    return false;
  };

  return () => {
    restoreConsoleError();
    window.onerror = originalWindowError;
  };
}

/**
 * Debug function to log LiveKit errors instead of suppressing them
 * Useful for development to understand what errors are occurring
 */
export function debugLiveKitErrors() {
  if (originalConsoleError) return; // Already set up

  originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString() || "";

    // Check if this is a LiveKit error
    const isLiveKitError =
      message.includes("Unknown DataChannel error") ||
      message.includes("DataChannel error") ||
      message.includes("RTCEngine.handleDataError") ||
      message.includes("error sending signal message") ||
      message.includes("signal message") ||
      message.includes("signaling error") ||
      message.includes("WebRTC signaling error") ||
      (message.includes("DataChannel") && message.includes("error")) ||
      (message.includes("signal") && message.includes("error")) ||
      (message.includes("signaling") && message.includes("error"));

    if (isLiveKitError) {
      // Log with special prefix for debugging
      console.warn("🔇 [LiveKit Debug] Suppressed error:", ...args);
      return;
    }

    // Pass through other errors
    originalConsoleError!.apply(console, args);
  };
}
