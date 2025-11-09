# Refactoring Implementation Guide

This guide provides step-by-step instructions for implementing the architectural improvements identified in the analysis.

---

## Quick Start: Priority Refactoring (Phase 1)

### Step 1: Create Profile Extraction Service

**File:** `src/components/game/cards/services/profileExtractionService.ts`

```typescript
import { ok, err, Result } from "neverthrow";
import { fromPromise } from "neverthrow";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { DisplayableCard } from "@/components/game/types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";

export interface ProfileInfo {
  companyName: string | null;
  displayCompanyName: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  currency?: string | null;
  exchange?: string | null;
}

/**
 * Extracts profile information from either an existing profile card in activeCards
 * or by fetching from the database.
 */
export async function extractProfileInfo(
  symbol: string,
  activeCards: DisplayableCard[] | undefined,
  supabase: SupabaseClient<Database>,
  errorClass: typeof Error = Error
): Promise<Result<ProfileInfo, Error>> {
  // 1. Try to extract from existing profile card
  const profileCard = activeCards?.find(
    (c) => c.symbol === symbol && c.type === "profile"
  ) as ProfileCardData | undefined;

  if (profileCard) {
    return ok({
      companyName: profileCard.companyName ?? null,
      displayCompanyName: profileCard.displayCompanyName ?? null,
      logoUrl: profileCard.logoUrl ?? null,
      websiteUrl: profileCard.websiteUrl ?? null,
      currency: profileCard.staticData.currency ?? null,
      exchange: profileCard.staticData.exchange ?? null,
    });
  }

  // 2. Fallback to database fetch
  const profileResult = await fromPromise(
    supabase
      .from("profiles")
      .select("company_name, display_company_name, image, website, currency, exchange")
      .eq("symbol", symbol)
      .maybeSingle(),
    (e) => new errorClass(`Failed to fetch profile: ${(e as Error).message}`)
  );

  if (profileResult.isErr()) {
    // Log warning but return defaults
    console.warn(`[ProfileExtraction] ${profileResult.error.message}`);
    return ok({
      companyName: symbol,
      displayCompanyName: symbol,
      logoUrl: null,
      websiteUrl: null,
      currency: null,
      exchange: null,
    });
  }

  const profileData = profileResult.value.data;
  if (!profileData) {
    return ok({
      companyName: symbol,
      displayCompanyName: symbol,
      logoUrl: null,
      websiteUrl: null,
      currency: null,
      exchange: null,
    });
  }

  return ok({
    companyName: profileData.company_name ?? symbol,
    displayCompanyName:
      profileData.display_company_name ??
      profileData.company_name ??
      symbol,
    logoUrl: profileData.image ?? null,
    websiteUrl: profileData.website ?? null,
    currency: profileData.currency ?? null,
    exchange: profileData.exchange ?? null,
  });
}

/**
 * Creates default profile info when none is available
 */
export function createDefaultProfileInfo(
  symbol: string,
  currency: string | null = null,
  exchange: string | null = null
): ProfileInfo {
  return {
    companyName: symbol,
    displayCompanyName: symbol,
    logoUrl: null,
    websiteUrl: null,
    currency,
    exchange,
  };
}
```

### Step 2: Refactor Price Card Initializer

**File:** `src/components/game/cards/price-card/priceCardUtils.ts`

**Before:**
```typescript
const profileCard = activeCards?.find(
  (c) => c.symbol === symbol && c.type === "profile"
) as ProfileCardDataType | undefined;

let profileContext: Pick<ProfileDBRow, ...> | undefined;

if (profileCard) {
  profileContext = {
    company_name: profileCard.companyName ?? null,
    // ... many lines of mapping
  };
} else {
  const { data, error } = await supabase
    .from("profiles")
    .select("company_name, display_company_name, image, exchange, website, currency")
    .eq("symbol", symbol)
    .maybeSingle();
  // ... many more lines
}
```

**After:**
```typescript
import { extractProfileInfo } from "../services/profileExtractionService";

async function initializePriceCard({
  symbol,
  supabase,
  toast,
  activeCards,
}: CardInitializationContext): Promise<
  Result<DisplayableCard, PriceCardError>
> {
  // Extract profile info (replaces ~50 lines of duplicated code)
  const profileInfoResult = await extractProfileInfo(
    symbol,
    activeCards,
    supabase,
    PriceCardError
  );

  if (profileInfoResult.isErr()) {
    return err(profileInfoResult.error);
  }

  const profileInfo = profileInfoResult.value;

  // Continue with quote fetching...
  const quoteResult = await fromPromise(
    // ... rest of initialization
  );

  // Use profileInfo.companyName, profileInfo.logoUrl, etc.
  const profileContext = {
    company_name: profileInfo.companyName,
    display_company_name: profileInfo.displayCompanyName,
    image: profileInfo.logoUrl,
    exchange: profileInfo.exchange,
    website: profileInfo.websiteUrl,
    currency: profileInfo.currency ?? "USD",
  };
}
```

### Step 3: Apply to Other Card Initializers

Repeat Step 2 for:
1. `revenueCardUtils.ts`
2. `revenueBreakdownCardUtils.ts`
3. `solvencyCardUtils.ts`
4. `cashUseCardUtils.ts`
5. `keyRatiosCardUtils.ts`
6. `dividendsHistoryCardUtils.ts`
7. `analystGradesCardUtils.ts`

---

## Phase 2: Card Construction Service

### Step 4: Create Card Construction Service

**File:** `src/components/game/cards/services/cardConstructionService.ts`

```typescript
import type { CardType, BaseCardBackData } from "@/components/game/cards/base-card/base-card.types";
import type { ConcreteCardData } from "@/components/game/types";
import type { ProfileInfo } from "./profileExtractionService";

export interface BaseCardConstructionParams<TStatic, TLive> {
  symbol: string;
  cardType: CardType;
  profileInfo: ProfileInfo;
  staticData: TStatic;
  liveData: TLive;
  backDescription: string;
  idOverride?: string | null;
  existingCreatedAt?: number | null;
}

export function constructBaseCardData<
  TCardData extends ConcreteCardData,
  TStatic extends TCardData["staticData"],
  TLive extends TCardData["liveData"]
>(
  params: BaseCardConstructionParams<TStatic, TLive>
): Omit<TCardData, "id" | "createdAt"> & { id: string; createdAt: number } {
  const {
    symbol,
    cardType,
    profileInfo,
    staticData,
    liveData,
    backDescription,
    idOverride,
    existingCreatedAt,
  } = params;

  return {
    id: idOverride || `${cardType}-${symbol}-${Date.now()}`,
    type: cardType,
    symbol,
    companyName: profileInfo.companyName ?? symbol,
    displayCompanyName:
      profileInfo.displayCompanyName ?? profileInfo.companyName ?? symbol,
    logoUrl: profileInfo.logoUrl ?? null,
    websiteUrl: profileInfo.websiteUrl ?? null,
    createdAt: existingCreatedAt ?? Date.now(),
    staticData,
    liveData,
    backData: { description: backDescription },
  } as Omit<TCardData, "id" | "createdAt"> & { id: string; createdAt: number };
}
```

### Step 5: Refactor Card Construction Functions

**Before:**
```typescript
function constructRevenueCardData(
  dbRow: FinancialStatementDBRowFromSupabase,
  profileInfo: { companyName?: string | null; ... },
  idOverride?: string | null,
  existingCreatedAt?: number | null
): RevenueCardData {
  // ... manual construction of all fields
  return {
    id: idOverride || `revenue-${dbRow.symbol}-${Date.now()}`,
    type: "revenue",
    symbol: dbRow.symbol,
    companyName: profileInfo.companyName ?? dbRow.symbol,
    // ... many more fields
  };
}
```

**After:**
```typescript
import { constructBaseCardData } from "../services/cardConstructionService";
import { extractProfileInfo } from "../services/profileExtractionService";

function constructRevenueCardData(
  dbRow: FinancialStatementDBRowFromSupabase,
  profileInfo: ProfileInfo,
  idOverride?: string | null,
  existingCreatedAt?: number | null
): RevenueCardData {
  const staticData: RevenueCardStaticData = {
    // Card-specific static data
  };

  const liveData: RevenueCardLiveData = {
    // Card-specific live data
  };

  const backDescription = `Key financial metrics for ${
    profileInfo.companyName || dbRow.symbol
  } (${staticData.periodLabel}, ending ${
    staticData.statementDate || "N/A"
  }). Includes revenue, profits, and free cash flow.`;

  return constructBaseCardData<RevenueCardData, RevenueCardStaticData, RevenueCardLiveData>({
    symbol: dbRow.symbol,
    cardType: "revenue",
    profileInfo,
    staticData,
    liveData,
    backDescription,
    idOverride,
    existingCreatedAt,
  });
}
```

---

## Phase 3: Error Handling Standardization

### Step 6: Create Standardized Error Classes

**File:** `src/components/game/cards/services/cardInitializationError.ts`

```typescript
import type { CardType } from "@/components/game/cards/base-card/base-card.types";

export class CardInitializationError extends Error {
  constructor(
    public readonly cardType: CardType,
    public readonly symbol: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "CardInitializationError";
  }

  static fromError(
    cardType: CardType,
    symbol: string,
    error: Error
  ): CardInitializationError {
    return new CardInitializationError(
      cardType,
      symbol,
      `Failed to initialize ${cardType} card for ${symbol}: ${error.message}`,
      error
    );
  }
}

// Base class for card-specific errors
export class CardError extends Error {
  constructor(
    public readonly cardType: CardType,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = `${cardType.charAt(0).toUpperCase() + cardType.slice(1)}CardError`;
  }
}
```

### Step 7: Update Custom Error Classes

**Before:**
```typescript
class PriceCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PriceCardError";
  }
}
```

**After:**
```typescript
import { CardError } from "../services/cardInitializationError";

class PriceCardError extends CardError {
  constructor(message: string, cause?: Error) {
    super("price", message, cause);
  }
}
```

---

## Testing Strategy

### Unit Tests for Profile Extraction Service

**File:** `src/components/game/cards/services/__tests__/profileExtractionService.test.ts`

```typescript
import { describe, it, expect, vi } from "@jest/globals";
import { extractProfileInfo } from "../profileExtractionService";
import type { DisplayableCard } from "@/components/game/types";
import type { ProfileCardData } from "@/components/game/cards/profile-card/profile-card.types";

describe("extractProfileInfo", () => {
  it("should extract profile info from existing profile card", async () => {
    // Test implementation
  });

  it("should fallback to database when profile card not found", async () => {
    // Test implementation
  });

  it("should return defaults when profile not found in database", async () => {
    // Test implementation
  });
});
```

### Integration Tests for Card Initializers

Test the full initialization flow with mocked Supabase responses.

---

## Migration Checklist

- [ ] Create `profileExtractionService.ts`
- [ ] Create unit tests for profile extraction
- [ ] Refactor `priceCardUtils.ts` to use profile extraction
- [ ] Refactor `revenueCardUtils.ts` to use profile extraction
- [ ] Refactor `revenueBreakdownCardUtils.ts` to use profile extraction
- [ ] Refactor `solvencyCardUtils.ts` to use profile extraction
- [ ] Refactor `cashUseCardUtils.ts` to use profile extraction
- [ ] Refactor `keyRatiosCardUtils.ts` to use profile extraction
- [ ] Refactor `dividendsHistoryCardUtils.ts` to use profile extraction
- [ ] Refactor `analystGradesCardUtils.ts` to use profile extraction
- [ ] Create `cardConstructionService.ts`
- [ ] Create `cardDescriptionService.ts`
- [ ] Standardize error handling
- [ ] Update all error classes
- [ ] Run full test suite
- [ ] Update documentation

---

## Rollback Plan

If issues arise during refactoring:

1. **Git Branches**: Work in feature branches (`refactor/profile-extraction`, etc.)
2. **Incremental Commits**: Commit each card refactoring separately
3. **Feature Flags**: Consider feature flags for phased rollout
4. **Verification**: Run full test suite after each phase

---

## Success Metrics

- **Code Reduction**: Measure lines of code eliminated
- **Test Coverage**: Maintain or improve test coverage
- **Type Safety**: Zero unsafe type casts remaining
- **Performance**: No performance regression
- **Functionality**: All existing features work as before

---

## Next Steps

After completing Phase 1:

1. Review and validate the refactored code
2. Run comprehensive tests
3. Proceed to Phase 2 (Card Construction Service)
4. Continue with remaining phases

---

## Notes

- This refactoring should be done incrementally
- Test thoroughly after each change
- Maintain backwards compatibility where possible
- Update documentation as you go
- Communicate changes to the team

