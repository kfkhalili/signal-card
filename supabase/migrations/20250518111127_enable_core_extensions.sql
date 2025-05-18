-- supabase/migrations/20250518111127_enable_core_extensions.sql
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions; -- If you use gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;