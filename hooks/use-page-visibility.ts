import { useState, useEffect } from "react";

export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      setIsDocumentVisible(visible);
    };

    const handleFocus = () => {
      setIsVisible(true);
    };

    const handleBlur = () => {
      setIsVisible(false);
    };

    // Initial state
    setIsVisible(!document.hidden);
    setIsDocumentVisible(!document.hidden);

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return { isVisible, isDocumentVisible };
}
