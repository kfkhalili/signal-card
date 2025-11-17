# Architecture Documentation

This directory contains the canonical architecture and build documentation for Tickered's backend-controlled refresh system.

## Reading Order

Read these documents in order:

0. **[00-IMPLEMENTATION-PLAN.md](./00-IMPLEMENTATION-PLAN.md)** - Complete implementation plan (what I'll build)
1. **[01-BUILD-ANSWERS.md](./01-BUILD-ANSWERS.md)** - Quick answers to build readiness questions
   - Is the codebase ready?
   - How to build without breaking things?
   - How to track progress?
   - How to avoid breaking things without tests?

2. **[02-BUILD-READINESS-ASSESSMENT.md](./02-BUILD-READINESS-ASSESSMENT.md)** - Detailed readiness analysis
   - Current state assessment
   - Risk analysis
   - Recommended approach
   - Timeline estimates

3. **[03-SAFETY-MECHANISMS.md](./03-SAFETY-MECHANISMS.md)** - Safety procedures for building
   - Feature flags system
   - Parallel system pattern
   - Manual testing checklists
   - Monitoring & rollback procedures

4. **[04-BUILD-TRACKING.md](./04-BUILD-TRACKING.md)** - Progress tracking
   - Phase-by-phase checklists
   - Daily/weekly review templates
   - Migration status tracking
   - Quick reference commands

## Reference Documentation

- **[MASTER-ARCHITECTURE.md](./MASTER-ARCHITECTURE.md)** - The canonical architecture specification
  - Complete system design
  - All Sacred Contracts
  - Implementation details
  - Migration strategy
  - **Read this as a reference while building**

## Archived Documents

- **[archived/](./archived/)** - Stashed documents (not relevant to current build)
  - `architectural-analysis.md.stashed` - Code quality analysis (stashed)
  - `refactoring-implementation-guide.md.stashed` - Refactoring guide (stashed)

---

## Quick Start

**New to the build?** Start with [00-IMPLEMENTATION-PLAN.md](./00-IMPLEMENTATION-PLAN.md) to see what will be built, then read [01-BUILD-ANSWERS.md](./01-BUILD-ANSWERS.md) for quick answers.

**Ready to build?** Follow the order above, then use [04-BUILD-TRACKING.md](./04-BUILD-TRACKING.md) to track progress.

**Need implementation details?** Reference [MASTER-ARCHITECTURE.md](./MASTER-ARCHITECTURE.md) as you build.

