# Product Analysis: User Journeys & Business Value
**Date:** 2025-01-20
**Role:** Product Owner / Product Discovery Expert
**Focus:** Understanding user journeys, business value, and why Compass should be the star

---

## Executive Summary

**Current State:** Tickered has two main features:
1. **Workspace** - The primary feature where users add cards to explore financial data
2. **Compass** - A weighted leaderboard that ranks stocks, currently underutilized

**Key Insight:** Compass should be the **entry point and discovery engine** that drives users to Workspace, not a secondary feature. It solves the critical "where do I start?" problem that prevents user activation.

---

## Current User Journeys

### Journey 1: New User (Authenticated)
1. **Landing Page** → "Spot the Trends, See the Moves"
2. **Auto-redirect to Workspace** (if authenticated)
3. **Empty Workspace** → "Your workspace is currently empty"
4. **Add Card Form** → User must know a symbol (e.g., AAPL, MSFT)
5. **Card Appears** → User can explore that symbol's data

**Problem:** This journey assumes users already know what they want to explore. It's a **cold start problem**.

### Journey 2: Compass Discovery (Current)
1. **Header Navigation** → Click "Compass"
2. **Compass Page** → See table of top 50 stocks ranked by composite score
3. **Adjust Weights** → Use sliders or preset investor profiles
4. **View Rankings** → See symbols and scores

**Problem:** Compass is disconnected from Workspace. Users can't easily go from "I see a good stock" to "let me explore it."

### Journey 3: Power User (Hypothetical)
1. **Workspace** → User knows exactly what symbols to track
2. **Add Multiple Cards** → Build custom dashboard
3. **Deep Dive** → Click metrics to generate related cards
4. **Custom Cards** → Create narrative cards from selected data

**This works well** for users who already know what they want, but represents a small percentage of potential users.

---

## Business Problems We're Solving

### Problem 1: Information Overload
**Traditional platforms:** Overwhelm users with vast amounts of non-contextualized data.

**Our Solution:**
- ✅ **Workspace Cards** - Self-contained, digestible information
- ✅ **Interactive Drill-Down** - Click metrics to explore deeper
- ❌ **Missing:** A way to discover what's worth exploring in the first place

### Problem 2: Steep Learning Curve
**Traditional platforms:** Require users to understand complex financial terminology and know where to look.

**Our Solution:**
- ✅ **Card-Based System** - Visual, intuitive
- ✅ **Real-time Updates** - Live data without manual refresh
- ❌ **Missing:** Guidance on what to look at based on investment style

### Problem 3: Lack of Personalization
**Traditional platforms:** One-size-fits-all approach.

**Our Solution:**
- ✅ **Customizable Workspace** - Users build their own dashboards
- ✅ **Compass Weighting** - Personalized rankings based on investment style
- ❌ **Missing:** Connection between personalized discovery and exploration

### Problem 4: Cold Start Problem
**The Critical Gap:** Users don't know where to begin.

**Current State:**
- Workspace requires users to know symbols
- Compass shows rankings but doesn't facilitate exploration
- No clear path from "I want to invest" to "here's what to explore"

**Impact:** High bounce rate, low activation, users leave before experiencing value.

---

## Why Compass Should Be The Star

### 1. **Solves the Discovery Problem**
Compass answers the fundamental question: **"What should I look at?"**

- **For Beginners:** "I want to invest but don't know where to start" → Compass shows top stocks for their investment style
- **For Professionals:** "I want to find undervalued growth stocks" → Adjust weights, see rankings, explore top candidates

### 2. **Personalized Entry Point**
Compass provides **7 preset investor profiles:**
- Value Investor
- Growth Investor
- Smart Growth (GARP)
- Income Investor
- Quality Investing
- Defensive
- Balanced

**Value:** Users can immediately see stocks ranked by their investment philosophy, not a generic list.

### 3. **Bridges Discovery → Exploration**
**Current Gap:** Compass shows rankings, but users can't easily explore those stocks.

**Opportunity:** Make Compass the **launchpad** that drives users to Workspace:
- Click a ranked stock → Auto-add to Workspace
- See top 3 stocks → "Explore These" button → Add all to Workspace
- Adjust weights → See new rankings → Explore top candidates

### 4. **Differentiates from Competitors**
Most financial platforms show:
- Generic stock lists
- Popular stocks (by volume)
- Trending stocks (by price movement)

**Compass is unique:** Personalized, multi-dimensional ranking based on **5 financial pillars:**
- Value (P/B, P/S, EV multiples)
- Growth (PEG ratio)
- Profitability (Net profit margin, Asset turnover)
- Income (Dividend yield)
- Health (Debt-to-equity)

**This is proprietary value** that competitors don't offer.

### 5. **Creates a Habit Loop**
**Ideal User Journey:**
1. **Daily Check Compass** → "What's ranking well for my investment style today?"
2. **See New Opportunities** → Stocks that moved up in rankings
3. **Explore in Workspace** → Add top candidates, deep dive with cards
4. **Track Performance** → Monitor how discovered stocks perform
5. **Return to Compass** → Adjust weights, discover more

**This creates daily engagement** and makes Tickered a habit, not a one-time tool.

---

## Business Value Analysis

### Current Value Proposition
**Workspace:** "Explore financial data through interactive cards"
- **Value:** High for users who know what to explore
- **Activation Barrier:** High (requires knowledge of symbols)
- **Retention:** Medium (useful but not habit-forming)

**Compass:** "See top stocks ranked by your investment style"
- **Value:** High for discovery, but disconnected from exploration
- **Activation Barrier:** Low (just adjust weights and see results)
- **Retention:** Low (no clear next step)

### Proposed Value Proposition (Compass-First)
**Compass:** "Discover stocks that match your investment style, then explore them in depth"
- **Value:** High (solves discovery + exploration)
- **Activation Barrier:** Low (one-click to see personalized rankings)
- **Retention:** High (daily check-in, habit-forming)

**Workspace:** "Deep dive into stocks you discovered in Compass"
- **Value:** High (contextualized exploration)
- **Activation Barrier:** Low (comes from Compass discovery)
- **Retention:** High (exploring discovered opportunities)

---

## Recommended User Journey (Compass-First)

### Journey 1: First-Time User
1. **Landing Page** → "Spot the Trends, See the Moves"
2. **Sign Up / Login**
3. **Onboarding:** "What's your investment style?" → Select profile (Value, Growth, etc.)
4. **Compass (Default View)** → See top 50 stocks for their style
5. **"Explore Top 3" Button** → Auto-adds top 3 stocks to Workspace
6. **Workspace** → User sees cards for discovered stocks, can explore deeper

**Key Change:** Compass is the **default landing page** for authenticated users, not Workspace.

### Journey 2: Returning User
1. **Login** → Redirect to Compass (not Workspace)
2. **Compass** → See updated rankings, notice new stocks in top 10
3. **Click Stock** → Quick preview card appears
4. **"Add to Workspace"** → Stock added, user can explore
5. **Workspace** → Deep dive into discovered stocks

**Key Change:** Compass is the **home base**, Workspace is the **exploration tool**.

### Journey 3: Power User
1. **Compass** → Adjust weights manually, see custom rankings
2. **Filter/Sort** → By sector, market cap, exchange
3. **Compare** → Select multiple stocks, compare side-by-side
4. **Workspace** → Build sophisticated dashboards from discoveries

**Key Change:** Compass becomes a **sophisticated discovery tool**, not just a table.

---

## Product Recommendations

### Priority 1: Make Compass the Entry Point
**Changes:**
- **Default Landing:** Authenticated users land on `/compass`, not `/workspace`
- **Onboarding:** First-time users select investment profile → see Compass
- **Navigation:** Compass is the first item in header (before Workspace)

**Impact:** Solves cold start problem, increases activation.

### Priority 2: Connect Compass to Workspace
**Changes:**
- **Click Stock in Compass** → Opens preview card or adds to Workspace
- **"Explore Top 3" Button** → One-click to add top stocks to Workspace
- **"Add to Workspace" Button** → On each ranked stock
- **Workspace Breadcrumb** → "Discovered in Compass" indicator

**Impact:** Creates seamless discovery → exploration flow.

### Priority 3: Enhance Compass UX
**Changes:**
- **Visual Rankings** → Replace table with card-based layout
- **Stock Cards** → Show key metrics (price, change, score) in Compass view
- **Quick Actions** → "Add to Workspace", "View Details", "Compare"
- **Filters** → By sector, market cap, exchange
- **Sort Options** → By score, price, change, volume

**Impact:** Makes Compass more engaging and actionable.

### Priority 4: Add Discovery Features
**Changes:**
- **"New in Top 10" Badge** → Highlight stocks that moved up
- **"Trending Up" Indicator** → Show stocks gaining in rankings
- **"Similar Stocks"** → Based on pillar scores
- **"Watchlist"** → Save stocks from Compass for later

**Impact:** Creates daily engagement and habit loop.

### Priority 5: Personalization
**Changes:**
- **Save Custom Profiles** → Users can save their weight configurations
- **"My Compass"** → Personalized view with saved profiles
- **Historical Rankings** → See how stocks ranked over time
- **Alerts** → Notify when stocks enter top 10 for their profile

**Impact:** Increases retention and makes Compass indispensable.

---

## Metrics to Track

### Activation Metrics
- **Compass Page Views** → Are users discovering Compass?
- **Profile Selection Rate** → Are users personalizing their view?
- **Stocks Added to Workspace from Compass** → Is discovery leading to exploration?

### Engagement Metrics
- **Daily Compass Check-ins** → Is Compass becoming a habit?
- **Weight Adjustments** → Are users experimenting with profiles?
- **Workspace Cards from Compass** → Is the flow working?

### Retention Metrics
- **7-Day Return Rate** → Are users coming back?
- **30-Day Active Users** → Is Compass driving long-term engagement?
- **Workspace Usage After Compass** → Is discovery leading to exploration?

---

## Competitive Analysis

### What Competitors Offer
- **Yahoo Finance:** Generic stock lists, trending stocks
- **Bloomberg:** Professional tools, no personalization
- **Robinhood:** Popular stocks, no ranking system
- **Seeking Alpha:** Articles and analysis, no discovery engine

### Our Differentiation
**Compass is unique:**
- **Multi-dimensional ranking** (5 pillars, not just price or volume)
- **Personalized by investment style** (not one-size-fits-all)
- **Actionable discovery** (leads directly to exploration)
- **Real-time updates** (rankings update as data changes)

**This is a defensible moat** that competitors can't easily replicate.

---

## Conclusion

**Current State:** Compass is a hidden gem that's underutilized. Workspace is the star, but it has a high activation barrier.

**Recommended State:** Compass becomes the **entry point and discovery engine** that drives users to Workspace. It solves the cold start problem and creates a habit loop.

**Business Impact:**
- ✅ **Higher Activation** → Users have a clear starting point
- ✅ **Higher Retention** → Daily Compass check-ins create habits
- ✅ **Higher Engagement** → Discovery → Exploration flow
- ✅ **Differentiation** → Unique value proposition competitors don't offer

**Next Steps:**
1. Make Compass the default landing page for authenticated users
2. Add "Add to Workspace" functionality to Compass
3. Enhance Compass UX (cards instead of table, quick actions)
4. Track metrics to validate the hypothesis

---

## Questions for Product Discovery

1. **User Research:** Do users understand what Compass does? Do they see value in personalized rankings?
2. **A/B Testing:** Test Compass-first vs. Workspace-first for new users
3. **Analytics:** Are users clicking stocks in Compass? Are they adding them to Workspace?
4. **Feedback:** What do users want to do after seeing Compass rankings?

---

**Document Status:** Initial Analysis
**Next Review:** After user research and analytics review

