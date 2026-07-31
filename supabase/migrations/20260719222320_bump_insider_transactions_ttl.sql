-- Migration: Bump TTL for insider-transactions to 48 hours (2880 minutes)
UPDATE public.data_type_registry_v2
SET default_ttl_minutes = 2880,
    updated_at = NOW()
WHERE data_type = 'insider-transactions';
