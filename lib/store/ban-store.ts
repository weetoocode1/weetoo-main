import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BanInfo {
  reason: string;
  bannedAt: string; // ISO string
}

interface BanState {
  isBanned: boolean;
  info: BanInfo | null;
  openBan: (info: BanInfo) => void;
  closeBan: () => void;
}

export const useBanStore = create<BanState>()(
  persist(
    (set) => ({
      isBanned: false,
      info: null,
      openBan: (info: BanInfo) => set({ isBanned: true, info }),
      closeBan: () => set({ isBanned: false, info: null }),
    }),
    {
      name: "ban-state",
      partialize: (state) => ({ isBanned: state.isBanned, info: state.info }),
    }
  )
);
