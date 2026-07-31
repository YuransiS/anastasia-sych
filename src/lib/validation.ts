// Validation Helper for International Phones and Telegram Handles

/**
 * Clean & Format International or Local Phone Numbers.
 * Preserves leading + and digits, removes spaces/dashes.
 */
export function formatUkrainianPhone(input: string): string {
  return formatPhone(input);
}

export function formatPhone(input: string): string {
  let cleaned = input.replace(/[^\d+]/g, "");
  if (cleaned.length > 0 && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

/**
 * Validate Phone Number (International or Ukrainian):
 * Accepts 7 to 15 digits (ITU E.164 standard).
 */
export function validateUkrainianPhone(phone: string): { isValid: boolean; error?: string } {
  return validatePhone(phone);
}

export function validatePhone(phone: string): { isValid: boolean; error?: string } {
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return {
      isValid: false,
      error: "Будь ласка, введіть дійсний номер мобільного телефону (від 7 до 15 цифр).",
    };
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

  if (cleanHandle.length < 3 || cleanHandle.length > 32) {
    return { isValid: false, error: "Нікнейм Telegram має бути від 3 до 32 символів." };
  }

  const tgRegex = /^[a-zA-Z0-9_]+$/;
  if (!tgRegex.test(cleanHandle)) {
    return { isValid: false, error: "Нікнейм Telegram може містити лише латинські літери, цифри та _." };
  }

  return { isValid: true };
}
