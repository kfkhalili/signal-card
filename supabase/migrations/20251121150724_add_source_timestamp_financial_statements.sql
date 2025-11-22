-- Add source_timestamp_column for financial-statements data type
-- This enables source timestamp validation to prevent "data laundering" of stale data

UPDATE data_type_registry_v2
SET source_timestamp_column = 'accepted_date',
    updated_at = NOW()
WHERE data_type = 'financial-statements';

COMMENT ON COLUMN data_type_registry_v2.source_timestamp_column IS 'Column name in API response for source timestamp validation. Used to detect stale data from API caching bugs. For financial-statements, uses accepted_date (when SEC accepted the filing).';

