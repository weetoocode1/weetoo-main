import { create } from "zustand";

type LeverageStore = {
  pendingLeverage: number;
  setPendingLeverage: (v: number) => void;
  showLeverageModal: boolean;
  setShowLeverageModal: (open: boolean) => void;
  advisorSlPercent: number;
  setAdvisorSlPercent: (v: number) => void;
  riskPercent: number;
  setRiskPercent: (v: number) => void;
  advisorApplied: boolean;
  setAdvisorApplied: (v: boolean) => void;
};

export const useLeverageStore = create<LeverageStore>((set) => ({
  pendingLeverage: 1,
  setPendingLeverage: (v) => set({ pendingLeverage: v }),
  showLeverageModal: false,
  setShowLeverageModal: (open) => set({ showLeverageModal: open }),
  advisorSlPercent: 1.0,
  setAdvisorSlPercent: (v) => set({ advisorSlPercent: v }),
  riskPercent: 1.0,
  setRiskPercent: (v) => set({ riskPercent: v }),
  advisorApplied: false,
  setAdvisorApplied: (v) => set({ advisorApplied: v }),
}));
