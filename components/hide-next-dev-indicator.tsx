"use client";

import { useEffect } from "react";

export default function HideNextDevIndicator() {
  useEffect(() => {
    const hideIndicator = () => {
      const portal = document.querySelector("nextjs-portal");

      if (!portal?.shadowRoot) {
        return;
      }

      if (portal.shadowRoot.querySelector("#hide-next-dev-indicator")) {
        return;
      }

      const style = document.createElement("style");
      style.id = "hide-next-dev-indicator";
      style.textContent = `
        [data-next-badge][data-error="false"] {
          display: none !important;
        }
      `;

      portal.shadowRoot.appendChild(style);
    };

    hideIndicator();

    const observer = new MutationObserver(() => {
      hideIndicator();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
