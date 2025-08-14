import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CachedUserData {
  fullName: string;
  avatarUrl: string;
  role: string;
  roleLabel: string;
  lastUpdated: number;
}

interface UserCacheState {
  cachedUser: CachedUserData | null;
  setCachedUser: (userData: CachedUserData) => void;
  clearCache: () => void;
  isStale: () => boolean;
  forceRefresh: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useUserCache = create<UserCacheState>()(
  persist(
    (set, get) => ({
      cachedUser: null,
      setCachedUser: (userData: CachedUserData) =>
        set({ cachedUser: userData }),
      clearCache: () => set({ cachedUser: null }),
      isStale: () => {
        const { cachedUser } = get();
        if (!cachedUser) return true;
        return Date.now() - cachedUser.lastUpdated > CACHE_DURATION;
      },
      // Force refresh cache - useful for admin operations
      forceRefresh: () => set({ cachedUser: null }),
    }),
    {
      name: "user-cache",
      partialize: (state) => ({ cachedUser: state.cachedUser }),
    }
  )
);
