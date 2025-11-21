# Architecture Documentation

This directory contains the canonical architecture and operational documentation for Tickered's backend-controlled refresh system.

**System Status:** ✅ Fully Operational (98%+ Complete)

---

## Current Status

- **[PROGRESS-SUMMARY-2025-11-20.md](./PROGRESS-SUMMARY-2025-11-20.md)** ⭐ - **Start here**
  - Current system status (98%+ complete)
  - Recent fixes and improvements
  - System health metrics
  - Remaining work

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
  - How cards trigger data fetching
  - Queue system integration
  - Real-time update flow
  - Exchange status checks

- **[API_QUEUE_ERROR_ANALYSIS.md](./API_QUEUE_ERROR_ANALYSIS.md)** - Queue error analysis and fixes
  - Error breakdown and patterns
  - Root cause analysis
  - Fix implementations
  - Recent error resolution

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

---

## Archived Documents

- **[archived/](./archived/)** - Historical and completed documents
  - `completed-migrations/` - Migration cleanup documentation (completed)
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

**Troubleshooting?** Check [API_QUEUE_ERROR_ANALYSIS.md](./API_QUEUE_ERROR_ANALYSIS.md) and [CARD-OPEN-TO-JOB-CREATION-FLOW.md](./CARD-OPEN-TO-JOB-CREATION-FLOW.md).

**Creating migrations?** Follow [MIGRATION-PRINCIPLES.md](./MIGRATION-PRINCIPLES.md).

**Historical context?** See [archived/outdated-status/](./archived/outdated-status/) for build planning documents.

