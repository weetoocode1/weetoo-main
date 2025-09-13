import { useEffect, useState } from "react";

export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure hydration is completely stable
    const timeoutId = setTimeout(() => {
      setIsHydrated(true);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, []);

  return isHydrated;
}
