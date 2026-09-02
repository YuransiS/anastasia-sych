import crypto from "crypto";

export async function sendFacebookCapiEvent(
  eventName: string,
  eventData: {
    eventSourceUrl?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    email?: string;
    phone?: string;
    name?: string;
    visitorUuid?: string;
    eventId?: string;
    fbp?: string;
    fbc?: string;
    customData?: Record<string, any>;
  }
) {
  const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || "1015433897324199";
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || "EAAWcjCyZBn3EBSY11QlEE25kX4pQmmVTiD4tUJ5Uk3x8nZAnW2gLFNaPkyJYZAX0KObMhiu7hCgwP7X8rsXnU0pGFiDuT7irxN59ZBxi9WSG1Bvt4BH37ag4OUiJtUMmxys33HDabYYfTBPTP2fb5a7ayixZAf1I7mZBM7XgavSlDdXG2eCyvxbev7XeWD4q7aKgZDZD";

  if (!accessToken) {
    console.log(`[CAPI] Skip sending ${eventName} event: FACEBOOK_ACCESS_TOKEN is not defined.`);
    return;
  }

  // Hash helper (SHA256)
  const sha256 = (val: string) => {
    return crypto.createHash("sha256").update(val.trim().toLowerCase()).digest("hex");
  };

  // Prepare user data
  const userData: Record<string, any> = {
    client_ip_address: eventData.clientIpAddress || undefined,
    client_user_agent: eventData.clientUserAgent || undefined,
  };

  if (eventData.email) {
    userData.em = [sha256(eventData.email)];
  }
  if (eventData.phone) {
    const cleanPhone = eventData.phone.replace(/\D/g, "");
    if (cleanPhone) {
      userData.ph = [sha256(cleanPhone)];
    }
  }
  if (eventData.name) {
    const parts = eventData.name.trim().split(/\s+/);
    if (parts.length > 0) {
      userData.fn = [sha256(parts[0])];
      if (parts.length > 1) {
        userData.ln = [sha256(parts.slice(1).join(" "))];
      }
    }
  }
  if (eventData.visitorUuid) {
    userData.external_id = [sha256(eventData.visitorUuid)];
  }
  if (eventData.fbp) {
    userData.fbp = eventData.fbp;
  }
  if (eventData.fbc) {
    userData.fbc = eventData.fbc;
  }

  // Deduplication event ID - shared with client-side pixel
  const eventId = eventData.eventId || (eventData.visitorUuid ? `${eventData.visitorUuid}_${eventName}` : undefined);

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: eventData.eventSourceUrl || "https://anastasiia-sych.vercel.app",
        user_data: userData,
        custom_data: eventData.customData,
        event_id: eventId,
      },
    ],
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    console.log(`[CAPI] Sent ${eventName} event, result:`, result);
  } catch (err) {
    console.error(`[CAPI] Error sending ${eventName} event:`, err);
  }
}
