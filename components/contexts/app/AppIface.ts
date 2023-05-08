import { ChatCompletionRequestMessage } from "openai"
import { Socket } from "socket.io-client"

export type AppIface = {
  messages: ChatCompletionRequestMessage[]
  openaiApikey: string
  socket: typeof Socket | null
  chatId: string
}