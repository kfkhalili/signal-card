# Executive Summary: Tickered

## 1. Introduction & Core Concept

Tickered is a forthcoming web application designed to revolutionize financial education and investment analysis. It transforms complex financial data into an interactive, digestible, and engaging experience through a unique "Card-based" system. Users can explore stocks, cryptocurrencies, and other financial instruments by interacting with over 100 distinct types of dynamic "Financial Cards" (e.g., Company Profile, Price, Earnings, Volume, Dividends, Sentiment, News), each powered by live data.

## 2. Problem Addressed

Traditional financial information platforms often overwhelm users, especially beginners, with vast amounts of non-contextualized data. This creates a steep learning curve and can make investment analysis feel boring, inaccessible, and isolating. There's a lack of intuitive tools that blend deep data exploration with community insights and personalized learning paths.

## 3. Our Solution – Interactive & Social Financial Cards

Tickered addresses these challenges by offering:

- **Modular Card System:** Users build personalized dashboards by adding various Financial Cards to a dynamic workspace. Each card displays self-contained, live-updated information.
- **Deep Interactivity:** Metrics within cards (e.g., current price, 52-week high/low, SMA 50) are clickable, instantly generating new, related cards in the workspace, allowing for intuitive drill-down and discovery.
- **Sleek, User-Centric Design:** The interface is designed to be minimalist, visualization-rich, and gamified, leveraging modern UI components for an engaging financial exploration experience.

## 4. Target Audience

Tickered caters to two primary user groups:

- **Beginner Investors:** Individuals seeking to learn about investing and understand market data without being overwhelmed. They benefit from the simplified card format and community insights.
- **Professionals & Experienced Investors:** Users who require powerful tools for in-depth financial metric exploration, company comparisons, and the creation of sophisticated, shareable dashboards and "Collections."

## 5. Unique Selling Proposition (USP)

- **Novel Exploration Method:** An intuitive and engaging way to navigate complex financial data through interactive, self-contained cards.
- **Personalized & Dynamic Dashboards:** Users tailor their workspace to their specific interests with live data updates.
- **Dual Audience Appeal:** Simplifies complexity for beginners while offering depth and customization for professionals.

## 6. Business Model

Tickered will operate on a freemium model with revenue generated through:

- **Premium Subscriptions:** Features like multiple workspaces, public dashboard publishing, custom entry cards, and potentially advanced analytics.

## 7. Technical Architecture & Development Status

The application is currently in the development phase, being built with a modern, robust technology stack. This section provides a deeper overview of its components and interactions.

### 7.1 Core Technologies

- **Frontend & UI:**
  - **Framework:** Next.js 15 (App Router, React Server Components & Client Components) for a responsive and interactive user interface.
  - **Styling:** Tailwind CSS for utility-first styling.
  - **Component Library:** Shadcn UI, providing reusable and customizable components.
  - **Language:** TypeScript for type safety across the frontend.
- **Hosting:** The Next.js application is hosted on **Vercel**.
- **Backend & Core Data Management:** **Supabase** serves as the comprehensive backend solution, providing:
  - PostgreSQL Database
  - User Authentication (via `auth.users` and a linked `public.user_profiles` table)
  - Serverless Edge Functions (Deno runtime)
  - Realtime capabilities
- **External Data Source:** Primary financial data is sourced from the **FinancialModelingPrep (FMP) API**.
- **Testing:** A testing strategy incorporating Jest with JSDOM is implemented.

### 7.2 Visual Architecture Overview

#### High-Level System Architecture

```mermaid
graph TD
    User[End User] -->|Interacts via Browser| Frontend[Next.js Frontend on Vercel]

    Frontend -->|API Calls, Auth, Realtime Subscriptions| Supabase[Supabase Backend]

    subgraph Supabase
        direction LR
        Auth[Auth Service]
        DB[PostgreSQL Database]
        EdgeFunctions[Edge Functions]
        Realtime[Realtime Service]
    end

    EdgeFunctions -->|Fetches Data| FMP_API[FinancialModelingPrep API]
    FMP_API -->|Returns Financial Data| EdgeFunctions
    EdgeFunctions -->|Writes Data| DB
    DB -->|Broadcasts Changes| Realtime
    Realtime -->|Pushes Updates| Frontend
```

```mermaid
sequenceDiagram
    participant FMP_API as FinancialModelingPrep API
    participant EdgeFunc as Supabase Edge Function
    participant SupaTables as Supabase Tables (e.g., profiles, live_quote_indicators)
    participant SupaRealtime as Supabase Realtime
    participant ClientApp as Client Application (Next.js Frontend)

    Note over EdgeFunc: Scheduled execution (pg_cron)
    EdgeFunc->>FMP_API: Request financial data (e.g., quotes, profiles)
    FMP_API-->>EdgeFunc: Respond with data
    EdgeFunc->>SupaTables: Upsert fetched data
    SupaTables-->>SupaRealtime: Database changes trigger realtime events
    SupaRealtime-->>ClientApp: Broadcast data updates
    ClientApp->>ClientApp: Update UI with new data (e.g., Financial Cards)
```

### 7.3 Detailed Frontend Architecture

The frontend, built with Next.js and the App Router, emphasizes a modular and component-driven structure.

- **Directory Structure:** Key directories include `src/app` for routing and page components, `src/components` for UI and game logic, `src/hooks` for reusable stateful logic (e.g., `useWorkspaceManager`, `useStockData`), `src/contexts` for global state (e.g., `AuthContext`), and `src/lib` for utilities and Supabase client setup.
- **Modular Card System:**
  - The core of the application revolves around "Financial Cards" located primarily under `src/components/game/cards/`.
  - `GameCard.tsx` acts as a generic renderer.
  - `BaseCard.tsx` provides the common UI shell (flippable card, header, social interactions).
  - Specific card types (e.g., `PriceCard`, `ProfileCard`) extend this system with their own content renderers, data types, and interaction logic.
  - A set of registries and initializers (`cardInitializer.types.ts`, `cardRenderers.ts`, `cardRehydration.ts`, `cardUpdateHandler.types.ts`) manage the lifecycle and behavior of these cards, allowing for an extensible plugin-like architecture.
- **State Management:**
  - Client-side state is managed using a combination of React hooks (`useState`, `useCallback`), custom hooks like `useWorkspaceManager` for the main interactive card area, and `AuthContext` for global authentication state.
  - `useLocalStorage` hook is employed for persisting workspace card configurations.

#### Frontend Card System Overview

```mermaid
graph TD
    subgraph Page & State Management
        WorkspacePage["Workspace Page (/workspace)"]
        Hook_WorkspaceManager["useWorkspaceManager (Hook)"]
        ActiveCardsState["ActiveCards[] (State)"]
        LocalStorage["Local Storage Persistence"]
    end

    subgraph Card Rendering & Logic
        ActiveCardsSection["ActiveCardsSection (Component)"]
        GameCard["GameCard (Generic Renderer)"]
        BaseCard["BaseCard (Common UI Shell)"]
        PriceCardContainer["PriceCardContainer"]
        ProfileCardContainer["ProfileCardContainer"]
        OtherCardTypes["... (Other Card Types)"]
    end

    subgraph Card System Registries
        CardInitializers["Card Initializer Registry"]
        CardRenderers["Card Renderer Registry"]
        CardUpdateHandlers["Card Update Handler Registry"]
        CardRehydrators["Card Rehydrator Registry"]
    end

    WorkspacePage --> Hook_WorkspaceManager
    Hook_WorkspaceManager --> ActiveCardsState
    Hook_WorkspaceManager --> CardInitializers
    Hook_WorkspaceManager --> CardRehydrators
    Hook_WorkspaceManager --> CardUpdateHandlers
    ActiveCardsState --> LocalStorage
    Hook_WorkspaceManager --> ActiveCardsSection
    ActiveCardsSection -->|"For each card in ActiveCardsState"| GameCard
    GameCard --> CardRenderers
    CardRenderers --> PriceCardContainer
    CardRenderers --> ProfileCardContainer
    CardRenderers --> OtherCardTypes
    PriceCardContainer --> BaseCard
    ProfileCardContainer --> BaseCard
    OtherCardTypes --> BaseCard

    %% Specific card utilities interact with registries
    subgraph CardTypeSpecificLogic ["Card Type Specific Utilities (e.g., priceCardUtils.ts)"]
        PriceCardUtils["priceCardUtils.ts"]
        ProfileCardUtils["profileCardUtils.ts"]
    end
    PriceCardUtils --> CardInitializers
    PriceCardUtils --> CardUpdateHandlers
    PriceCardUtils --> CardRehydrators
    ProfileCardUtils --> CardInitializers
    ProfileCardUtils --> CardUpdateHandlers
    ProfileCardUtils --> CardRehydrators
```

### 7.4 Detailed Supabase Backend

- **Data Ingestion & Processing:**
  - Supabase Edge Functions (e.g., `fetch-fmp-quote-indicators`, `fetch-all-exchange-market-status`) are scheduled via `pg_cron` to fetch data from the FMP API.
  - This data populates core tables like `public.profiles` (company information) and `public.live_quote_indicators` (live market data).
- **Real-time Data Propagation:** Changes to key tables (e.g., `live_quote_indicators`, `profiles`) are broadcast using Supabase Realtime. The frontend subscribes to these broadcasts (via `realtime-service.ts`) to update Financial Cards dynamically.
- **Core Application Database Schema:**
  - `public.user_profiles`: Extends `auth.users` with custom profile data, auto-populated on new user creation.
  - `public.profiles`: Stores detailed static company information.
  - `public.live_quote_indicators`: Stores frequently updated market data for symbols.
  - `public.exchange_market_status`: Stores market status for different exchanges.
  - Database tables include triggers for actions like updating `modified_at` timestamps (via `moddatetime` extension).

#### Supabase Core Database Schema (Simplified ERD)

```mermaid
erDiagram
    "auth.users" {
      UUID id PK
      TEXT email UK
      TIMESTAMP created_at
    }

    user_profiles {
      UUID user_id PK, FK
      TEXT username UK
      TEXT full_name
      TIMESTAMP updated_at
    }

    profiles {
      UUID id
      TEXT symbol PK
      DOUBLE price
      BIGINT market_cap
      DOUBLE beta
      DOUBLE last_dividend
      text range
      DOUBLE change
      DOUBLE change_percentage
      BIGINT volume
      BIGINT average_volume
      TEXT company_name
      TEXT currency
      TEXT cik
      TEXT isin
      TEXT cusip
      TEXT exchange_full_name
      TEXT exchange
      TEXT industry
      TEXT website
      TEXT description
      TEXT ceo
      TEXT sector
      TEXT country
      BIGINT full_time_employees
      TEXT phone
      TEXT address
      TEXT city
      TEXT state
      TEXT zip
      TEXT image
      DATE ipo_date
      BOOLEAN default_image
      BOOLEAN is_etf
      BOOLEAN is_actively_trading
      BOOLEAN is_adr
      BOOLEAN is_fund
      TIMESTAMP created_at
      TIMESTAMP modified_at
    }

    live_quote_indicators {
        UUID id PK
        TEXT symbol UK
        DOUBLE current_price
        DOUBLE change_percentage
        DOUBLE day_change
        volume bigint
        DOUBLE day_low
        DOUBLE day_high
        market_cap bigint
        DOUBLE day_open
        DOUBLE previous_close
        api_timestamp bigint
        DOUBLE sma_50d
        DOUBLE sma_200d
        DOUBLE year_low
        DOUBLE year_high
        TEXT exchange FK
        TIMESTAMP fetched_at
    }

    exchange_market_status {
        TEXT exchange_code PK
        TEXT name
        TEXT opening_time_local
        TEXT closing_time_local
        TEXT timezone
        BOOLEAN is_market_open
        TEXT status_message
        BOOLEAN current_day_is_holiday
        TEXT current_holiday_name
        JSONB raw_holidays_json
        TIMESTAMP last_fetched_at
    }

    "auth.users" ||--|| user_profiles : "has one"
    profiles ||--|| live_quote_indicators : "has"

    live_quote_indicators }o--|| exchange_market_status : "market status from"
```

## 8. Purpose of this Document

This summary serves to clearly articulate the vision, functionality, target audience, and technical architecture of Tickered. It is intended to provide a comprehensive understanding for collaborative development and for training AI assistants on the project's background.
