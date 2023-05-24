import { QueryData } from "@/types/tlg";

export const errors = {
  INVALID_APIKEY: {
    error: QueryData.ErrorType.APIKEY,
    data: `
      Enter an actual <i>apikey</i> given by OpenAI using command /apikey.
      %0AVisit <a href="https://platform.openai.com/account/api-keys">official OpenAI page</a> to see your apiKey.
    `
  }
}