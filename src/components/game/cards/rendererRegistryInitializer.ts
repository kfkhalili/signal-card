// src/components/game/cards/rendererRegistryInitializer.ts
import { registerCardRenderer } from "@/components/game/cardRenderers";

import { PriceCardContainer } from "./price-card/PriceCardContainer";
import { ProfileCardContainer } from "./profile-card/ProfileCardContainer";
import { RevenueCardContainer } from "./revenue-card/RevenueCardContainer";
import { SolvencyCardContainer } from "./solvency-card/SolvencyCardContainer";
import { CashUseCardContainer } from "./cash-use-card/CashUseCardContainer";
import { KeyRatiosCardContainer } from "./key-ratios-card/KeyRatiosCardContainer";
import { DividendsHistoryCardContainer } from "./dividends-history-card/DividendsHistoryCardContainer";

registerCardRenderer("price", PriceCardContainer);
registerCardRenderer("profile", ProfileCardContainer);
registerCardRenderer("revenue", RevenueCardContainer);
registerCardRenderer("solvency", SolvencyCardContainer);
registerCardRenderer("cashuse", CashUseCardContainer);
registerCardRenderer("keyratios", KeyRatiosCardContainer);
registerCardRenderer("dividendshistory", DividendsHistoryCardContainer);
