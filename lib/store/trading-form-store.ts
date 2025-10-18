import { create } from "zustand";

type OrderSide = "long" | "short";
type OrderType = "limit" | "market";

export type ConfirmSnapshot = {
  entryPrice: number;
  quantity: number;
  amount: number;
  leverage: number;
  orderType: OrderType;
  side: OrderSide;
  symbol: string;
  marketAtOpen?: number;
  balanceAtOpen?: number;
} | null;

type TradingFormState = {
  orderQuantity: string;
  setOrderQuantity: (v: string) => void;
  orderPrice: string;
  setOrderPrice: (v: string) => void;
  orderAmount: string;
  setOrderAmount: (v: string) => void;
  orderSide: OrderSide;
  setOrderSide: (s: OrderSide) => void;
  tpOnEntryPercent: string;
  setTpOnEntryPercent: (v: string) => void;
  slOnEntryPercent: string;
  setSlOnEntryPercent: (v: string) => void;
  confirmSnapshot: ConfirmSnapshot;
  setConfirmSnapshot: (s: ConfirmSnapshot) => void;
};

export const useTradingFormStore = create<TradingFormState>((set) => ({
  orderQuantity: "",
  setOrderQuantity: (v) => set({ orderQuantity: v }),
  orderPrice: "",
  setOrderPrice: (v) => set({ orderPrice: v }),
  orderAmount: "",
  setOrderAmount: (v) => set({ orderAmount: v }),
  orderSide: "long",
  setOrderSide: (s) => set({ orderSide: s }),
  tpOnEntryPercent: "",
  setTpOnEntryPercent: (v) => set({ tpOnEntryPercent: v }),
  slOnEntryPercent: "",
  setSlOnEntryPercent: (v) => set({ slOnEntryPercent: v }),
  confirmSnapshot: null,
  setConfirmSnapshot: (s) => set({ confirmSnapshot: s }),
}));
