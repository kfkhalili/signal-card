# **Process for Adding a New Card Type: "Revenue Card" Example**

Adding a new card type to the FinCard Explorer application involves a series of steps to define its data structure, appearance, behavior, and integration with the existing system. This document outlines the process, reflecting the updated generic interaction model, using the "Revenue Card" as an example.

## **1\. Define Core Types & Card-Specific Data Structures**

The first step is to define the necessary TypeScript types.

- **Update Global Card Types** (in `src/components/game/cards/base-card/base-card.types.ts`):

  - Extend the `CardType` union to include the new card type (e.g., `"revenue"`).

- **Update Union Types** (in `src/components/game/types.ts`):

  - Update `ConcreteCardData` and `DisplayableCard` union types to include the new card's data type (e.g., `RevenueCardData`).

- **Create Card-Specific Types** (e.g., in `src/components/game/cards/revenue-card/revenue-card.types.ts`):

  - **External Data Interfaces** (e.g., `RevenueCardFmpIncomeStatementData`): Define interfaces for relevant parts of external data sources (like FMP API payloads) if the card processes complex external data.
  - **`[CardName]StaticData`**: Defines less frequently changing, serializable data specific to the card.
  - **`[CardName]LiveData`**: Defines more frequently updated, serializable data.
  - **`[CardName]Data`**: The main data interface for the new card, extending `BaseCardData`. It includes its specific `staticData` and `liveData`.
  - **`[CardName]Interactions`**: This interface is now deprecated for specific callback props. All interactions are channeled through the generic `OnGenericInteraction` system defined in `base-card.types.ts`.

- **Update Generic Interaction Types** (in `src/components/game/cards/base-card/base-card.types.ts`):

  - If the new card introduces fundamentally new _intents_ for interaction (beyond requesting new cards, navigation, filtering, or custom actions), update the `InteractionIntent` union type.
  - If a new intent requires a unique payload structure, define a new interface (e.g., `[NewIntent]Interaction`) extending `BaseInteraction` and add it to the `InteractionPayload` discriminated union.

## **2\. Implement the Card Initializer**

This asynchronous function fetches initial data and constructs the card object when a user adds it to their workspace.

- **File**: e.g., `src/components/game/cards/revenue-card/revenueCardUtils.ts`
- **Function**: `async function initialize[CardName]Card(context: CardInitializationContext)`
- **Logic**:
  1. Fetch necessary data from Supabase or other sources (e.g., profile info, latest relevant data for the card).
  2. Parse and transform fetched data into the card's `StaticData` and `LiveData` structures.
  3. Construct the full `[CardName]Data` object, including common properties from `BaseCardData` (like `id`, `type`, `symbol`, `companyName`, `logoUrl`, `createdAt`, and `backData`).
  4. Return a `DisplayableCard` object (which includes `isFlipped: false` and the constructed card data) or `null` if initialization fails.
  5. Handle errors gracefully, potentially using the `toast` from the context.
- **Registration**: Register the initializer in `src/components/game/cardInitializer.types.ts` using `registerCardInitializer("[cardType]", initialize[CardName]Card)`.
- **Global Import**: Import the card's utility file (e.g., `revenueCardUtils.ts`) in `src/components/game/cards/initializers.ts` to ensure the registration code executes.

## **3\. Create UI Components for Rendering**

These React components define the card's visual representation and how users interact with its content.

- **`[CardName]Content.tsx`** (e.g., `src/components/game/cards/revenue-card/RevenueCardContent.tsx`):
  - Renders the specific data for the card's front and back faces.
  - Receives `cardData` (the specific `[CardName]Data`) and `onGenericInteraction` as props.
  - Interactive elements within the content (e.g., clickable metrics, links) should call the received `onGenericInteraction` prop with an appropriate `InteractionPayload`.
  - For example, clicking a data row in `RevenueCardContent` that should lead to a Price card dispatches an `InteractionPayload` with `intent: "REQUEST_NEW_CARD"` and `targetCardType: "price"`.
- **`[CardName]Container.tsx`** (e.g., `src/components/game/cards/revenue-card/RevenueCardContainer.tsx`):
  - Acts as a wrapper that utilizes the `BaseCard` component for common UI structure (flippable shell, header, delete functionality).
  - Passes instances of `[CardName]Content` (for front and back faces) to `BaseCard`.
  - Receives `onGenericInteraction` from `GameCard` and passes it down to `BaseCard` and `[CardName]Content`.
  - Does **not** handle card-specific interaction props directly anymore; all interactions are channeled through `onGenericInteraction`.
- **Renderer Registration**: Register `[CardName]Container` in `src/components/game/cardRenderers.ts` using `registerCardRenderer("[cardType]", [CardName]Container)`. The `RegisteredCardRendererProps` type has been updated to remove card-specific interaction bundles.
- **Global Import**: Import the container in `src/components/game/cards/rendererRegistryInitializer.ts`.

## **4\. Implement the Card Rehydrator**

This function reconstructs the card's state from data stored in local storage.

- **File**: e.g., `src/components/game/cards/revenue-card/revenueCardRehydrator.ts`
- **Function**: `rehydrate[CardName]Instance(cardFromStorage: Record<string, unknown>, commonProps: CommonCardPropsForRehydration)`
- **Logic**:
  1. Safely access specific static and live data fields from `cardFromStorage`.
  2. Provide default values for missing or invalid fields to conform to `[CardName]StaticData` and `[CardName]LiveData`.
  3. Reconstruct `backData` with a default or derived description.
  4. Assemble the complete `[CardName]Data` object using the rehydrated data and `commonProps`.
- **Registration**: Register the rehydrator in `src/components/game/cardRehydration.ts` using `registerCardRehydrator("[cardType]", rehydrate[CardName]Instance)`.
- **Global Import**: Import the card's rehydrator file (e.g., `revenueCardRehydrator.ts`) in `src/components/game/cards/rehydrators.ts`.

## **5\. Implement Update Handlers for Real-time Data**

These functions process incoming real-time data changes and update the card's state.

- **Define Event Type(s)**: If the card subscribes to new types of real-time data, add corresponding event types to `CardUpdateEventType` in `src/components/game/cardUpdateHandler.types.ts`. For the Revenue Card, "FINANCIAL_STATEMENT_UPDATE" was added.
- **Create Update Handler(s)** (e.g., in `src/components/game/cards/revenue-card/revenueCardUtils.ts`):
  - **Function Signature**: `CardUpdateHandler<[CardName]Data, [UpdatePayloadType]>`
  - **Logic**:
    1. Compare incoming `updatePayload` with `currentCardConcreteData`.
    2. If an update is necessary, construct and return a new `[CardName]Data` object. Otherwise, return the current data.
    3. The `handleRevenueCardStatementUpdate` function, for instance, compares dates and period relevance before reconstructing the card data.
    4. The `handleRevenueCardProfileUpdate` updates `companyName`, `logoUrl`, and `backData.description` if the profile information changes.
- **Registration**: Register handlers in `src/components/game/cardUpdateHandler.types.ts` using `registerCardUpdateHandler("[cardType]", "[EventType]", handlerFunction)`.
- **Global Import**: Import the card's utility file in `src/components/game/cards/updateHandlerInitializer.ts`.

## **6\. Integrate Real-time Subscriptions (if applicable)**

If the new card type depends on a new real-time data source (like the Revenue Card needing `financial_statements`):

- **`src/lib/supabase/realtime-service.ts`**:
  - Define necessary database row and payload types (e.g., `FinancialStatementDBRow`, `FinancialStatementPayload`).
  - Implement a new subscription function (e.g., `subscribeToFinancialStatementUpdates`).
- **`src/hooks/useStockData.ts`**:
  - Add a new callback prop for the new data type (e.g., `onFinancialStatementUpdate`).
  - Use `useEffect` to manage the lifecycle of the new subscription, calling the function from `realtime-service.ts`.
- **`src/components/workspace/StockDataHandler.tsx`**:
  - Add the new callback prop and pass it to `useStockData`.
- **`src/hooks/useWorkspaceManager.ts`**:
  - Define a handler for the new data type (e.g., `handleFinancialStatementUpdate`).
  - This handler uses `getCardUpdateHandler` to find the appropriate function and update active cards.
  - Add this new handler to the `stockDataCallbacks` object.
- **`src/app/workspace/page.tsx`**:
  - Pass the new callback from `stockDataCallbacks` to `StockDataHandler` instances.

## **7\. Create Storybook Story**

Visualizing and testing the new card in isolation using Storybook.

- **File**: e.g., `src/components/game/cards/revenue-card/RevenueCardContainer.stories.tsx`
- **Setup**:
  - Create mock data for `[CardName]Data`.
  - Use a `[CardName]StoryWrapper` component to manage local state for `isFlipped` and the `currentCardData` being passed to the container.
  - Define stories for different states (e.g., "Default", "Flipped", "MinimalData").
  - Configure `argTypes` for Storybook controls, focusing on props like `initialCardData`, `cardContext`, and `onGenericInteraction`. Card-specific interaction props are no longer part of the container's direct API.

## **8\. Make Card Selectable in UI**

Allow users to add the new card type to their workspace.

- **File**: `src/components/workspace/AddCardForm.tsx`
- **Change**: Add an entry for the new card type to the `AVAILABLE_CARD_TYPES` array (e.g., `{ value: "revenue", label: "Revenue Card" }`).
