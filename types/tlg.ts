import { ChatCompletionRequestMessage } from "openai"

export namespace QueryData {
  export type MessagesQuery = ChatCompletionRequestMessage[]

  export type ApikeyQuery = string

  export type UserDataQuery = {
    apiKey: ApikeyQuery
    messages: MessagesQuery
  }

  export enum ErrorType {
    APIKEY = 'apikey',
    FIREBASE_QUERY = 'firebase_query',
    TELEGRAM_QUERY = 'telegram_query',
    OTHER = 'other'
  }

  type ErrorFirebaseData = {
    error: QueryData.ErrorType.FIREBASE_QUERY
  }

  type ErrorTelegramData = {
    error: QueryData.ErrorType.TELEGRAM_QUERY
  }

  type ErrorApikeyData = {
    error: QueryData.ErrorType.APIKEY
  }

  type ErrorOther = {
    error: QueryData.ErrorType.OTHER
  }

  export type ErrorUnion = (ErrorFirebaseData | ErrorTelegramData | ErrorApikeyData | ErrorOther) & {
    data: string
  }

  export type Data =
    | UserDataQuery
    | ErrorUnion

  /**
   * Import type identificator you want to be chosen from like: { error: 'errorVariant' }
   */
  export type QueryResponse<T> = Awaited<Promise<Extract<QueryData.Data, T> | string>>

  export type InferQueryType<T> = (T extends CollectionTypes.OPENAI_API_KEY ? ApikeyQuery | null : T extends CollectionTypes.MESSAGES ? MessagesQuery | null : never) | null
}

export enum CollectionTypes {
  INITIALIZE = 'initialize',
  USERS = 'USERS',
  // -------------------------- //
  OPENAI_API_KEY = 'openai_api_keys',
  MESSAGES = 'messages',
  MESSAGE_TYPES = 'message_types'
}

export enum RequestType {
  INITIALIZE = 'initialize',
}

export enum MessageAction {
  INITIALIZE = 'initialize',
  LOADING = "loading",
  APIKEY_INPUT = 'apikey_input',
  MODE_NAME = 'mode_name',
  MODE_PROMPT = 'mode_prompt',
  BOT_PROMPT = 'bot_prompt',
  NEW_BOT_CHAT = 'new_bot_chat',
}

// maybe remove it
export type RequestInitializeUser = {
  action: MessageAction.INITIALIZE
  chatId: string
}

export type RequestUpdateMessages = {
  action: MessageAction.BOT_PROMPT
  chatId: string
  messages: QueryData.MessagesQuery
}

export type RequestStartNewChat = {
  action: MessageAction.NEW_BOT_CHAT
  chatId: string
}

export type RequestUpdateApiKey = {
  action: MessageAction.APIKEY_INPUT
  chatId: string
  apiKey: QueryData.ApikeyQuery
}

// export type RequestUpdateApikey = {
//   type: CollectionTypes.OPENAI_API_KEY
//   chatId: string
//   apikey: QueryData.apiKeyQuery
// }

// export type RequesUpdateMessageStatus = {
//   type: CollectionTypes.MESSAGE_TYPES
//   chatId: string
//   status: MessageTypes
// }

export type RequestFirebaseApi = { chatId: string } & (
  | RequestInitializeUser
  | RequestUpdateMessages
  | RequestUpdateApiKey
  | RequestStartNewChat
)
// export type RequestFirebaseApi = RequestInitializeUser | RequestUpdateMessages | RequestUpdateApikey | RequesUpdateMessageStatus

export type CatchErrorProps = QueryData.ErrorUnion | Error