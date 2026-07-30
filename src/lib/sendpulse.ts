// SendPulse REST API Integration Module

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getSendPulseAccessToken(): Promise<string | null> {
  const clientId = process.env.SENDPULSE_CLIENT_ID;
  const clientSecret = process.env.SENDPULSE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[SendPulse] API keys missing; skipping SendPulse sync.");
    return null;
  }

  // Return cached token if valid
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  try {
    const res = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const data = await res.json();
    if (data.access_token) {
      tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000,
      };
      return data.access_token;
    }
  } catch (err) {
    console.error("[SendPulse] Error fetching access token:", err);
  }
  return null;
}

export async function createOrUpdateSendPulseContact(payload: {
  name: string;
  phone: string;
  email?: string;
  telegram?: string;
  offerVariant?: string;
  status?: string;
}) {
  try {
    const token = await getSendPulseAccessToken();
    if (!token) return false;

    // Contact registration endpoint for CRM / Addressbooks
    const body = {
      emails: payload.email
        ? [
            {
              email: payload.email,
              variables: {
                name: payload.name,
                phone: payload.phone,
                telegram: payload.telegram || "",
                offer: payload.offerVariant || "1",
                status: payload.status || "Зареєстровано",
                source: "Anastasia Sych Diagnostic Landing",
              },
            },
          ]
        : [],
    };

    if (body.emails.length > 0) {
      const res = await fetch("https://api.sendpulse.com/addressbooks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log("[SendPulse] Contact sync response:", data);
      return true;
    }
  } catch (err) {
    console.error("[SendPulse] Exception during contact sync:", err);
  }
  return false;
}
