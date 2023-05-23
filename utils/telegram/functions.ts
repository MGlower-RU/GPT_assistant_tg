import { CollectionTypes, MessageTypeStatuses, QueryData, RequestType } from "@/types/tlg"
import { ChatCompletionRequestMessageRoleEnum, ChatCompletionResponseMessageRoleEnum, Configuration, OpenAIApi } from "openai"
import { BotCommand, Message } from "typegram"

const commands: BotCommand[] = [
  { command: "😣 /help", description: 'get information of how this bot works' },
  { command: "🆕 /new", description: 'start new conversation with bot' },
  { command: "🦖 /mode", description: 'select a mode for current chat and manage modes' },
  { command: "🔑 /apikey", description: 'input your OpenAI apikey' },
  { command: "📜 /history", description: 'show previous conversation' },
  { command: "📌 /retry", description: 'send previous prompt again' }
]

const commandsString = commands.reduce((acc, { command, description }) => {
  return acc + `
      %0A-------------------
      %0A${command} - ${description}
    `
}, '')

export let hostURL: string | null = null

const errors = {
  INVALID_APIKEY: { error: QueryData.ErrorType.APIKEY, data: 'Enter an actual ApiKey given by OpenAI.%0AVisit <a href="https://platform.openai.com/account/api-keys">official OpenAI page</a> to see your apiKey.' }
}

// TELEGRAM COMMANDS FUNCTIONS

export async function startMessage(message: Message.TextMessage) {
  const chatId = message.chat.id

  // initialize only modes and history
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
  const chatId = message.chat.id

  const firebase = await fetch(`${hostURL}/api/firebase?chatId=${chatId}`, {
    method: 'GET',
    headers: {
      "firebase-query": "firebaseQueryHeader"
    }
  })
  const fbData: QueryData.Data = await firebase.json()

  if ('error' in fbData) {
    throw fbData
  }

  const { messages, apiKey } = fbData.data

  if (apiKey === null) {
    throw errors.INVALID_APIKEY
  }

  const configuration = new Configuration({ apiKey })
  const openai = new OpenAIApi(configuration)

  messages.push({ role: ChatCompletionRequestMessageRoleEnum.User, content: message.text })

  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: messages,
    temperature: 0.6,
    max_tokens: 1000,
    n: 1
  }).catch(() => { throw errors.INVALID_APIKEY })

  const botResponse = completion.data.choices[0].message;

  if (botResponse?.content === undefined) {
    await telegramSendMessage(chatId, "Bot couldn't answer your question%0ATry to ask another one")
  } else {
    await telegramSendMessage(chatId, botResponse.content)

    messages.push({ role: botResponse.role, content: botResponse?.content ?? '' })

    await fetch(`${hostURL}/api/firebase`, {
      method: 'POST',
      body: JSON.stringify({
        type: CollectionTypes.MESSAGES,
        messages,
        chatId
      }),
      headers: {
        "firebase-query": "firebaseQueryHeader"
      }
    })
  }
}


// Utils

/**
 * 
 * @param url Input your site hostURL
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
  ).catch(err => {
    throw {
      error: QueryData.ErrorType.TELEGRAM_QUERY,
      data: `Couldn't send telegram message%0AReason: ${err}`
    }
  });
}