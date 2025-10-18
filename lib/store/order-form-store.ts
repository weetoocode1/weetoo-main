import { create } from "zustand";

type OrderType = "limit" | "market";

type OrderFormStore = {
  orderType: OrderType;
  setOrderType: (t: OrderType) => void;
};

export const useOrderFormStore = create<OrderFormStore>((set) => ({
  orderType: "limit",
  setOrderType: (t) => set({ orderType: t }),
}));
