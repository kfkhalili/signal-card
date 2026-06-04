import { Option } from "effect";

export type HealthStatus = "Undervalued" | "Fair" | "Overvalued" | "Unknown";
export type QualityStatus = "Excellent" | "Good" | "Average" | "Poor" | "Unknown";
export type SafetyStatus = "Safe" | "Moderate" | "Risky" | "Unknown";

export function calculateValuationStatus(
  price: Option.Option<number>,
  dcf: Option.Option<number>,
  peRatio: Option.Option<number>,
  pegRatio: Option.Option<number>
): { status: HealthStatus; color: string; borderColor: string } {
  // If we don't have enough data, return unknown
  if (Option.isNone(price) || Option.isNone(dcf)) {
    return { status: "Unknown", color: "text-muted-foreground", borderColor: "border-l-border" };
  }

  const priceVal = price.value;
  const dcfVal = dcf.value;

  // Edge case: If DCF is negative or zero, treat as overvalued (distressed company)
  if (dcfVal <= 0 || !isFinite(dcfVal)) {
    return { status: "Overvalued", color: "text-red-600", borderColor: "border-l-red-500" };
  }

  const discount = ((dcfVal - priceVal) / dcfVal) * 100;

  // Score-based approach: Consider DCF discount, P/E, and PEG
  let score = 0;
  let signals = 0;

  // Signal 1: DCF Discount (weight: 40%)
  // > 20% discount = undervalued, < -20% = overvalued
  if (discount > 20) {
    score += 40;
    signals++;
  } else if (discount < -20) {
    score -= 40;
    signals++;
  } else if (discount > 0) {
    score += 20; // Slightly undervalued
    signals++;
  } else {
    score -= 20; // Slightly overvalued
    signals++;
  }

  // Signal 2: P/E Ratio (weight: 30%)
  // Thresholds are market-average based (15, 20, 25, 30)
  if (Option.isSome(peRatio)) {
    const pe = peRatio.value;
    if (pe <= 0 || !isFinite(pe)) {
      score -= 30;
      signals++;
    } else if (pe < 15) {
      score += 30;
      signals++;
    } else if (pe < 20) {
      score += 15;
      signals++;
    } else if (pe > 30) {
      score -= 30;
      signals++;
    } else if (pe > 25) {
      score -= 15;
      signals++;
    } else {
      signals++; // Neutral zone (20 <= pe <= 25)
    }
  }

  // Signal 3: PEG Ratio (weight: 30%)
  // PEG < 1.0 = undervalued, 1.0-2.0 = fair, > 2.0 = overvalued
  if (Option.isSome(pegRatio)) {
    const peg = pegRatio.value;
    if (peg <= 0 || !isFinite(peg)) {
      score -= 30;
      signals++;
    } else if (peg < 1.0) {
      score += 30;
      signals++;
    } else if (peg < 1.5) {
      score += 15;
      signals++;
    } else if (peg > 2.5) {
      score -= 30;
      signals++;
    } else if (peg > 2.0) {
      score -= 15;
      signals++;
    } else {
      signals++; // Neutral zone (1.5 <= peg <= 2.0)
    }
  }

  // Determine status based on composite score
  if (signals >= 2) {
    if (score >= 30) {
      return { status: "Undervalued", color: "text-green-600", borderColor: "border-l-green-500" };
    } else if (score <= -30) {
      return { status: "Overvalued", color: "text-red-600", borderColor: "border-l-red-500" };
    } else {
      return { status: "Fair", color: "text-yellow-600", borderColor: "border-l-yellow-500" };
    }
  } else {
    // Fallback to DCF-only logic
    if (discount > 20) {
      return { status: "Undervalued", color: "text-green-600", borderColor: "border-l-green-500" };
    } else if (discount < -20) {
      return { status: "Overvalued", color: "text-red-600", borderColor: "border-l-red-500" };
    } else {
      return { status: "Fair", color: "text-yellow-600", borderColor: "border-l-yellow-500" };
    }
  }
}

export function calculateQualityStatus(
  roic: Option.Option<number>,
  wacc: Option.Option<number>,
  grossMargin: Option.Option<number>,
  fcfYield: Option.Option<number>,
  roicHistory: { date: string; dateLabel: string; roic: number; wacc: number }[]
): { status: QualityStatus; color: string; borderColor: string } {
  // If we don't have ROIC, we can't assess quality
  if (Option.isNone(roic)) {
    return { status: "Unknown", color: "text-muted-foreground", borderColor: "border-l-border" };
  }

  const roicVal = roic.value;
  let score = 0;
  let signals = 0;

  // Signal 1: ROIC vs WACC Spread (40% weight)
  if (Option.isSome(wacc)) {
    const waccVal = wacc.value;
    const spread = roicVal - waccVal; // Percentage points difference

    if (spread > 0.10) {
      score += 40; // Exceptional value creation (>10% spread)
      signals++;
    } else if (spread > 0.05) {
      score += 30; // Strong value creation (5-10% spread)
      signals++;
    } else if (spread > 0) {
      score += 15; // Creating value (0-5% spread)
      signals++;
    } else if (spread > -0.05) {
      score -= 15; // Marginally destroying value (-5% to 0% spread)
      signals++;
    } else {
      score -= 40; // Significantly destroying value (<-5% spread)
      signals++;
    }
  } else {
    // If no WACC, use absolute ROIC thresholds
    if (roicVal > 0.20) {
      score += 30; // >20% ROIC is exceptional
      signals++;
    } else if (roicVal > 0.15) {
      score += 20; // >15% ROIC is excellent
      signals++;
    } else if (roicVal > 0.10) {
      score += 10; // >10% ROIC is good
      signals++;
    } else if (roicVal > 0.05) {
      score += 0; // 5-10% ROIC is average
      signals++;
    } else if (roicVal > 0) {
      score -= 20; // 0-5% ROIC is poor
      signals++;
    } else {
      score -= 40; // Negative ROIC is destroying value
      signals++;
    }
  }

  // Signal 2: ROIC Absolute Level (25% weight)
  if (roicVal > 0.20) {
    score += 25; // Exceptional (>20%)
    signals++;
  } else if (roicVal > 0.15) {
    score += 20; // Excellent (15-20%)
    signals++;
  } else if (roicVal > 0.10) {
    score += 10; // Good (10-15%)
    signals++;
  } else if (roicVal > 0.05) {
    score += 0; // Average (5-10%)
    signals++;
  } else if (roicVal > 0) {
    score -= 15; // Poor (0-5%)
    signals++;
  } else {
    score -= 30; // Negative (destroying value)
    signals++;
  }

  // Signal 3: Gross Margin (20% weight) - Pricing power indicator
  if (Option.isSome(grossMargin)) {
    const margin = grossMargin.value;
    if (margin > 0.60) {
      score += 20; // Exceptional pricing power (>60%)
      signals++;
    } else if (margin > 0.40) {
      score += 15; // Strong pricing power (40-60%)
      signals++;
    } else if (margin > 0.30) {
      score += 5; // Moderate pricing power (30-40%)
      signals++;
    } else if (margin > 0.20) {
      score -= 5; // Weak pricing power (20-30%)
      signals++;
    } else {
      score -= 15; // Very weak pricing power (<20%)
      signals++;
    }
  }

  // Signal 4: FCF Yield (15% weight) - Cash generation
  if (Option.isSome(fcfYield)) {
    const fcfYieldValue = fcfYield.value;
    if (fcfYieldValue > 0.10) {
      score += 15; // Exceptional cash generation (>10%)
      signals++;
    } else if (fcfYieldValue > 0.05) {
      score += 10; // Strong cash generation (5-10%)
      signals++;
    } else if (fcfYieldValue > 0.03) {
      score += 5; // Moderate cash generation (3-5%)
      signals++;
    } else if (fcfYieldValue > 0) {
      score -= 5; // Weak cash generation (0-3%)
      signals++;
    } else {
      score -= 15; // Negative cash flow
      signals++;
    }
  }

  // Signal 5: ROIC Trend (bonus/penalty)
  if (roicHistory.length >= 2) {
    const recent = roicHistory.slice(0, 3); // Last 3 data points
    const oldest = recent[recent.length - 1];
    const newest = recent[0];
    const trend = newest.roic - oldest.roic; // Change in ROIC

    if (trend > 0.05) {
      score += 10; // Improving significantly (>5% points)
    } else if (trend > 0.02) {
      score += 5; // Improving moderately (2-5% points)
    } else if (trend < -0.05) {
      score -= 10; // Declining significantly (<-5% points)
    } else if (trend < -0.02) {
      score -= 5; // Declining moderately (-2 to -5% points)
    }
  }

  // Determine status based on composite score
  if (signals < 2) {
    return { status: "Unknown", color: "text-muted-foreground", borderColor: "border-l-border" };
  }

  if (score >= 50) {
    return { status: "Excellent", color: "text-green-600", borderColor: "border-l-green-500" };
  } else if (score >= 20) {
    return { status: "Good", color: "text-green-600", borderColor: "border-l-green-500" };
  } else if (score >= -10) {
    return { status: "Average", color: "text-yellow-600", borderColor: "border-l-yellow-500" };
  } else {
    return { status: "Poor", color: "text-red-600", borderColor: "border-l-red-500" };
  }
}

export function calculateSafetyStatus(
  netDebtToEbitda: Option.Option<number>,
  altmanZScore: Option.Option<number>,
  interestCoverage: Option.Option<number>
): { status: SafetyStatus; color: string; borderColor: string } {
  // If we don't have at least one metric, we can't assess safety
  if (Option.isNone(netDebtToEbitda) && Option.isNone(altmanZScore) && Option.isNone(interestCoverage)) {
    return { status: "Unknown", color: "text-muted-foreground", borderColor: "border-l-border" };
  }

  let score = 0;
  let signals = 0;

  // Signal 1: Net Debt to EBITDA (40% weight)
  if (Option.isSome(netDebtToEbitda)) {
    const ratio = netDebtToEbitda.value;
    if (ratio < 1.0) {
      score += 40; // Exceptional (< 1.0x)
      signals++;
    } else if (ratio < 2.0) {
      score += 30; // Excellent (1.0-2.0x)
      signals++;
    } else if (ratio < 3.0) {
      score += 20; // Good (2.0-3.0x)
      signals++;
    } else if (ratio < 5.0) {
      score -= 10; // Moderate (3.0-5.0x)
      signals++;
    } else if (ratio < 7.0) {
      score -= 30; // Risky (5.0-7.0x)
      signals++;
    } else {
      score -= 40; // Very Risky (> 7.0x)
      signals++;
    }
  }

  // Signal 2: Altman Z-Score (35% weight)
  if (Option.isSome(altmanZScore)) {
    const zScore = altmanZScore.value;
    if (zScore > 3.0) {
      score += 35; // Safe Zone (> 3.0)
      signals++;
    } else if (zScore > 2.7) {
      score += 20; // Good (2.7-3.0)
      signals++;
    } else if (zScore > 1.81) {
      score -= 10; // Grey Zone (1.81-2.7)
      signals++;
    } else if (zScore > 1.0) {
      score -= 30; // Distress Zone (1.0-1.81)
      signals++;
    } else {
      score -= 40; // Critical (< 1.0)
      signals++;
    }
  }

  // Signal 3: Interest Coverage (25% weight)
  if (Option.isSome(interestCoverage)) {
    const coverage = interestCoverage.value;
    if (coverage >= 999) {
      score += 25; // Perfect coverage (no interest expense)
      signals++;
    } else if (coverage > 10.0) {
      score += 25; // Exceptional (> 10x)
      signals++;
    } else if (coverage > 5.0) {
      score += 20; // Excellent (5-10x)
      signals++;
    } else if (coverage > 3.0) {
      score += 10; // Good (3-5x)
      signals++;
    } else if (coverage > 1.5) {
      score -= 15; // Moderate (1.5-3x)
      signals++;
    } else if (coverage > 0) {
      score -= 30; // Risky (0-1.5x)
      signals++;
    } else {
      score -= 40; // Critical (< 0)
      signals++;
    }
  }

  // Determine status based on composite score
  if (signals < 2) {
    return { status: "Unknown", color: "text-muted-foreground", borderColor: "border-l-border" };
  }

  if (score >= 50) {
    return { status: "Safe", color: "text-green-600", borderColor: "border-l-green-500" };
  } else if (score >= 10) {
    return { status: "Moderate", color: "text-yellow-600", borderColor: "border-l-yellow-500" };
  } else {
    return { status: "Risky", color: "text-red-600", borderColor: "border-l-red-500" };
  }
}

export function calculateContrarianIndicatorsStatus(
  analystConsensus: Option.Option<string>,
  priceTarget: Option.Option<number>,
  currentPrice: Option.Option<number>
): { status: string; color: string; borderColor: string } {
  // If we don't have enough data, return neutral/unknown
  if (Option.isNone(analystConsensus) && Option.isNone(priceTarget)) {
    return { status: "Unknown", color: "text-muted-foreground", borderColor: "border-l-border" };
  }

  let bullishSignals = 0;
  let bearishSignals = 0;

  // Check analyst consensus
  if (Option.isSome(analystConsensus)) {
    const consensus = analystConsensus.value;
    if (consensus === "Strong Buy" || consensus === "Buy") {
      bullishSignals += consensus === "Strong Buy" ? 2 : 1;
    } else if (consensus === "Sell" || consensus === "Strong Sell") {
      bearishSignals += consensus === "Strong Sell" ? 2 : 1;
    }
  }

  // Check price target vs current price
  if (Option.isSome(priceTarget) && Option.isSome(currentPrice)) {
    const target = priceTarget.value;
    const current = currentPrice.value;
    const upside = ((target - current) / current) * 100;

    if (upside > 10) {
      bullishSignals += 2; // Strong bullish signal
    } else if (upside > 0) {
      bullishSignals += 1; // Moderate bullish signal
    } else if (upside < -10) {
      bearishSignals += 2; // Strong bearish signal
    } else if (upside < 0) {
      bearishSignals += 1; // Moderate bearish signal
    }
  }

  // Determine overall status
  if (bullishSignals > bearishSignals && bullishSignals >= 2) {
    return { status: "Bullish", color: "text-green-600", borderColor: "border-l-green-500" };
  } else if (bearishSignals > bullishSignals && bearishSignals >= 2) {
    return { status: "Bearish", color: "text-red-600", borderColor: "border-l-red-500" };
  } else if (bullishSignals > bearishSignals) {
    return { status: "Moderately Bullish", color: "text-green-600", borderColor: "border-l-green-500" };
  } else if (bearishSignals > bullishSignals) {
    return { status: "Moderately Bearish", color: "text-red-600", borderColor: "border-l-red-500" };
  } else {
    return { status: "Neutral", color: "text-yellow-600", borderColor: "border-l-yellow-500" };
  }
}
