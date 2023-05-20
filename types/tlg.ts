import { ChatCompletionRequestMessage } from "openai"

export namespace QueryData {
  export type messagesQuery = ChatCompletionRequestMessage[]

  export type apiKeyQuery = string

  export enum ErrorType {
    APIKEY = 'apikey',
    QUERY = 'query',
    OTHER = 'other'
  }

  type SuccessFirebaseData = {
    data: {
      messages: messagesQuery
      apiKey: apiKeyQuery
    }
  }

  type ErrorFirebaseData = {
    error: QueryData.ErrorType.QUERY
  }

  type ErrorApikeyData = {
    error: QueryData.ErrorType.APIKEY
  }

  type ErrorOther = {
    error: QueryData.ErrorType.OTHER
  }

  export type ErrorUnion = (ErrorFirebaseData | ErrorApikeyData | ErrorOther) & {
    data: string
  }

  export type Data =
    | SuccessFirebaseData
    | ErrorUnion

  /**
   * Import type identificator you want to be chosen from like: { error: 'errorVariant' }
   */
  export type QueryResponse<T> = Awaited<Promise<Extract<QueryData.ErrorUnion, T> | string>>

  export type InferQueryType<T> = (T extends CollectionTypes.OPENAI_API_KEY ? apiKeyQuery | null : T extends CollectionTypes.MESSAGES ? messagesQuery | null : never) | null
}

export enum CollectionTypes {
  OPENAI_API_KEY = 'openai_api_keys',
  MESSAGES = 'messages',
  MESSAGE_TYPES = 'message_types'
}

export enum MessageTypeStatuses {
  APIKEY = 'apikey',
  MODE = 'mode'
}

export type RequestUpdateMessages = {
  type: CollectionTypes.MESSAGES
  chatId: string
  messages: QueryData.messagesQuery
}

export type RequestUpdateApikey = {
  type: CollectionTypes.OPENAI_API_KEY
  chatId: string
  apikey: QueryData.apiKeyQuery
}

export type RequesUpdateMessageStatus = {
  type: CollectionTypes.MESSAGE_TYPES
  chatId: string
  status: MessageTypeStatuses
}

export type RequestFirebaseApi = RequestUpdateMessages | RequestUpdateApikey | RequesUpdateMessageStatus

export type CatchErrorProps = QueryData.ErrorUnion | Error