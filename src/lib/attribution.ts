"use client";

// Marketing Attribution & Tracking Helper for B&W CRM v2.0

export interface MarketingAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  fbclid?: string;
  gclid?: string;
  fbp?: string;
  fbc?: string;
  visitor_uuid: string;
  page_path: string;
  page_url: string;
}

const STORAGE_KEY = "bw_attribution_params";
const VISITOR_UUID_KEY = "bw_visitor_uuid";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  return undefined;
}

/**
 * Returns or generates a persistent visitor UUID stored in localStorage.
 */
export function getVisitorUUID(): string {
  if (typeof window === "undefined") return "";
  try {
    let visitorUuid = localStorage.getItem(VISITOR_UUID_KEY);
    if (!visitorUuid) {
      visitorUuid = crypto.randomUUID();
      localStorage.setItem(VISITOR_UUID_KEY, visitorUuid);
    }
    return visitorUuid;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Captures all marketing attribution parameters from current URL and cookies,
 * merges with any previously stored UTM parameters in localStorage, and returns a consolidated object.
 */
export function getMarketingAttribution(): MarketingAttribution {
  if (typeof window === "undefined") {
    return {
      visitor_uuid: "",
      page_path: "",
      page_url: "",
    };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const visitorUuid = getVisitorUUID();

  // Extract from current URL
  const currentSource = urlParams.get("utm_source") || undefined;
  const currentMedium = urlParams.get("utm_medium") || undefined;
  const currentCampaign = urlParams.get("utm_campaign") || undefined;
  const currentContent = urlParams.get("utm_content") || undefined;
  const currentTerm = urlParams.get("utm_term") || undefined;

  const currentCampaignId =
    urlParams.get("campaign_id") ||
    urlParams.get("utm_id") ||
    (currentCampaign && /^\d+$/.test(currentCampaign) ? currentCampaign : undefined);

  const currentAdsetId = urlParams.get("adset_id") || undefined;
  const currentAdId = urlParams.get("ad_id") || undefined;
  const currentFbclid = urlParams.get("fbclid") || undefined;
  const currentGclid = urlParams.get("gclid") || undefined;

  // Extract cookies
  const fbp = getCookie("_fbp");
  let fbc = getCookie("_fbc");

  // Construct _fbc if fbclid exists but cookie is not yet set
  if (!fbc && currentFbclid) {
    const timestamp = Date.now();
    fbc = `fb.1.${timestamp}.${currentFbclid}`;
  }

  // Retrieve stored attribution to avoid losing UTMs during internal navigation
  let stored: Partial<MarketingAttribution> = {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      stored = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("[Attribution] Error reading stored attribution:", e);
  }

  const consolidated: MarketingAttribution = {
    utm_source: currentSource || stored.utm_source || undefined,
    utm_medium: currentMedium || stored.utm_medium || undefined,
    utm_campaign: currentCampaign || stored.utm_campaign || undefined,
    utm_content: currentContent || stored.utm_content || undefined,
    utm_term: currentTerm || stored.utm_term || undefined,
    campaign_id: currentCampaignId || stored.campaign_id || undefined,
    adset_id: currentAdsetId || stored.adset_id || undefined,
    ad_id: currentAdId || stored.ad_id || undefined,
    fbclid: currentFbclid || stored.fbclid || undefined,
    gclid: currentGclid || stored.gclid || undefined,
    fbp: fbp || stored.fbp || undefined,
    fbc: fbc || stored.fbc || undefined,
    visitor_uuid: visitorUuid,
    page_path: window.location.pathname,
    page_url: window.location.href,
  };

  // Persist updated attribution
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consolidated));
  } catch (e) {
    console.warn("[Attribution] Error storing attribution:", e);
  }

  return consolidated;
}
