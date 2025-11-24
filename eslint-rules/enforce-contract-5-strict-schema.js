/**
 * ESLint rule to enforce Contract #5: Strict schema parsing (Zod)
 *
 * Contract #5 requires that all functions in supabase/functions/lib/ that use
 * complete_queue_job or fail_queue_job must use strict Zod schema parsing.
 *
 * This prevents "Schema Drift" data corruption where APIs change field names
 * without versioning, causing undefined values to be written as NULL.
 */

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce Contract #5: Strict schema parsing (Zod)',
      category: 'Possible Errors',
      recommended: true,
    },
    messages: {
      missingZod: 'Contract #5 violation: Functions using queue operations must use strict Zod schema parsing. Missing zod import or z.object definition.',
    },
  },
  create(context) {
    return {
      Program(node) {
        const filename = context.getFilename();

        // Only check files in supabase/functions/lib/
        if (!filename.includes('supabase/functions/lib/')) {
          return;
        }

        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText();

        // Must import zod (check for both Deno-style and npm-style imports)
        const hasZodImport =
          text.includes("import") &&
          (text.includes("from 'zod'") ||
            text.includes('from "zod"') ||
            text.includes("from 'https://deno.land/x/zod") ||
            text.includes('from "https://deno.land/x/zod') ||
            text.includes("zod@") ||
            text.includes("'zod'") ||
            text.includes('"zod"'));

        // Must have z.object definition (the actual schema)
        const hasZodObject =
          text.includes("z.object") ||
          text.includes("z.object(") ||
          text.includes("Schema = z.object");

        // Must use complete_queue_job or fail_queue_job (indicates it's a data-fetching function)
        const usesQueueFunctions =
          text.includes('complete_queue_job') ||
          text.includes('fail_queue_job');

        // If the function uses queue operations but doesn't have Zod validation, report error
        if (usesQueueFunctions && (!hasZodImport || !hasZodObject)) {
          context.report({
            node,
            messageId: 'missingZod',
          });
        }
      },
    };
  },
};

