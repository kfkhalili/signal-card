# **Process for Adding a New Card Type: "Revenue Card" Example**

Adding a new card type to the FinCard Explorer application involves a series of steps to define its data structure, appearance, behavior, and integration with the existing system. This document outlines the process followed for the "Revenue Card," which displays key financial metrics from a company's income and cash flow statements.

## **1\. Define Core Types & Card-Specific Data Structures**

The first step is to define the necessary TypeScript types.

- **Update Global Card Types**:
  - The main CardType union (in src/components/game/cards/base-card/base-card.types.ts) was extended to include "revenue".
  - The ConcreteCardData and DisplayableCard union types (in src/components/game/types.ts) were updated to include the new RevenueCardData type.
- **Create Card-Specific Types (src/components/game/cards/revenue-card/revenue-card.types.ts)**:
  - **RevenueCardFmpIncomeStatementData & RevenueCardFmpCashFlowData**: Interfaces to represent the relevant fields parsed from the income_statement_payload and cash_flow_payload JSONB columns in the financial_statements Supabase table. These include fields like revenue, grossProfit, operatingIncome, netIncome, and freeCashFlow, along with contextual data like date, period, reportedCurrency, etc.
  - **RevenueCardStaticData**: Defines less frequently changing data for the card, such as a formatted periodLabel (e.g., "FY2023"), reportedCurrency, filingDate, acceptedDate, statementDate, and statementPeriod.
  - **RevenueCardLiveData**: Holds the actual financial figures that will be displayed and potentially updated: revenue, grossProfit, operatingIncome, netIncome, and freeCashFlow.
  - **RevenueCardData**: The main data interface for the revenue card, extending BaseCardData (which includes id, type, symbol, companyName, logoUrl, createdAt, backData). It includes staticData and liveData.
  - **RevenueCardInteractions**: An interface for any interactions specific to this card type (initially empty).

## **2\. Implement the Card Initializer**

This function is responsible for fetching initial data and constructing the card object when a user adds it to their workspace.

- **File**: src/components/game/cards/revenue-card/revenueCardUtils.ts
- **Function**: async function initializeRevenueCard(context: CardInitializationContext)
- **Logic**:
  1. Fetches company_name and image (logo URL) from the public.profiles table for the given symbol. This ensures the card header has appropriate display information from the start. If profile data is not found, it defaults companyName to the symbol and logoUrl to null.
  2. Fetches the latest financial statement record from the public.financial_statements table for the symbol, ordering by date and then period to get the most recent and comprehensive data.
  3. If statement data is found:
     - Parses the income_statement_payload and cash_flow_payload.
     - Constructs RevenueCardStaticData and RevenueCardLiveData using the fetched and parsed data.
     - Uses a helper function (constructRevenueCardData) to assemble the full RevenueCardData object, incorporating the profile information for companyName and logoUrl.
     - Creates the DisplayableRevenueCard object, setting isFlipped: false.
  4. If no statement data is found, it informs the user via a toast and returns null.
  5. Handles any errors during the process, showing a toast message.
- **Registration**: The initializeRevenueCard function is registered with the system using registerCardInitializer("revenue", initializeRevenueCard).
- **Global Import**: revenueCardUtils.ts is imported in src/components/game/cards/initializers.ts to ensure the registration code runs.

## **3\. Create UI Components for Rendering**

These React components define how the card looks and feels.

- **RevenueCardContent.tsx (src/components/game/cards/revenue-card/RevenueCardContent.tsx)**:
  - Displays the financial data for both front and back faces.
  - Uses a reusable DataRow sub-component for consistent formatting of label-value pairs.
  - **Front Face**: Shows a Badge with the periodLabel. Displays "Revenue" (with a larger label and value size for prominence), "Gross Profit", "Operating Income", "Net Income", and "Free Cash Flow". Each data row is interactive, triggering a generic interaction to request a "price" card for the symbol. Hover effects change text color to primary (no background change). Currency symbol "$" is used for "USD".
  - **Back Face**: Shows the card's backData.description. Displays metadata: Period, Currency, Statement Date, Filing Date, and Accepted Date. Financial figures are not repeated on the back.
- **RevenueCardContainer.tsx (src/components/game/cards/revenue-card/RevenueCardContainer.tsx)**:
  - A wrapper component that uses the BaseCard component for the common card shell (flippable structure, header, delete button).
  - Passes instances of RevenueCardContent (configured for front and back) to BaseCard.
  - Manages props and context for BaseCard.
- **Renderer Registration**: The RevenueCardContainer is registered in src/components/game/cards/rendererRegistryInitializer.ts using registerCardRenderer("revenue", RevenueCardContainer).

## **4\. Implement the Card Rehydrator**

This function reconstructs the card's state from data stored in local storage when the application loads.

- **File**: src/components/game/cards/revenue-card/revenueCardRehydrator.ts
- **Function**: rehydrateRevenueCardInstance(cardFromStorage, commonProps)
- **Logic**:
  1. Safely accesses staticData and liveData from the raw cardFromStorage object.
  2. Provides default values (e.g., null, "N/A") for each field if it's missing or invalid in the stored data, ensuring the rehydrated object conforms to RevenueCardStaticData and RevenueCardLiveData.
  3. Reconstructs backData with a default description if necessary.
  4. Assembles the complete RevenueCardData object using the parsed data and the commonProps (which include id, symbol, createdAt, companyName, logoUrl, isFlipped).
- **Registration**: Registered using registerCardRehydrator("revenue", rehydrateRevenueCardInstance).
- **Global Import**: revenueCardRehydrator.ts is imported in src/components/game/cards/rehydrators.ts.

## **5\. Implement Update Handlers for Real-time Data**

These functions process incoming data changes and update the card's state.

- **Define New Event Type**: "FINANCIAL_STATEMENT_UPDATE" was added to CardUpdateEventType in src/components/game/cardUpdateHandler.types.ts.
- **Financial Statement Update Handler (revenueCardUtils.ts)**:
  - **Function**: handleRevenueCardStatementUpdate(currentCardData, newFinancialStatementRow, context)
  - **Trigger**: Real-time updates from the financial_statements table.
  - **Logic**:
    1. Compares the incoming newFinancialStatementRow's date, period, and accepted_date with the currentRevenueCardData.
    2. Determines if the new statement is more recent or more relevant (e.g., "FY" preferred over "Q4" for the same year-end date).
    3. If an update is warranted, it reconstructs the RevenueCardData using the constructRevenueCardData helper, preserving the card's id, existing companyName, and logoUrl, but updating staticData, liveData, backData.description, and createdAt.
    4. Shows a toast notification about the update.
  - **Registration**: Registered for the "revenue" card type and "FINANCIAL_STATEMENT_UPDATE" event.
- **Profile Info Update Handler (revenueCardUtils.ts)**:
  - **Function**: handleRevenueCardProfileUpdate(currentCardData, profilePayload, context)
  - **Trigger**: Real-time updates from the profiles table (via useStockData).
  - **Logic**:
    1. Compares the incoming profilePayload's company_name and image with the currentRevenueCardData.
    2. If there's a change, it updates the companyName and logoUrl on the RevenueCardData.
    3. Also updates the backData.description if it contained the company name.
  - **Registration**: Registered for the "revenue" card type and "STATIC_PROFILE_UPDATE" event.
- **Global Import**: revenueCardUtils.ts (which now contains these handlers) is imported in src/components/game/cards/updateHandlerInitializer.ts.

## **6\. Integrate Real-time Subscriptions**

This involves modifying several hooks and components to listen for and propagate financial statement updates.

- **src/lib/supabase/realtime-service.ts**:
  - Added FinancialStatementDBRow and FinancialStatementPayload types.
  - Implemented subscribeToFinancialStatementUpdates(symbol, onData, onStatusChange) function to subscribe to changes on the financial_statements table for a specific symbol.
- **src/hooks/useStockData.ts**:
  - Added an onFinancialStatementUpdate?: (statement: FinancialStatementDBRow) \=\> void prop to its interface.
  - Added a useEffect hook to call subscribeToFinancialStatementUpdates when the symbol or onFinancialStatementUpdate callback changes.
  - When new statement data is received via the subscription, it calls the onFinancialStatementUpdate callback.
  - Manages the lifecycle (subscribe/unsubscribe) of this new subscription.
- **src/components/workspace/StockDataHandler.tsx**:
  - Added the onFinancialStatementUpdate prop to its interface.
  - Passes this prop down to the useStockData hook.
- **src/hooks/useWorkspaceManager.ts**:
  - Defined a handleFinancialStatementUpdate(updatedStatementDBRow) callback. This function:
    - Identifies active "revenue" cards for the relevant symbol.
    - Uses getCardUpdateHandler("revenue", "FINANCIAL_STATEMENT_UPDATE") to get the specific handler.
    - Calls the handler to update the card's data if necessary.
    - Updates the activeCards state.
  - Ensured handleStaticProfileUpdate also iterates and applies updates to "revenue" cards if their companyName or logoUrl needs changing based on a profile update.
  - Added onFinancialStatementUpdate: handleFinancialStatementUpdate to the stockDataCallbacks object returned by the hook.
- **src/app/workspace/page.tsx**:
  - When rendering StockDataHandler components, it now passes stockDataCallbacks.onFinancialStatementUpdate as the onFinancialStatementUpdate prop.

## **7\. Create Storybook Story**

To visualize and test the card in isolation.

- **File**: src/components/game/cards/revenue-card/RevenueCardContainer.stories.tsx
- **Setup**:
  - Created mock data for RevenueCardData (including staticData, liveData, backData).
  - Used a RevenueCardStoryWrapper component to manage the local isFlipped state for Storybook controls, similar to other card stories.
  - Defined stories for "Default", "Flipped", and "MinimalData" states.
  - Configured argTypes for Storybook controls.

## **8\. Make Card Selectable in UI**

The final step to allow users to add the new card.

- **File**: src/components/workspace/AddCardForm.tsx
- **Change**: Added { value: "revenue", label: "Revenue Card" } to the AVAILABLE_CARD_TYPES array. This makes "Revenue Card" an option in the "Add New Card" dialog.

This comprehensive process ensures that the new "Revenue Card" is fully defined, renderable, updatable via real-time events, persistable, and user-selectable within the application.
