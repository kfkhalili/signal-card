# Architecture Documentation

This directory contains the canonical architecture and operational documentation for Tickered's backend-controlled refresh system.

**System Status:** ✅ Fully Operational (100% Complete - Production Ready)

---

## Current Status

- **[PROGRESS-SUMMARY-2025-11-20.md](./PROGRESS-SUMMARY-2025-11-20.md)** ⭐ - **Start here**
  - Current system status (100% complete, production ready)
  - Recent enhancements (event-driven processing, monitoring)
  - System health metrics
  - Production readiness assessment

---

## Core Documentation

### Architecture Reference

- **[MASTER-ARCHITECTURE.md](./MASTER-ARCHITECTURE.md)** ⭐ - The canonical architecture specification
  - Complete system design
  - All Sacred Contracts
  - Implementation details
  - **Primary reference for system understanding**

### System Flow & Operations

- **[OPERATIONAL_RUNBOOK.md](./OPERATIONAL_RUNBOOK.md)** - Operational procedures and troubleshooting
  - Troubleshooting guides
  - Common issues and fixes
  - Emergency procedures
  - System flow documentation

### Development Guidelines

- **Migration Principles** - Covered in `.cursor/rules/migrations-vs-direct-operations.mdc`
  - Automatically enforced via cursor rules
  - What should be in migrations vs direct SQL operations
  - Decision tree and examples

### Analysis Page Calculations

- **[ANALYSIS_PAGE_CALCULATIONS.md](./ANALYSIS_PAGE_CALCULATIONS.md)** - Complete documentation of all calculations on the Symbol Analysis Page
  - ROIC, NOPAT, Invested Capital calculations
  - Valuation metrics (DCF, P/E, PEG)
  - Quality metrics (ROIC, WACC, FCF Yield)
  - Safety metrics (Net Debt/EBITDA, Altman Z-Score, Interest Coverage)
  - Status classification algorithms
  - **Primary reference for calculation logic**

- **[ANALYSIS_PAGE_CALCULATIONS_CORRECTNESS.md](./ANALYSIS_PAGE_CALCULATIONS_CORRECTNESS.md)** - Original correctness analysis
  - Issue identification and edge case analysis
  - Recommendations and testing coverage
  - **Reference for calculation validation**


### Monitoring & Operations

- **[UPTIMEROBOT_SETUP_GUIDE.md](./UPTIMEROBOT_SETUP_GUIDE.md)** - Complete UptimeRobot monitoring setup
  - Operational metrics monitoring (queue, quota, stuck jobs)
  - System liveness monitoring (cron jobs)
  - Alert configuration and testing

- **[MONITORING_QUERIES.md](./MONITORING_QUERIES.md)** - SQL queries for monitoring
  - Queue health queries
  - Quota usage queries
  - Performance analysis queries

- **[OPERATIONAL_RUNBOOK.md](./OPERATIONAL_RUNBOOK.md)** - Operational procedures
  - Troubleshooting guides
  - Common issues and fixes
  - Emergency procedures

---

## Archived Documents

- **[archived/](./archived/)** - Historical and completed documents
  - `completed-migrations/` - Migration plans (completed)
  - `completed-fixes/` - Fix documentation (completed)
    - `analysis-page-calculations/` - Analysis page calculation fixes (2025-01-26)
      - Fix plan, critical review, threshold research, and completion summary
  - `completed-implementations/` - Implementation documentation (completed)
    - `custom-cards/` - Custom card implementation and refactoring (2025-01-26)
      - Original implementation docs and refactoring summary
  - `completed-evaluations/` - Completed evaluation and verification documents (2025-01-26)
    - On-demand API progress evaluation
    - Architecture checklist verification
  - `future-enhancements/` - Planning documents for future work (2025-01-26)
    - WACC full implementation plan (simplified version is already implemented)
  - `historical-analysis/` - Historical error analysis and reports
  - `outdated-status/` - Build planning docs (system is complete)
    - Implementation plans
    - Build readiness assessments
    - Safety mechanisms
    - Progress tracking
    - Testing guides
    - Migration automation guides

---

## Quick Reference

**Understanding the system?** Read [PROGRESS-SUMMARY-2025-11-20.md](./PROGRESS-SUMMARY-2025-11-20.md) first, then [MASTER-ARCHITECTURE.md](./MASTER-ARCHITECTURE.md) for details.

**Troubleshooting?** Check [OPERATIONAL_RUNBOOK.md](./OPERATIONAL_RUNBOOK.md) for procedures and [MASTER-ARCHITECTURE.md](./MASTER-ARCHITECTURE.md) for system details. For historical error analysis, see [archived/historical-analysis/](./archived/historical-analysis/).

**Creating migrations?** Follow the migration principles in `.cursor/rules/migrations-vs-direct-operations.mdc` (automatically enforced).

**Setting up monitoring?** See [UPTIMEROBOT_SETUP_GUIDE.md](./UPTIMEROBOT_SETUP_GUIDE.md) for complete monitoring setup.

**Historical context?** See [archived/outdated-status/](./archived/outdated-status/) for build planning documents and [archived/completed-migrations/](./archived/completed-migrations/) for completed migration plans.

