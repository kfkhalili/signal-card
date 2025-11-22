# DATABASE_URL Setup Guide

## What is DATABASE_URL?

`DATABASE_URL` is a PostgreSQL connection string used by `psql` and other database tools to connect to your database. It's used by the contract test scripts to run tests against your database.

## Test Target: Local vs Production

**Default: Local Supabase Database** ✅

Contract tests are designed to run against your **local Supabase database** by default. This is the safest and most practical approach:

- ✅ **Safe** - No risk to production
- ✅ **Fast** - Quick iteration during development
- ✅ **Pre-deployment** - Catch issues before deploying
- ✅ **Read-only** - Tests only check function definitions, not data

**Production Testing:**

You can test against production, but be explicit and cautious:
- Set `DATABASE_URL` explicitly to production connection string
- Tests are read-only (check structure only), but still exercise the database
- Prefer local testing for development

## Format

The format is:
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

### Examples

**Local Supabase (default):**
```
postgresql://postgres:postgres@localhost:54322/postgres
```

**Supabase Production:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Full example with all components:**
```
postgresql://username:password@hostname.example.com:5432/database_name
```

## Where to Set It

### Option 1: Environment Variable (Temporary - Current Shell Session)

```bash
# For local Supabase
export DATABASE_URL='postgresql://postgres:postgres@localhost:54322/postgres'

# Or get it automatically from Supabase CLI
export DATABASE_URL=$(supabase status | grep 'DB URL' | awk '{print $3}')
```

**Note:** This only lasts for your current terminal session. Close the terminal and you'll need to set it again.

### Option 2: .env File (Recommended for Local Development)

Create a `.env.local` file in the project root (this file is gitignored):

```bash
# .env.local
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

Then source it before running tests:
```bash
source .env.local
npm run test:contracts
```

### Option 3: Shell Profile (Persistent)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Supabase Local Database URL
export DATABASE_URL='postgresql://postgres:postgres@localhost:54322/postgres'
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

## Getting DATABASE_URL from Supabase CLI

### Local Supabase

If you have Supabase running locally:

```bash
# Start Supabase (if not already running)
supabase start

# Get the database URL
supabase status | grep 'DB URL'
```

This will output something like:
```
DB URL                 postgresql://postgres:postgres@localhost:54322/postgres
```

You can extract just the URL:
```bash
export DATABASE_URL=$(supabase status | grep 'DB URL' | awk '{print $3}')
```

### Production Supabase

For production, get the connection string from:
1. Supabase Dashboard → Project Settings → Database
2. Look for "Connection string" or "Connection pooling"
3. Use the "URI" format (not "Session mode" or "Transaction mode" for tests)

**Important:** For production, you'll need:
- The database password (found in Dashboard → Project Settings → Database → Database password)
- The connection pooler URL (usually ends with `.pooler.supabase.com:6543`)

## Quick Setup Script

You can add this to your `package.json` scripts:

```json
{
  "scripts": {
    "test:contracts:local": "export DATABASE_URL=$(supabase status | grep 'DB URL' | awk '{print $3}') && npm run test:contracts"
  }
}
```

Then run:
```bash
npm run test:contracts:local
```

## Verification

To verify your DATABASE_URL is set correctly:

```bash
# Check if it's set
echo $DATABASE_URL

# Test the connection
psql "$DATABASE_URL" -c "SELECT version();"
```

If this works, you're all set!

## Security Note

⚠️ **Never commit DATABASE_URL to git!**

- Add `.env.local` to `.gitignore` (should already be there)
- Never put production database URLs in version control
- Use environment variables or secure secret management for production

