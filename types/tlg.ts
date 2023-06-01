import { ChatCompletionRequestMessage } from "openai"

export namespace QueryData {
  export type MessagesQuery = ChatCompletionRequestMessage[]
  export type ApikeyQuery = string
  export type UserDataQuery = {
    apiKey: ApikeyQuery
    messages: MessagesQuery
  }
  export type ModeQuery = {
    name: string,
    description: string
  }
  export type ModesQuery = ModeQuery[]

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
    | ModesQuery
    | ModeQuery
    | ErrorUnion

  /**
   * Import type identificator you want to be chosen from like: { error: 'errorVariant' }
   */
  export type QueryResponse<T> = Awaited<Promise<Extract<QueryData.Data, T> | string>>
}

export enum CollectionTypes {
  USERS = 'USERS',
  MODES = 'modes'
}

export enum MessageAction {
  INITIALIZE = 'initialize',
  APIKEY_INPUT = 'apikey_input',
  MODE_NAME = 'mode_name',
  MODE_PROMPT = 'mode_prompt',
  MODE_NEW = 'mode_new',
  MODE_SET = 'mode_set',
  MODE_ALL = 'mode_all',
  MODE_DELETE = 'mode_delete',
  BOT_PROMPT = 'bot_prompt',
  NEW_BOT_CHAT = 'new_bot_chat',
}

export type UserMessageData = {
  action: MessageAction
  loading: boolean
  mode: string
  last_message_id: number
  new_mode_name: string
}

export type RequestInitializeUser = {
  action: MessageAction.INITIALIZE
}

export type RequestUpdateMessages = {
  action: MessageAction.BOT_PROMPT
  messages: QueryData.MessagesQuery
}

export type RequestStartNewChat = {
  action: MessageAction.NEW_BOT_CHAT
}

export type RequestAddMode = {
  action: MessageAction.MODE_NEW
  modeData: {
    name: string,
    description: string
  }
}

export type RequestUpdateApiKey = {
  action: MessageAction.APIKEY_INPUT
  apiKey: QueryData.ApikeyQuery
}

export type RequestBotPrompt = {
  action: MessageAction.BOT_PROMPT
}

export type RequestModeAll = {
  action: MessageAction.MODE_ALL
}

export type RequestFirebaseApiPost = { chatId: string } & (
  | RequestInitializeUser
  | RequestUpdateMessages
  | RequestUpdateApiKey
  | RequestStartNewChat
  | RequestAddMode
)

export type RequestFirebaseApiGet = { chatId: string } & (
  | RequestBotPrompt
  | RequestModeAll
)
// export type RequestFirebaseApi = RequestInitializeUser | RequestUpdateMessages | RequestUpdateApikey | RequesUpdateMessageStatus

export type CatchErrorProps = QueryData.ErrorUnion | Error