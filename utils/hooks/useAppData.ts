import { AppIface } from "@/components/contexts/app/AppIface";
import { ChatCompletionRequestMessage } from "openai";
import { useReducer } from "react"
import { Socket } from "socket.io-client";

enum ActionTypes {
  SetMessage = 'setMessage',
  SetSocket = 'setSocket',
}

type Action =
  | { type: ActionTypes.SetMessage, payload: ChatCompletionRequestMessage }
  | { type: ActionTypes.SetSocket, payload: typeof Socket }

const reducer = (state: AppIface, action: Action) => {
  switch (action.type) {
    case ActionTypes.SetMessage:
      return { ...state, messages: [...state.messages, action.payload] }
    case ActionTypes.SetSocket:
      return { ...state, socket: action.payload }
    default:
      return state
  }
}

const useAppData = () => {
  // remove environment variable OPENAI_API_KEY because key will be set in chat itself
  const [appData, dispatch] = useReducer(reducer, { messages: [], openaiApikey: process.env.OPENAI_API_KEY!, chatId: '', socket: null })

  return { appData, dispatch }
}

export default useAppData