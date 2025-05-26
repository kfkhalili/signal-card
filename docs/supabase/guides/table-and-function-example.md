# Guide: Supabase Table & Edge Function Toy Example

This guide provides a simple, step-by-step example of how to create a table in your Supabase project and an Edge Function to populate it with data.

## 🚀 Overview

We will:

1.  **Create a `toy_products` table**: This table will store basic information about toy products.
2.  **Create an Edge Function `Workspace-toy-products`**: This function will generate some mock toy product data and upsert it into the `toy_products` table.

## 1. Setting up Your Supabase Project

Ensure you have a Supabase project created and the Supabase CLI installed and configured.

- **Install Supabase CLI**: [Official Guide](https://supabase.com/docs/guides/cli)
- **Login to CLI**: `supabase login`
- **Link your project** (if not already done): `supabase link --project-ref <your-project-ref>`
- **Start local development environment** (optional but recommended): `supabase start`

## 2. Creating the `toy_products` Table

We'll use a SQL migration to define our table.

### A. Create a Migration File

In your project's root directory, run:

```bash
supabase migrations new create_toy_products_table
```

This creates a file like `supabase/migrations/YYYYMMDDHHMMSS_create_toy_products_table.sql`.

## B. Define the Table Schema

Edit the generated SQL file:

File: `supabase/migrations/YYYYMMDDHHMMSS_create_toy_products_table.sql`

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_toy_products_table.sql

CREATE TABLE IF NOT EXISTS "public"."toy_products" (
"id" TEXT NOT NULL PRIMARY KEY, -- Unique ID for the toy
"name" TEXT NOT NULL, -- Name of the toy
"color" TEXT, -- Color of the toy
"price" NUMERIC(8, 2) DEFAULT 0.00, -- Price of the toy
"created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
"updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE "public"."toy_products" IS 'Stores information about toy products.';
COMMENT ON COLUMN "public"."toy_products"."id" IS 'Unique identifier for the toy product.';

-- Automatically update "updated_at" timestamp
CREATE OR REPLACE TRIGGER "handle_toy_products_updated_at"
BEFORE UPDATE ON "public"."toy_products"
FOR EACH ROW
EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');

-- Enable Row Level Security (RLS)
ALTER TABLE "public"."toy_products" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow public read-only access
DROP POLICY IF EXISTS "Allow public read access to toy_products" ON "public"."toy_products";
CREATE POLICY "Allow public read access to toy_products"
ON "public"."toy_products" FOR SELECT
TO anon, authenticated
USING (true);

-- Allow service_role full access (for Edge Function)
DROP POLICY IF EXISTS "Allow service_role full access to toy_products" ON "public"."toy_products";
CREATE POLICY "Allow service_role full access to toy_products"
ON "public"."toy_products" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant basic permissions
GRANT ALL ON TABLE "public"."toy_products" TO "service_role";
GRANT SELECT ON TABLE "public"."toy_products" TO "anon";
GRANT SELECT ON TABLE "public"."toy_products" TO "authenticated";

-- Optional: Add to realtime publication if you want clients to subscribe to changes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'toy_products'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.toy_products;
            RAISE NOTICE 'Table public.toy_products added to publication supabase_realtime.';
        END IF;
    END IF;
END $$;

```

### C. Apply the Migration

If using local development:

```bash
supabase migration up
```

This applies the migration to your local Supabase instance.
To apply to your linked Supabase project (staging/production):

```bash
supabase db push
```

(Use `supabase db push` with caution, especially on production. For production, consider a CI/CD workflow with `supabase migrations apply`).

## 3. Creating the Workspace-toy-products Edge Function

This function will generate mock data and insert it into the toy_products table.

### A. Create Function Files

Create a directory: `supabase/functions/fetch-toy-products/`

Inside this directory, create:

1. `types.ts` (for TypeScript interfaces)
2. `index.ts` (main function code)
3. `deno.json` (Deno import map)

File: `supabase/functions/fetch-toy-products/types.ts`

```typescript
// supabase/functions/fetch-toy-products/types.ts

export interface ToyProduct {
  id: string;
  name: string;
  color?: string | null;
  price: number;
}

export interface FunctionResult {
  success: boolean;
  message: string;
  upsertedCount?: number;
  error?: string;
}
```

File: `supabase/functions/fetch-toy-products/deno.json`

```typescript
// supabase/functions/fetch-toy-products/deno.json
{
    "imports": {
        "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.49.4"
    }
}
```

File: `supabase/functions/fetch-toy-products/index.ts

```typescript
//supabase/functions/fetch-toy-products/index.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { ToyProduct, FunctionResult } from "./types.ts";

const SUPABASE_URL: string | undefined = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY: string | undefined = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const generateMockToyProducts = (): ToyProduct[] => {
  return [
    { id: "toy-001", name: "Bouncing Ball", color: "Red", price: 5.99 },
    {
      id: "toy-002",
      name: "Building Blocks Set",
      color: "Multicolor",
      price: 29.99,
    },
    { id: "toy-003", name: "Plush Bear", color: "Brown", price: 15.0 },
    { id: "toy-004", name: "Race Car", color: "Blue", price: 12.5 },
  ];
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  console.log(
    `Edge function 'fetch-toy-products' invoked at: ${new Date().toISOString()}`
  );

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing Supabase URL or Service Role Key environment variables."
    );
    const result: FunctionResult = {
      success: false,
      error: "Server configuration error.",
      message: "Server configuration error.",
    };
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );
  let result: FunctionResult;

  try {
    const mockProducts: ToyProduct[] = generateMockToyProducts();

    // Map to the structure expected by the 'toy_products' table
    // Note: 'created_at' and 'updated_at' are handled by the database.
    const recordsToUpsert = mockProducts.map((product) => ({
      id: product.id,
      name: product.name,
      color: product.color,
      price: product.price,
    }));

    const { error, count } = await supabaseAdmin
      .from("toy_products")
      .upsert(recordsToUpsert, {
        onConflict: "id", // Upsert based on the 'id' column
        count: "exact",
      });

    if (error) {
      throw new Error(`Supabase upsert error: ${error.message}`);
    }

    result = {
      success: true,
      message: `Successfully upserted ${count || 0} toy products.`,
      upsertedCount: count || 0,
    };
    console.log(result.message);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const errorMessage =
      e instanceof Error ? e.message : "An unknown error occurred.";
    console.error(`Error in 'fetch-toy-products': ${errorMessage}`);
    result = {
      success: false,
      message: "Failed to process toy products.",
      error: errorMessage,
    };
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
```

### B. Set Environment Variables (for deployed function)

When you deploy the function, Supabase needs to know your project's URL and Service Role Key. These are automatically available to deployed functions if you've linked your project.For local testing (using `supabase functions serve`), you might need a `.env` file in the `supabase/functions/fetch-toy-products/` directory:

```bash
# supabase/functions/fetch-toy-products/.env (for local testing only)

SUPABASE_URL=http://localhost:54321 # Your local Supabase URL from `supabase start`
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key # From `supabase status` (anon and service role keys)
```

The `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are typically injected automatically when deployed to the Supabase platform.

### C. Deploy the Edge Function

`supabase functions deploy fetch-toy-products --no-verify-jwt`
(The `--no-verify-jwt` flag is often used for service functions that are called by cron jobs or other backend services, not directly by users. If users call it, you'd typically verify JWTs.)

### D. Invoke the Edge Function (for testing)

You can invoke your deployed function using its URL, which you can find in your Supabase project dashboard (Edge Functions > Workspace-toy-products > Details).Or using `curl` or a tool like Postman:

```bash
curl -X POST '<YOUR_FUNCTION_URL>' \
 -H "Authorization: Bearer <YOUR_SUPABASE_ANON_KEY_OR_SERVICE_ROLE_KEY>" \
 -H "Content-Type: application/json"
```

(For a function like this, which modifies data, using the `service_role_key` is appropriate if called from a trusted environment or cron job. If called from a client, ensure proper RLS and authentication.)

## 4. Scheduling the Edge Function (Optional)

If you want this function to run periodically (e.g., daily), you can use `pg_cron`.

### A. Create a Schedule SQL File

File: `supabase/schedules/schedule_fetch_toys.sql` (or add to an existing schedule file)

```sql
-- supabase/schedules/schedule_fetch_toys.sql

-- Example: Run daily at 3 AM UTC
SELECT cron.schedule(
'daily-fetch-toy-products', -- Unique name for the cron job
'0 3 \* \* \*', -- Cron expression: At 03:00 every day

$$
    SELECT
        net.http_post(
            url := current_setting('supabase.functions.url') || '/fetch-toy-products', -- Helper to get Edge Function URL
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
            ),
            body := '{}'::jsonb -- Empty body for this example
        ) AS request_id;
$$

);

-- To make this work, ensure:
-- 1. pg_cron is enabled in your Supabase project (Database > Extensions).
-- 2. You have stored your 'supabase_service_role_key' in Supabase Vault with the name 'supabase_service_role_key'.
-- Go to Project Settings > Vault, and add it as a new secret.
```

### B. Apply the Schedule

This SQL needs to be run against your database. You can do this via the Supabase SQL Editor or by including it in a migration if you prefer to manage schedules version-controlled.

## Conclusion

You've now created a Supabase table and an Edge Function to populate it. This toy example demonstrates the basic workflow. For real-world applications, your Edge Function would fetch data from an actual external API, include more robust error handling, and potentially more complex data transformation.
