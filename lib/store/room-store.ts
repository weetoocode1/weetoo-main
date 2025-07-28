import { create } from "zustand";

interface RoomState {
  isRoomOpen: boolean;
  setIsRoomOpen: (isOpen: boolean) => void;
}

export const useRoomStore = create<RoomState>()((set) => ({
  isRoomOpen: false,
  setIsRoomOpen: (isOpen: boolean) => set({ isRoomOpen: isOpen }),
}));
