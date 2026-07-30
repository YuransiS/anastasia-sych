// Validation Helper for Ukrainian Phones and Telegram Handles

/**
 * Valid Ukrainian Operator Prefixes:
 * Vodafone: 050, 066, 095, 099, 075
 * Kyivstar: 067, 068, 096, 097, 098, 077
 * Lifecell: 063, 073, 093
 * 3Mob/Intertelecom/PeopleNet: 091, 092, 094
 */
export const VALID_UA_OPERATOR_CODES = [
  "50", "66", "95", "99", "75", // Vodafone
  "67", "68", "96", "97", "98", "77", // Kyivstar
  "63", "73", "93",             // Lifecell
  "91", "92", "94"              // Others
];

/**
 * Clean & Format Ukrainian phone number.
 * Ensures format starts with +380
 */
export function formatUkrainianPhone(input: string): string {
  let cleaned = input.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+380")) {
    return "+380" + cleaned.slice(4).replace(/\D/g, "").slice(0, 9);
  }
  if (cleaned.startsWith("380")) {
    return "+380" + cleaned.slice(3).replace(/\D/g, "").slice(0, 9);
  }
  if (cleaned.startsWith("80")) {
    return "+380" + cleaned.slice(2).replace(/\D/g, "").slice(0, 9);
  }
  if (cleaned.startsWith("0")) {
    return "+380" + cleaned.slice(1).replace(/\D/g, "").slice(0, 9);
  }
  if (cleaned.length > 0 && !cleaned.startsWith("+")) {
    return "+380" + cleaned.replace(/\D/g, "").slice(0, 9);
  }

  return cleaned;
}

/**
 * Validate Ukrainian Phone Number:
 * Must be 13 chars total (+380XXYYYYYYY)
 * Operator code XX must match valid Ukrainian mobile codes
 */
export function validateUkrainianPhone(phone: string): { isValid: boolean; error?: string } {
  const formatted = formatUkrainianPhone(phone);
  const digitsOnly = formatted.replace(/\D/g, "");

  if (digitsOnly.length !== 12 || !digitsOnly.startsWith("380")) {
    return { isValid: false, error: "Номер має містити 12 цифр (+380XXXXXXXXX)." };
  }

  const operatorCode = digitsOnly.slice(3, 5);
  if (!VALID_UA_OPERATOR_CODES.includes(operatorCode)) {
    return { isValid: false, error: `Код оператора (0${operatorCode}) не є дійсним мобільним кодом України.` };
  }

  return { isValid: true };
}

/**
 * Validate Telegram Username:
 * Must start with optional @, 5 to 32 chars, letters, numbers, underscores.
 * Or special value "немає нікнейму"
 */
export function validateTelegramHandle(handle: string): { isValid: boolean; error?: string } {
  const trimmed = handle.trim();
  if (!trimmed || trimmed.toLowerCase() === "немає нікнейму" || trimmed.toLowerCase() === "в мене немає нікнейму") {
    return { isValid: true };
  }

  const cleanHandle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  if (cleanHandle.length < 5 || cleanHandle.length > 32) {
    return { isValid: false, error: "Нікнейм Telegram має бути від 5 до 32 символів." };
  }

  const tgRegex = /^[a-zA-Z0-9_]+$/;
  if (!tgRegex.test(cleanHandle)) {
    return { isValid: false, error: "Нікнейм Telegram може містити лише латинські літери, цифри та _." };
  }

  return { isValid: true };
}
