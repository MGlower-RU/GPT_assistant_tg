import { ChatCompletionRequestMessage } from "openai"
import { Message } from "typegram"

namespace QueryData {
  export type messagesQuery = ChatCompletionRequestMessage[]

  export type apiKeyQuery = string

  export enum ErrorType {
    APIKEY = 'apikey',
    QUERY = 'query'
  }
}

export enum CollectionTypes {
  OPENAI_API_KEY = 'openai_api_keys',
  MESSAGES = 'messages'
}