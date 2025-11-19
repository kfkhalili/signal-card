-- Populate listed_symbols with distinct symbols from live_quote_indicators
-- This will insert ~18k symbols that are actively traded

INSERT INTO "public"."listed_symbols" ("symbol", "is_active", "added_at")
SELECT DISTINCT
    "symbol",
    TRUE as "is_active",
    NOW() as "added_at"
FROM "public"."live_quote_indicators"
WHERE "symbol" IS NOT NULL
    AND "symbol" != ''
ON CONFLICT ("symbol") DO NOTHING;

COMMENT ON TABLE "public"."listed_symbols" IS 'Populated with distinct symbols from live_quote_indicators. Contains ~18k symbols available for selection in the symbol picker.';

