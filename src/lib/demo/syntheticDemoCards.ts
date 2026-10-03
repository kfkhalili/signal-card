import type { DisplayableCard } from "@/components/game/types";
import type { KeyRatiosCardData } from "@/components/game/cards/key-ratios-card/key-ratios-card.types";
import type { PriceCardData } from "@/components/game/cards/price-card/price-card.types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";
import type { RevenueCardData } from "@/components/game/cards/revenue-card/revenue-card.types";

export const SYNTHETIC_DEMO_DATA_ORIGIN = "synthetic-v1";

const createdAt = Date.UTC(2026, 0, 1);
const companyName = "Northstar Components (Synthetic)";
const displayCompanyName = "Northstar Components";
const symbol = "DEMO";
const syntheticNotice =
  "Fictional company and illustrative values for a product demonstration. Not current market data.";

const profileCard: ProfileCardData & { isFlipped: boolean } = {
  id: "synthetic-profile-demo",
  type: "profile",
  symbol,
  companyName,
  displayCompanyName,
  logoUrl: null,
  websiteUrl: null,
  createdAt,
  isFlipped: false,
  backData: { description: syntheticNotice },
  staticData: {
    db_id: "synthetic-profile-demo",
    sector: "Industrials",
    industry: "Precision Components",
    country: "US",
    exchange: "DEMO",
    exchange_full_name: "Synthetic Exchange",
    website: null,
    description:
      "A fictional manufacturer used to demonstrate how Tickered organizes company research.",
    ceo: "Alex Example",
    full_address: null,
    phone: null,
    profile_last_updated: "2026-01-01T00:00:00.000Z",
    currency: "USD",
    formatted_ipo_date: "January 1, 2020",
    formatted_full_time_employees: "1,250",
    is_etf: false,
    is_adr: false,
    is_fund: false,
    last_dividend: 0.48,
    beta: 0.92,
    average_volume: 420000,
    isin: null,
  },
  liveData: {
    price: 42.5,
    marketCap: 850000000,
    revenue: 620000000,
    eps: 3.4,
    financialsCurrency: "USD",
    priceToEarningsRatioTTM: 12.5,
    priceToBookRatioTTM: 2.1,
  },
};

const priceCard: PriceCardData & { isFlipped: boolean } = {
  id: "synthetic-price-demo",
  type: "price",
  symbol,
  companyName,
  displayCompanyName,
  logoUrl: null,
  websiteUrl: null,
  createdAt,
  isFlipped: false,
  backData: { description: syntheticNotice },
  staticData: {
    exchange_code: "DEMO",
    currency: "USD",
  },
  liveData: {
    timestamp: 1767225600,
    price: 42.5,
    dayChange: 0.65,
    changePercentage: 1.55,
    dayHigh: 43.1,
    dayLow: 41.6,
    dayOpen: 41.95,
    previousClose: 41.85,
    volume: 420000,
    yearHigh: 58,
    yearLow: 36,
    marketCap: 850000000,
    sma50d: 44.2,
    sma200d: 47.8,
  },
};

const revenueCard: RevenueCardData & { isFlipped: boolean } = {
  id: "synthetic-revenue-demo",
  type: "revenue",
  symbol,
  companyName,
  displayCompanyName,
  logoUrl: null,
  websiteUrl: null,
  createdAt,
  isFlipped: false,
  backData: { description: syntheticNotice },
  staticData: {
    periodLabel: "FY2025",
    reportedCurrency: "USD",
    filingDate: "2026-01-01",
    acceptedDate: "2026-01-01T00:00:00.000Z",
    statementDate: "2025-12-31",
    statementPeriod: "FY",
  },
  liveData: {
    revenue: 620000000,
    grossProfit: 248000000,
    operatingIncome: 86800000,
    netIncome: 68000000,
    freeCashFlow: 79000000,
  },
};

const keyRatiosCard: KeyRatiosCardData & { isFlipped: boolean } = {
  id: "synthetic-key-ratios-demo",
  type: "keyratios",
  symbol,
  companyName,
  displayCompanyName,
  logoUrl: null,
  websiteUrl: null,
  createdAt,
  isFlipped: false,
  backData: { description: syntheticNotice },
  staticData: {
    lastUpdated: "2026-01-01T00:00:00.000Z",
    reportedCurrency: "USD",
  },
  liveData: {
    priceToEarningsRatioTTM: 12.5,
    priceToSalesRatioTTM: 1.37,
    priceToBookRatioTTM: 2.1,
    priceToFreeCashFlowRatioTTM: 10.76,
    enterpriseValueMultipleTTM: 8.4,
    netProfitMarginTTM: 0.1097,
    grossProfitMarginTTM: 0.4,
    ebitdaMarginTTM: 0.18,
    debtToEquityRatioTTM: 0.42,
    dividendYieldTTM: 0.0113,
    dividendPayoutRatioTTM: 0.15,
    earningsPerShareTTM: 3.4,
    revenuePerShareTTM: 31,
    bookValuePerShareTTM: 20.24,
    freeCashFlowPerShareTTM: 3.95,
    effectiveTaxRateTTM: 0.21,
    currentRatioTTM: 1.8,
    quickRatioTTM: 1.35,
    assetTurnoverTTM: 0.86,
  },
};

export const SYNTHETIC_DEMO_CARDS: readonly DisplayableCard[] = [
  profileCard,
  priceCard,
  revenueCard,
  keyRatiosCard,
];
