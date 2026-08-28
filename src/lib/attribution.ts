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
  bw_cid?: string;
  page_path: string;
  page_url: string;
}

export const ATTRIBUTION_STORAGE_KEY = "bw_attribution_data";
export const STORAGE_KEY = "bw_attribution_params";
export const VISITOR_UUID_KEY = "bw_visitor_uuid";
export const BW_CID_KEY = "bw_cid";

export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  return undefined;
}

export function setCookie(name: string, value: string, days = 30): void {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Returns or generates a persistent visitor UUID stored in localStorage and 30-day cookie.
 */
export function getVisitorUUID(): string {
  if (typeof window === "undefined") return "";
  try {
    let visitorUuid = localStorage.getItem(VISITOR_UUID_KEY) || getCookie(VISITOR_UUID_KEY);
    if (!visitorUuid) {
      visitorUuid = crypto.randomUUID();
    }
    localStorage.setItem(VISITOR_UUID_KEY, visitorUuid);
    setCookie(VISITOR_UUID_KEY, visitorUuid, 30);
    return visitorUuid;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Computes canonical bw_cid based on visitor UUID or query parameter.
 */
export function getBwCid(uuid?: string): string {
  if (typeof window === "undefined") return "";
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const fromUrl = searchParams.get("bw_cid") || searchParams.get("cid");
    if (fromUrl) {
      localStorage.setItem(BW_CID_KEY, fromUrl);
      setCookie(BW_CID_KEY, fromUrl, 30);
      return fromUrl;
    }
    let cid = localStorage.getItem(BW_CID_KEY) || getCookie(BW_CID_KEY);
    if (!cid) {
      const activeUuid = uuid || getVisitorUUID();
      cid = activeUuid.startsWith("bw_") ? activeUuid : `bw_${activeUuid.replace(/-/g, "")}`;
    }
    localStorage.setItem(BW_CID_KEY, cid);
    setCookie(BW_CID_KEY, cid, 30);
    return cid;
  } catch {
    const activeUuid = uuid || "";
    return activeUuid ? `bw_${activeUuid.replace(/-/g, "")}` : "";
  }
}

/**
 * Captures all marketing attribution parameters from current URL and cookies,
 * merges with any previously stored UTM parameters in dual-storage (localStorage + Cookie), and returns a consolidated object.
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
  const bwCid = getBwCid(visitorUuid);

  // Extract from current URL
  const currentSource = urlParams.get("utm_source") || undefined;
  const currentMedium = urlParams.get("utm_medium") || undefined;
  const currentCampaign = urlParams.get("utm_campaign") || undefined;
  const currentContent = urlParams.get("utm_content") || undefined;
  const currentTerm = urlParams.get("utm_term") || undefined;

  const currentCampaignId =
    urlParams.get("campaign_id") ||
    urlParams.get("utm_id") ||
    urlParams.get("campaignid") ||
    (currentCampaign && /^\d+$/.test(currentCampaign) ? currentCampaign : undefined);

  const currentAdsetId = urlParams.get("adset_id") || urlParams.get("adsetid") || urlParams.get("adset") || undefined;
  const currentAdId = urlParams.get("ad_id") || urlParams.get("adid") || urlParams.get("adId") || undefined;
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

  // Retrieve stored attribution from dual storage to avoid losing UTMs during internal navigation
  let stored: Partial<MarketingAttribution> = {};
  try {
    const cookieAttr = getCookie(ATTRIBUTION_STORAGE_KEY);
    const saved =
      localStorage.getItem(ATTRIBUTION_STORAGE_KEY) ||
      (cookieAttr ? decodeURIComponent(cookieAttr) : null) ||
      localStorage.getItem(STORAGE_KEY);
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
    bw_cid: bwCid,
    page_path: window.location.pathname,
    page_url: window.location.href,
  };

  // Persist updated attribution to dual-storage (localStorage + 30-day Cookie)
  try {
    const jsonStr = JSON.stringify(consolidated);
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, jsonStr);
    localStorage.setItem(STORAGE_KEY, jsonStr);
    setCookie(ATTRIBUTION_STORAGE_KEY, jsonStr, 30);
  } catch (e) {
    console.warn("[Attribution] Error storing attribution:", e);
  }

  return consolidated;
}
