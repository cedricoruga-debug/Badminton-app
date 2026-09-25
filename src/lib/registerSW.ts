"use client";

/**
 * Registers public/sw.js — the service worker that lets the dashboard keep
 * working (and the app be installed to a home screen) with no signal. See
 * that file's header comment for what it actually caches and why.
 *
 * Called once from AppChrome (client-side, so it only ever runs in the
 * browser). Safe to call on every render — `register()` is a no-op if the
 * same script URL is already registered, and older browsers/contexts
 * without `serviceWorker` support (e.g. some in-app webviews) just skip it
 * silently rather than erroring the whole app over a progressive-enhancement
 * feature.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration can fail for reasons outside our control (e.g. running
      // over plain http in local dev, or a browser that blocks it) — the
      // app is fully usable without offline support, so this is silent
      // rather than surfaced as an error.
    });
  });
}
