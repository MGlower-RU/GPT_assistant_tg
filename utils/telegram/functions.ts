import { MessageAction, QueryData } from "@/types/tlg"
import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from "openai"
import { BotCommand, Message } from "typegram"
import { errors } from "./errors"

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

console.log('updated');

const usersMessagesAction = new Map<number, MessageAction>()

export let hostURL: string | null = null

export const USER_MESSAGES_MAX_LENGTH = 30

// TELEGRAM COMMANDS FUNCTIONS

export async function startMessage(message: Message.TextMessage) {
  const chatId = message.chat.id
  // initialize only modes and history
  const result: QueryData.QueryResponse<{ error: QueryData.ErrorType.OTHER }> = await fetch(`${hostURL}/api/firebase`, {
    method: 'POST',
    body: JSON.stringify({
      action: MessageAction.INITIALIZE,
      chatId
    }),
    headers: {
      "firebase-query": "firebaseQueryHeader"
    }
  }).then(res => res.json())

  if (typeof result !== 'string') {
    throw result
  }

  setUserAction(chatId, MessageAction.BOT_PROMPT)

  const response = `
    Welcome to <i>AI assistant bot</i>, ${message.from?.first_name}
    %0A%0A<b>List of available commands:</b>
    ${commandsString}
  `
  await telegramSendMessage(chatId, response)
}

export async function helpMessage(chatId: number) {
  const response = 'Help for <i>AI assistant bot</i>.%0AUse /start <i>keyword</i> to get greeting message.';
  // create an issue on GitHub if you found an error
  await telegramSendMessage(chatId, response)
}

export async function setApikey(chatId: number, apiKey?: string) {
  if (getUserAction(chatId) === MessageAction.APIKEY_INPUT && apiKey) {
    const result: QueryData.QueryResponse<{ error: QueryData.ErrorType.OTHER }> = await fetch(`${hostURL}/api/firebase`, {
      method: 'POST',
      body: JSON.stringify({
        action: MessageAction.APIKEY_INPUT,
        chatId,
        apiKey
      }),
      headers: {
        "firebase-query": "firebaseQueryHeader"
      }
    }).then(res => res.json())

    if (typeof result !== 'string') {
      throw result
    }

    await telegramSendMessage(chatId, result)
    setUserAction(chatId, MessageAction.BOT_PROMPT)
  } else {
    await telegramSendMessage(chatId, '🔑 Please, input your apiKey:')
    setUserAction(chatId, MessageAction.APIKEY_INPUT)
  }
}

export async function startNewBotChat(chatId: number) {
  const result: QueryData.QueryResponse<QueryData.ErrorUnion> = await fetch(`${hostURL}/api/firebase`, {
    method: 'POST',
    body: JSON.stringify({
      action: MessageAction.NEW_BOT_CHAT,
      chatId
    }),
    headers: {
      "firebase-query": "firebaseQueryHeader"
    }
  }).then(res => res.json())

  if (typeof result !== 'string') {
    throw result
  }
  setUserAction(chatId, MessageAction.BOT_PROMPT)
  await telegramSendMessage(chatId, 'How can I help you today?')
}

export async function defaultMessage(message: Message.TextMessage) {
  const { chat: { id }, text } = message
  let actionType = getUserAction(id)

  if (!actionType) {
    setUserAction(id, MessageAction.BOT_PROMPT)
    actionType = MessageAction.BOT_PROMPT
  }

  // change to switch if possible
  if (actionType === MessageAction.BOT_PROMPT) {
    await getBotPrompt(id, text)
  } else if (actionType === MessageAction.APIKEY_INPUT) {
    await setApikey(id, text)
  }
}

/**
 * Function to get an answer on prompt from GPT-bot
 * @param chatId id of your telegram chat
 * @param content a prompt you want to pass to the bot
 */
export const getBotPrompt = async (chatId: number, content: string) => {
  const firebase: Exclude<QueryData.QueryResponse<QueryData.Data>, string> = await fetch(`${hostURL}/api/firebase?chatId=${chatId}`, {
    method: 'GET',
    headers: {
      "firebase-query": "firebaseQueryHeader"
    }
  }).then(res => res.json())
  const fbData = firebase

  if ('error' in fbData) {
    throw fbData
  }

  const { messages, apiKey } = fbData

  if (apiKey === null) {
    throw errors.INVALID_APIKEY()
  }

  const configuration = new Configuration({ apiKey })
  const openai = new OpenAIApi(configuration)

  messages.push({ role: ChatCompletionRequestMessageRoleEnum.User, content })

  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: messages,
    temperature: 0.6,
    max_tokens: 1000,
    n: 1
  }).catch(() => {
    throw errors.INVALID_APIKEY()
  })

  const botResponse = completion.data.choices[0].message;

  if (botResponse?.content === undefined) {
    await telegramSendMessage(chatId, "Bot couldn't answer your question%0ATry to ask another one")
  } else {
    await telegramSendMessage(chatId, botResponse.content)

    messages.push({ role: botResponse.role, content: botResponse?.content ?? '' })

    await fetch(`${hostURL}/api/firebase`, {
      method: 'POST',
      body: JSON.stringify({
        action: MessageAction.BOT_PROMPT,
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
 * Function accepts telegram chat id and returns current user's message action
 * @param chatId telegram chat id
 * @returns user's message type
 */
export const getUserAction = (chatId: number): MessageAction => usersMessagesAction.get(chatId)!

/**
 * Function accepts telegram chat id and returns current user's message action
 * @param chatId telegram chat id
 */
export const setUserAction = (chatId: number, action: MessageAction): void => {
  usersMessagesAction.set(chatId, action)
}

/**
 * 
 * @param chatId chatID can be retrieved from telegram request.
 * @param message Input your text you want to be send by bot here. Accepts HTML.
 */
export const telegramSendMessage = async (chatId: number | string, message: string) => {
  await fetch(
    `https://api.telegram.org/bot${process.env.NEXT_TELEGRAM_TOKEN}/sendMessage?chat_id=${chatId}&text=${message}&parse_mode=HTML`
  ).catch(err => {
    throw errors.TELEGRAM_QUERY(`Couldn't send telegram message%0AReason: ${err}`)
  });
}