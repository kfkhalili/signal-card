/**
 * ESLint rule to enforce Contract #14: Source timestamp checking
 *
 * Contract #14 requires that functions using complete_queue_job should check
 * source timestamps if source_timestamp_column is defined in the registry.
 *
 * This prevents "Liar API Stale Data" catastrophe where the API returns 200 OK
 * with valid shape and sanity, but the data itself may be stale (e.g., API caching
 * bug returns 3-day-old data). We must compare source timestamps to prevent
 * "data laundering" where stale data is marked as fresh.
 *
 * Note: This is a warning, not an error, because registry lookup is dynamic and
 * we can't statically verify if source_timestamp_column is defined for a given
 * data type. However, we can at least verify the pattern exists.
 */

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce Contract #14: Source timestamp checking',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      missingSourceTimestamp: 'Contract #14 warning: Functions using complete_queue_job should check source timestamps if source_timestamp_column is defined in registry. Consider adding source timestamp validation.',
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

        // Must check source timestamp if source_timestamp_column is defined
        // This is harder to enforce statically, but we can check for the pattern
        const hasSourceTimestampCheck =
          (text.includes('source_timestamp_column') &&
            (text.includes('newSourceTimestamp') ||
              text.includes('oldSourceTimestamp') ||
              text.includes('sourceTimestamp') ||
              text.includes('api_timestamp') ||
              text.includes('timestamp') ||
              text.includes('accepted_date') ||
              text.includes('date'))) ||
          // Alternative pattern: checking registry for source_timestamp_column
          (text.includes("from('data_type_registry_v2')") &&
            text.includes('source_timestamp_column') &&
            (text.includes('select') || text.includes('SELECT')));

        // Must use complete_queue_job (which means it's a data-fetching function)
        const usesCompleteQueueJob = text.includes('complete_queue_job');

        // Note: This is a weaker check - we can't statically verify the registry lookup
        // But we can at least verify the pattern exists
        // Only warn if the function uses complete_queue_job but doesn't have source timestamp check
        if (usesCompleteQueueJob && !hasSourceTimestampCheck) {
          context.report({
            node,
            messageId: 'missingSourceTimestamp',
            severity: 1, // Warning, not error, because registry lookup is dynamic
          });
        }
      },
    };
  },
};

