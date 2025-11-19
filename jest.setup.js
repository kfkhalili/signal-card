import "@testing-library/jest-dom";

// Polyfill for TextEncoder/TextDecoder (required by Effect library in Jest environment)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
