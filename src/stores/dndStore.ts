// src/stores/dndStore.ts
import { create } from 'zustand';

interface DndState {
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
}

export const useDndStore = create<DndState>((set) => ({
  isDragging: false,
  setIsDragging: (isDragging) => set({ isDragging }),
}));