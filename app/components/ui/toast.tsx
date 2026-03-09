"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={5000}
      closeButton
      toastOptions={{
        style: {
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-surface-border)",
          color: "var(--color-text-main)",
          fontSize: "14px",
        },
      }}
    />
  );
}

export { toast } from "sonner";
