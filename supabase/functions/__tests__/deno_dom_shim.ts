/**
 * Node/Jest shim for deno_dom.
 * Deno uses https://deno.land/x/deno_dom (WASM); in Node we use linkedom
 * so the same lib code (fetch-sec-outstanding-shares) works in both runtimes.
 */
export { DOMParser } from "linkedom";
