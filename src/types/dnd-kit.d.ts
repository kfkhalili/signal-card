// Type declarations for @dnd-kit packages
declare module "@dnd-kit/core" {
  import type { ReactNode } from "react";

  export interface DragEndEvent {
    active: { id: string | number };
    over: { id: string | number } | null;
    delta: { x: number; y: number };
    collisions: unknown[] | null;
  }

  export interface DragStartEvent {
    active: { id: string | number };
  }

  export interface DragMoveEvent {
    active: { id: string | number };
    delta: { x: number; y: number };
  }

  export interface DragOverEvent {
    active: { id: string | number };
    over: { id: string | number } | null;
    delta: { x: number; y: number };
  }

  export interface DragCancelEvent {
    active: { id: string | number };
  }

  export interface DndContextProps {
    children: ReactNode;
    sensors?: unknown[];
    collisionDetection?: unknown;
    onDragStart?: (event: DragStartEvent) => void;
    onDragMove?: (event: DragMoveEvent) => void;
    onDragOver?: (event: DragOverEvent) => void;
    onDragEnd?: (event: DragEndEvent) => void;
    onDragCancel?: (event: DragCancelEvent) => void;
  }

  export const DndContext: React.FC<DndContextProps>;
  export const closestCenter: unknown;
  export const KeyboardSensor: unknown;
  export const PointerSensor: unknown;
  export const useSensor: (sensor: unknown, options?: unknown) => unknown;
  export const useSensors: (...sensors: unknown[]) => unknown[];
}

declare module "@dnd-kit/sortable" {
  import type { ReactNode } from "react";

  export interface SortableContextProps {
    children: ReactNode;
    items: (string | number)[];
    strategy?: unknown;
  }

  export const SortableContext: React.FC<SortableContextProps>;
  export const sortableKeyboardCoordinates: unknown;
  export const rectSortingStrategy: unknown;
  export const useSortable: (options: { id: string | number }) => {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown>;
    setNodeRef: (node: HTMLElement | null) => void;
    transform: { x: number; y: number } | null;
    transition: string | undefined;
    isDragging: boolean;
  };
  export const arrayMove: <T>(array: T[], oldIndex: number, newIndex: number) => T[];
}

declare module "@dnd-kit/utilities" {
  export const CSS: {
    Transform: {
      toString: (transform: { x: number; y: number } | null) => string;
    };
  };
}

