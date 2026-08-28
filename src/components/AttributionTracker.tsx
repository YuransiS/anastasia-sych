"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { getMarketingAttribution } from "@/lib/attribution";

function AttributionTrackerInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const attr = getMarketingAttribution();
      if (!attr || !attr.visitor_uuid) return;

      // Dispatch cold visit event to server
      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...attr,
          is_cold: true,
          status: "Клик",
          page_path: pathname || window.location.pathname,
          page_url: typeof window !== "undefined" ? window.location.href : "",
        }),
      }).catch((err) => {
        console.warn("[AttributionTracker] Cold session dispatch error:", err);
      });
    } catch (e) {
      console.warn("[AttributionTracker] Initialization error:", e);
    }
  }, [searchParams, pathname]);

  return null;
}

export function AttributionTracker() {
  return (
    <Suspense fallback={null}>
      <AttributionTrackerInner />
    </Suspense>
  );
}

export default AttributionTracker;
