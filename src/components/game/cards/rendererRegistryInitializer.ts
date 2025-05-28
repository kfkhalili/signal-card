// src/components/game/cards/rendererRegistryInitializer.ts
import { registerCardRenderer } from "@/components/game/cardRenderers"; // Adjust path as needed

// Import the actual container components
import { PriceCardContainer } from "./price-card/PriceCardContainer";
import { ProfileCardContainer } from "./profile-card/ProfileCardContainer";
import { RevenueCardContainer } from "./revenue-card/RevenueCardContainer";
import { SolvencyCardContainer } from "./solvency-card/SolvencyCardContainer";

// --- Register known card types ---
registerCardRenderer("price", PriceCardContainer);
registerCardRenderer("profile", ProfileCardContainer);
registerCardRenderer("revenue", RevenueCardContainer);
registerCardRenderer("solvency", SolvencyCardContainer);

// As you create new card types (e.g., NewsCard, EarningsCard):
// 1. Create their ...Container.tsx component.
// 2. Import it here.
// 3. Register it:
//    import { NewsCardContainer } from './news-card/NewsCardContainer';
//    registerCardRenderer('news', NewsCardContainer as React.ComponentType<any>);
