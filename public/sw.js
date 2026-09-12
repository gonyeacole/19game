// A minimal service worker whose only job is to make this site eligible
// for Chrome/Edge's native "Add to Home Screen" install prompt — some
// versions require one to be registered before firing beforeinstallprompt.
// It doesn't cache anything; every request just passes straight through.
self.addEventListener("fetch", () => {});
