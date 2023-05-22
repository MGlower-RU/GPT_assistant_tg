import { CollectionTypes, MessageTypeStatuses, QueryData, RequestType } from "@/types/tlg"
import { ChatCompletionRequestMessageRoleEnum, ChatCompletionResponseMessageRoleEnum, Configuration, OpenAIApi } from "openai"
import { BotCommand, Message } from "typegram"

const commands: BotCommand[] = [
  { command: "😣 /help", description: 'get information of how this bot works' },
  { command: "🆕 /new", description: 'start new conversation with bot' },
  { command: "🦖 /mode", description: 'select a mode for current chat and manage modes' },
  { command: "🔑 /apikey", description: 'input your OpenAI apikey' },
  { command: "📜 /history", description: 'show previous conversation' }
]

const commandsString = commands.reduce((acc, { command, description }) => {
  return acc + `
      %0A-------------------
      %0A${command} - ${description}
    `
}, '')

export let hostURL: string | null = null

const users: number[] = []

// TELEGRAM COMMANDS FUNCTIONS

export async function startMessage(message: Message.TextMessage) {
  const chatId = message.chat.id
  users.push(chatId)
  console.log(users)


  const result: QueryData.QueryResponse<{ error: QueryData.ErrorType.OTHER }> = await fetch(`${hostURL}/api/firebase`, {
    method: 'POST',
    body: JSON.stringify({
      type: RequestType.INITIALIZE,
      chatId
    }),
    headers: {
      "firebase-query": "firebaseQueryHeader"
    }
  }).then(res => res.json())

  if (typeof result !== 'string') {
    throw result
  }

  const response = `
    Welcome to <i>AI assistant bot</i>, ${message.from?.first_name}
    %0A%0A<b>List of available commands:</b>
    ${commandsString}
  `
  await telegramSendMessage(chatId, response)
}

export async function helpMessage(message: Message.TextMessage) {
  const response = 'Help for <i>AI assistant bot</i>.%0AUse /start <i>keyword</i> to get greeting message.';
  // create an issue on GitHub if you found an error
  await telegramSendMessage(message.chat.id, response)
}

export async function setApikey(chatId: number) {
  const result: QueryData.QueryResponse<{ error: QueryData.ErrorType.OTHER }> = await fetch(`${hostURL}/api/firebase`, {
    method: 'POST',
    body: JSON.stringify({
      type: CollectionTypes.MESSAGE_TYPES,
      status: MessageTypeStatuses.APIKEY,
      chatId
    }),
    headers: {
      "firebase-query": "firebaseQueryHeader"
    }
  }).then(res => res.json())

  if (typeof result !== 'string') {
    throw result
  }
}

export async function promptMessage(message: Message.TextMessage) {
  const firebase = await fetch(`${hostURL}/api/firebase?chatId=${message.chat.id}`, {
    method: 'GET',
    headers: {
      "firebase-query": "firebaseQueryHeader"
    }
  })
  const fbData: QueryData.Data = await firebase.json()

  if ('error' in fbData) {
    throw fbData
  }

  // do something with constant initializing on function call
  const configuration = new Configuration({
    apiKey: fbData.data.apiKey
  })
  const openai = new OpenAIApi(configuration)

  // update messages in firestore
  const newMessagesArray = [...fbData.data.messages, { role: ChatCompletionRequestMessageRoleEnum.User, content: message.text }]

  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: newMessagesArray,
    temperature: 0.6,
    max_tokens: 1000,
    n: 1
  }).catch(() => { throw { error: QueryData.ErrorType.APIKEY, data: 'Enter an actual ApiKey given by OpenAI.%0AVisit <a href="https://platform.openai.com/account/api-keys">official OpenAI page</a> to see your apiKey.' } })

  const botResponse = completion.data.choices[0].message;

  await telegramSendMessage(message.chat.id, botResponse?.content ?? '')

  newMessagesArray.push({ role: botResponse?.role ?? ChatCompletionResponseMessageRoleEnum.Assistant, content: botResponse?.content ?? '' })

  await fetch(`${hostURL}/api/firebase`, {
    method: 'POST',
    body: JSON.stringify({
      type: CollectionTypes.MESSAGES,
      messages: newMessagesArray,
      chatId: message.chat.id
    }),
    headers: {
      "firebase-query": "firebaseQueryHeader"
    }
  })
}


// Utils

/**
 * 
 * @param url send your site hostURL
 */
export const setURL = (url: string): void => { hostURL = url }

/**
 * 
 * @param chatId chatID can be retrieved from telegram request.
 * @param message Input your text you want to be send by bot here. Accepts HTML.
 */
export const telegramSendMessage = async (chatId: number | string, message: string) => {
  await fetch(
    `https://api.telegram.org/bot${process.env.NEXT_TELEGRAM_TOKEN}/sendMessage?chat_id=${chatId}&text=${message}&parse_mode=HTML`
  );
}