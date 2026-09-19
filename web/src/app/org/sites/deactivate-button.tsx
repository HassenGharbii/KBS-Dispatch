"use client";

import { useTransition } from "react";
import { deactivateSite } from "./actions";

export function DeactivateButton({ siteId }: { siteId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await deactivateSite(siteId);
        })
      }
      disabled={pending}
      className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
    >
      Désactiver
    </button>
  );
}
