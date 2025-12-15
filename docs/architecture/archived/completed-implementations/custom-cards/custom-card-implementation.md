# Custom Card Implementation Documentation

## Overview

This document describes the current implementation of the custom card feature in the Tickered workspace. Custom cards allow users to create personalized cards by selecting data items from existing cards and combining them into a single card with a custom narrative and description.

## Current Architecture

### Frontend Components

#### 1. Workspace Page (`src/app/workspace/page.tsx`)
- **"Create Custom" Button**: Toggles selection mode (line 267-278)
- **Selection Mode State**: Managed via `isSelectionMode` from `useWorkspaceManager`
- **CustomCardCreatorPanel**: Dialog component for creating custom cards (line 421-427)
- **Handler Functions**:
  - `handleToggleSelectionMode`: Toggles selection mode on/off
  - `handleOpenCreatorPanel`: Opens the custom card creation dialog
  - `handleCreateCustomCard`: Wrapper that calls `createCustomStaticCard` from hook

#### 2. Custom Card Creator Panel (`src/components/workspace/CustomCardCreatorPanel.tsx`)
- **Purpose**: UI dialog for creating custom cards
- **Inputs**:
  - Narrative (title for front of card)
  - Description (text for back of card)
  - Selected items list (from selection mode)
- **Output**: Calls `onCreateCard` callback with narrative and description

#### 3. Workspace Manager Hook (`src/hooks/useWorkspaceManager.ts`)
- **Selection State Management**:
  - `isSelectionMode`: Boolean state for selection mode
  - `selectedDataItems`: Array of selected data items
  - `handleToggleItemSelection`: Function to toggle item selection
- **Custom Card Creation**:
  - `createCustomStaticCard` (lines 205-244): Core logic for creating custom cards
    - Takes narrative and description as parameters
    - Finds source card from first selected item
    - Creates `CustomCardData` object with:
      - Unique ID (`custom-${Date.now()}`)
      - Type: "custom"
      - Symbol from source card
      - Company metadata from source card
      - Narrative and description
      - Selected items array
    - Adds card to workspace
    - Clears selection state

#### 4. Custom Card Type Definition (`src/components/game/cards/custom-card/custom-card.types.ts`)
```typescript
export interface CustomCardData extends BaseCardData {
  readonly type: "custom";
  readonly narrative: string; // User-defined title
  readonly items: readonly SelectedDataItem[]; // Selected data items
}
```

#### 5. Custom Card Components
- **CustomCardContent** (`src/components/game/cards/custom-card/CustomCardContent.tsx`): Renders custom card UI
- **customCardRehydrator** (`src/components/game/cards/custom-card/customCardRehydrator.ts`): Restores custom cards from localStorage

### Data Flow

1. **User clicks "Create Custom" button**
   - Toggles `isSelectionMode` to `true`
   - Cards become selectable

2. **User selects data items from cards**
   - `handleToggleItemSelection` adds/removes items from `selectedDataItems`
   - Maximum 20 items can be selected

3. **User clicks "Review" button**
   - Opens `CustomCardCreatorPanel` dialog
   - Shows selected items list
   - User enters narrative and description

4. **User clicks "Create Card" in dialog**
   - Calls `handleCreateCustomCard` → `createCustomStaticCard`
   - Custom card is created and added to workspace
   - Selection mode is disabled
   - Selected items are cleared

### Key Dependencies

- **SelectedDataItem Interface** (`useWorkspaceManager.ts`):
  ```typescript
  interface SelectedDataItem {
    id: string;
    sourceCardId: string;
    sourceCardSymbol: string;
    label: string;
    value: string | number | React.ReactNode;
    unit?: string;
    isMonetary?: boolean;
    currency?: string | null;
    isValueAsPercentage?: boolean;
  }
  ```

- **Card State Management**: Custom cards are stored in `activeCards` state and persisted to localStorage
- **Card Rendering**: Custom cards use the same card rendering system as other card types via `rendererRegistryInitializer`

## Backend Logic Isolation Plan

### Current State
- **No backend API exists** for custom card creation
- All logic is client-side in `useWorkspaceManager` hook
- Cards are stored only in localStorage (client-side)

### Proposed Isolation

Extract the custom card creation logic into a separate utility module that:
1. **Separates business logic from UI state management**
2. **Makes the logic reusable** across different contexts
3. **Prepares for potential backend migration** in the future
4. **Maintains type safety** with TypeScript

### New Structure

```
src/lib/custom-cards/
├── createCustomCard.ts          # Core creation logic (pure function)
├── types.ts                     # Type definitions for custom card creation
└── utils.ts                     # Helper utilities
```

## Changes Required

### 1. Remove UI Elements
- Remove "Create Custom" button from workspace page
- Remove selection mode toggle functionality
- Remove CustomCardCreatorPanel usage
- Remove selection-related state from workspace page

### 2. Extract Business Logic
- Move `createCustomStaticCard` logic to `src/lib/custom-cards/createCustomCard.ts`
- Create pure function that takes inputs and returns custom card data
- Remove selection state management from `useWorkspaceManager` (or keep minimal for future use)

### 3. Maintain Card Support
- Keep custom card rendering components (CustomCardContent, rehydrator)
- Keep custom card type definitions
- Ensure existing custom cards continue to work

## Benefits of Isolation

1. **Reusability**: Logic can be used from API routes, Edge Functions, or other contexts
2. **Testability**: Pure functions are easier to unit test
3. **Maintainability**: Clear separation of concerns
4. **Future-Proofing**: Easy to migrate to backend API if needed
5. **Type Safety**: Centralized type definitions

## Migration Notes

- Existing custom cards in localStorage will continue to work
- No data migration needed
- Card rendering system remains unchanged
- Only the creation UI and logic location changes

