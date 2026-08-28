export const TG_BOT_TOKEN =
  process.env.TELEGRAM_LEADS_BOT_TOKEN ||
  process.env.TELEGRAM_BOT_TOKEN ||
  "7889462444:AAGCjyk-5h6SKWk94txoMlyhV2qyZuwcWaQ";

// Supergroup ID for Anastasia Sych notifications
export const TG_CHAT_ID =
  process.env.TELEGRAM_CHAT_ID && process.env.TELEGRAM_CHAT_ID !== "-1003943120978"
    ? process.env.TELEGRAM_CHAT_ID
    : "-1004405563488";

// Topic ID for leads and successful payments
export const TG_LEADS_THREAD_ID =
  process.env.TELEGRAM_THREAD_ID && process.env.TELEGRAM_THREAD_ID !== "904"
    ? parseInt(process.env.TELEGRAM_THREAD_ID, 10)
    : 23;

// Topic ID for daily/weekly analytical reports
export const TG_REPORT_THREAD_ID =
  process.env.TELEGRAM_REPORT_THREAD_ID && process.env.TELEGRAM_REPORT_THREAD_ID !== "908"
    ? parseInt(process.env.TELEGRAM_REPORT_THREAD_ID, 10)
    : 21;
