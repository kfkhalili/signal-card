/**
 * ESLint rule to enforce Contract #6a: Content-Length quota tracking
 *
 * Contract #6a requires that all functions using complete_queue_job must track
 * quota using the Content-Length header from the HTTP response.
 *
 * This ensures accurate quota tracking by using the actual data transfer size
 * (what the API bills for), not JSON.stringify().length (which measures the
 * parsed object, not the HTTP payload).
 */

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce Contract #6a: Content-Length quota tracking',
      category: 'Possible Errors',
      recommended: true,
    },
    messages: {
      missingContentLength: 'Contract #6a violation: Functions using complete_queue_job must track quota using Content-Length header. Missing response.headers.get("Content-Length").',
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

        // Must use Content-Length header (check for various quote styles)
        const usesContentLength =
          text.includes("response.headers.get('Content-Length')") ||
          text.includes('response.headers.get("Content-Length")') ||
          text.includes("headers.get('Content-Length')") ||
          text.includes('headers.get("Content-Length")') ||
          text.includes("get('Content-Length')") ||
          text.includes('get("Content-Length")');

        // Must use complete_queue_job (which requires actualSizeBytes parameter)
        const usesCompleteQueueJob = text.includes('complete_queue_job');

        // If the function uses complete_queue_job but doesn't track Content-Length, report error
        if (usesCompleteQueueJob && !usesContentLength) {
          context.report({
            node,
            messageId: 'missingContentLength',
          });
        }
      },
    };
  },
};

