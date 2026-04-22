const SCRIPT_ID = "google-maps-js-places";

let loadPromise: Promise<void> | null = null;

/**
 * Loads the Maps JavaScript API with the Places library once per page.
 * Requires a key with Places API enabled and (typically) billing on the GCP project.
 */
export function ensureGooglePlacesScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("ensureGooglePlacesScript is browser-only"));
  }

  if (globalThis.google?.maps?.places) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const done = () => {
      if (globalThis.google?.maps?.places) {
        resolve();
      } else {
        loadPromise = null;
        reject(new Error("Google Maps loaded without Places library"));
      }
    };

    const fail = () => {
      loadPromise = null;
      reject(new Error("Failed to load Google Maps JavaScript API"));
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (script?.dataset.loaded === "1") {
      done();
      return;
    }

    const onLoad = () => {
      script?.setAttribute("data-loaded", "1");
      done();
    };

    if (script) {
      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", fail, { once: true });
      return;
    }

    script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", fail, { once: true });
    document.head.appendChild(script);
  });

  return loadPromise;
}
