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

- **[CARD-OPEN-TO-JOB-CREATION-FLOW.md](./CARD-OPEN-TO-JOB-CREATION-FLOW.md)** - Data flow documentation
  - How cards trigger data fetching (event-driven + background)
  - Queue system integration
  - Real-time update flow
  - Exchange status checks


### Development Guidelines

- **[MIGRATION-PRINCIPLES.md](./MIGRATION-PRINCIPLES.md)** - Guidelines for database migrations
  - What should be in migrations
  - What should NOT be in migrations
  - Migration naming conventions
  - Verification checklist

- **[HANDLE-NEW-USER-FUNCTION-EXPLANATION.md](./HANDLE-NEW-USER-FUNCTION-EXPLANATION.md)** - Function documentation
  - How the new user webhook works
  - Configuration and setup
  - Troubleshooting guide

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
  - `completed-implementations/` - Implementation documentation (completed)
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

**Troubleshooting?** Check [CARD-OPEN-TO-JOB-CREATION-FLOW.md](./CARD-OPEN-TO-JOB-CREATION-FLOW.md) and [OPERATIONAL_RUNBOOK.md](./OPERATIONAL_RUNBOOK.md). For historical error analysis, see [archived/historical-analysis/](./archived/historical-analysis/).

**Creating migrations?** Follow [MIGRATION-PRINCIPLES.md](./MIGRATION-PRINCIPLES.md).

**Setting up monitoring?** See [UPTIMEROBOT_SETUP_GUIDE.md](./UPTIMEROBOT_SETUP_GUIDE.md) for complete monitoring setup.

**Historical context?** See [archived/outdated-status/](./archived/outdated-status/) for build planning documents and [archived/completed-migrations/](./archived/completed-migrations/) for completed migration plans.

