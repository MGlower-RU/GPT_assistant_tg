import { QueryData } from "@/types/tlg";

export const errors = {
  INVALID_APIKEY: (data?: string) => ({
    error: QueryData.ErrorType.APIKEY,
    data: data ?? `
      Enter an actual <i>apikey</i> given by OpenAI using command /apikey.
      %0AVisit <a href="https://platform.openai.com/account/api-keys">official OpenAI page</a> to see your apiKey.
    `
  }),
  FIREBASE_QUERY: (data?: string) => ({
    error: QueryData.ErrorType.FIREBASE_QUERY,
    data: data ?? "Couldn't access your data. Try again later!"
  }),
  TELEGRAM_QUERY: (data?: string) => ({
    error: QueryData.ErrorType.TELEGRAM_QUERY,
    data: data ?? "Something went wrong on Telegram side%0ATry again later!"
  }),
  OTHER: (data?: string) => ({
    error: QueryData.ErrorType.OTHER,
    data: data ?? 'Oops...Something went wrong. Try again later!'
  }),
}