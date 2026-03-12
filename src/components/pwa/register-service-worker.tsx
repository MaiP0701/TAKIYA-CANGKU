"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let disposed = false;

    async function cleanupLegacyServiceWorker() {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();

        if (disposed || registrations.length === 0) {
          return;
        }

        const hasReloadedKey = "sw-cleanup-reloaded";
        const handleControllerChange = () => {
          if (disposed || sessionStorage.getItem(hasReloadedKey) === "1") {
            return;
          }

          sessionStorage.setItem(hasReloadedKey, "1");
          window.location.reload();
        };

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

        const registration = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none"
        });
        await registration.update();

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }

        return () => {
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            handleControllerChange
          );
        };
      } catch (error) {
        console.error("Service worker cleanup failed", error);
      }
    }

    let removeListener: (() => void) | undefined;
    void cleanupLegacyServiceWorker().then((cleanup) => {
      removeListener = cleanup;
    });

    return () => {
      disposed = true;
      removeListener?.();
    };
  }, []);

  return null;
}
