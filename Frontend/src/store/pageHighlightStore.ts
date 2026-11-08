import { create } from "zustand";

export const usePageHighlightStore = create<{ expanded: boolean; toggle: () => void }>((set) => ({
  expanded: true,
  toggle: () => set((state) => ({ expanded: !state.expanded })),
}));
