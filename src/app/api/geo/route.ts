import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Detect country from Vercel header
  const country = request.headers.get("x-vercel-ip-country") || "UA";

  const countryDialCodes: Record<string, string> = {
    UA: "+380",
    PL: "+48",
    DE: "+49",
    US: "+1",
    GB: "+44",
    CZ: "+420",
    RO: "+40",
    IT: "+39",
    ES: "+34",
    FR: "+33",
    CA: "+1",
    AT: "+43",
    NL: "+31",
  };

  const dialCode = countryDialCodes[country.toUpperCase()] || "+380";

  return NextResponse.json({
    country,
    dialCode,
  });
}
