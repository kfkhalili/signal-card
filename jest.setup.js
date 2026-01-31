/* eslint-env node, jest */
/* global global, process */
import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfill for TextEncoder/TextDecoder (required by Effect library in Jest environment)
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill Deno when running supabase/functions tests under Jest (Node)
if (typeof globalThis.Deno === 'undefined') {
  globalThis.Deno = {
    args: process.env.TEST_SYMBOL ? [process.env.TEST_SYMBOL] : [],
    exit: (code) => {
      throw new Error(`Deno.exit(${code})`);
    },
    env: {
      get: (key) => process.env[key],
    },
  };
}
