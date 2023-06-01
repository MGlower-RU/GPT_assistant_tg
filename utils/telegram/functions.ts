import { MessageAction, QueryData, UserMessageData } from "@/types/tlg"
import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from "openai"
import { BotCommand, Message } from "typegram"
import { errors } from "./errors"

const FETCH_SAFETY_HEADER = process.env.SAFETY_FETCH_HEADER!

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

const usersDataMessages = new Map<number, UserMessageData>()

export let hostURL: string | null = null
export const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'

let TELEGRAM_TOKEN = isDev ? process.env.TELEGRAM_TOKEN_DEV : process.env.TELEGRAM_TOKEN

export const USER_MESSAGES_MAX_LENGTH = 20

// TELEGRAM COMMANDS FUNCTIONS

/**
 * Function for /start command. Initializes a user on the first bot launch.
 * @param message Message object from telegram request.
 */
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
      "firebase-query": FETCH_SAFETY_HEADER
    }
  }).then(res => res.json())

  if (typeof result !== 'string') {
    throw result
  }

  const response = `
  Welcome to <i>AI assistant bot</i>, ${message.from?.first_name}
  %0A
  %0A<b>List of available commands:</b> ${commandsString}
  `

  await telegramSendMessage(chatId, response)
  setUserMessageData(chatId, { action: MessageAction.BOT_PROMPT, mode: 'default' })
}

/**
 * Function for /help command. Displays all the neccessary information about Bot.
 * @param chatId id of a chat
 * @param name optinal. User's name to be displayed.
 */
export async function helpMessage(chatId: number, name?: string) {
  const response = `
    Hello${name ? ", " + name : ""}!
    %0AThis is an AI Assistant Bot created to answer any of your questions.
    %0A
    %0ATo start using it input your <a href="https://platform.openai.com/account/api-keys">OpenAI apiKey</a> with a command /apiKey
    %0Aor use test account with a command /test. You will have 20 trial uses.
    %0A
    %0AAfter that send a message to get an answer to your question.
    %0A
    %0AThe bot remembers the context of your dialog.
    %0AAfter ${USER_MESSAGES_MAX_LENGTH} messages from <b>you</b> new chat will be created and Bot context will be reset.
    %0A
    %0AHere is the list of Bot available commands: ${commandsString}
    %0A
    %0A<b>What is the context?</b>
    %0ABy default, Bot remembers the content of your last messages. It is done like that so you can ask bot to clarify previous question OR to have a continuous conversation within the topic.
    %0AUse <b>command /new to reset a context</b>.
    %0A
    %0A<b>Have any questions?</b>
    %0ASend a detailed message to account <a href="https://t.me/MGlower">@MGlower</a>
    %0A
    %0A<b>Found a problem?</b>
    %0ACreate an issue on GitHub repository of the project <a href="https://github.com/MGlower-RU/GPT_assistant_tg/issues">Link</a>
  `;

  const options = {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🔑 Input apikey',
            callback_data: '/apikey'
          },
        ],
        [
          {
            text: 'Contact me',
            url: 'https://t.me/MGlower'
          },
          {
            text: 'My GitHub',
            url: 'https://github.com/MGlower-RU',
          },
        ]
      ],
    }
  }

  await telegramSendMessage(chatId, response, options)
  setUserMessageData(chatId, { action: MessageAction.BOT_PROMPT })
}

/**
 * Function to set/update apikey for bot
 * @param chatId id of a chat
 * @param apiKey updated apikey
 */
export async function setApikey(chatId: number, apiKey?: string) {
  const actionType = getUserMessageData(chatId).action
  if (actionType === MessageAction.APIKEY_INPUT && apiKey) {
    const result: QueryData.QueryResponse<{ error: QueryData.ErrorType.OTHER }> = await fetch(`${hostURL}/api/firebase`, {
      method: 'POST',
      body: JSON.stringify({
        action: MessageAction.APIKEY_INPUT,
        chatId,
        apiKey
      }),
      headers: {
        "firebase-query": FETCH_SAFETY_HEADER
      }
    }).then(res => res.json())

    if (typeof result !== 'string') {
      throw result
    }

    await telegramSendMessage(chatId, result)
    setUserMessageData(chatId, { action: MessageAction.BOT_PROMPT })
  } else {
    await telegramSendMessage(chatId, '🔑 Please, input your apiKey:')
    setUserMessageData(chatId, { action: MessageAction.APIKEY_INPUT })
  }
}

/**
 * Function to start a new conversation with a bot
 * @param chatId id of a chat
 * @param message optional. Message to be displayed as a greeting for new chat.
 */
export async function startNewBotChat(chatId: number, message?: string) {
  const result: QueryData.QueryResponse<QueryData.ErrorUnion> = await fetch(`${hostURL}/api/firebase`, {
    method: 'POST',
    body: JSON.stringify({
      action: MessageAction.NEW_BOT_CHAT,
      chatId
    }),
    headers: {
      "firebase-query": FETCH_SAFETY_HEADER
    }
  }).then(res => res.json())

  if (typeof result !== 'string') {
    throw result
  }

  await telegramSendMessage(chatId, message ?? 'How can I help you today?')
  setUserMessageData(chatId, { action: MessageAction.BOT_PROMPT })
}

/**
 * Function to send a message with mode menu
 * @param chatId telegram chat id
 */
export const getModesMenu = async (chatId: number) => {
  const response = `
    You are in the modes menu.
    %0A
    %0AChoose one of the options:
    %0Aall - to see all modes with its prompts
    %0Aset - to set a mode for the chat
    %0Aadd - to add a new mode
  `

  const options = {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'all',
            callback_data: '/mode_all'
          },
          {
            text: 'set',
            callback_data: '/mode_set'
          },
          {
            text: 'add',
            callback_data: '/mode_add'
          },
        ],
      ],
    }
  }

  const message = await telegramSendMessage(chatId, response, options)
  setUserMessageData(chatId, { last_message_id: message.message_id })
}

/**
 * Function edits a mode menu message and lets you choose a mode for bot
 * @param chatId id of your chat
 */
export const setMode = async (chatId: number, mode?: string) => {
  const messageData = getUserMessageData(chatId)

  if (messageData.action === MessageAction.MODE_SET && mode) {
    setUserMessageData(chatId, { mode })

    await startNewBotChat(chatId)
    await telegramEditMessage(chatId, `Mode [${mode}] is set`, messageData.last_message_id)
  } else {
    const allModes = await getAllModesQuery(chatId)
    const messagId = getUserMessageData(chatId).last_message_id

    if (allModes !== null) {
      const inline_keyboard = allModes.map(mode => [{ text: mode.name, callback_data: mode.name }])
      const response = `Choose your mode:`
      const options = {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard
        }
      }

      await telegramEditMessage(chatId, response, messagId, options)
      setUserMessageData(chatId, { action: MessageAction.MODE_SET })
    }
  }
}

export const getAllModes = async (chatId: number) => {
  const allModes = await getAllModesQuery(chatId)

  if (allModes !== null) {
    const modesMessage = allModes.reduce((acc, { name, description }) => {
      return acc + `
        %0A<b>${name}</b>
        %0A--------------------------
        %0A${description}
        %0A
        %0A
      `
    }, '')
    const response = `
      <i>The modes you already have:</i>
      %0A
      ${modesMessage}
    `
    await telegramSendMessage(chatId, response)
  }

}

export async function defaultMessage(message: Message.TextMessage) {
  const { chat: { id }, text } = message
  let actionType = getUserMessageData(id).action

  // change to switch if possible
  if (actionType === MessageAction.BOT_PROMPT) {
    await getBotPrompt(id, text)
  } else if (actionType === MessageAction.APIKEY_INPUT) {
    await setApikey(id, text)
  } else if (actionType === MessageAction.MODE_SET) {
    if (message.from?.is_bot) {
      await setMode(id, text)
    } else {
      await telegramSendMessage(id, 'You have to pick one of the options')
      throw errors.TELEGRAM_QUERY('Incorrect option input')
    }
  }
}

/**
 * Function to get an answer on prompt from GPT-bot
 * @param chatId id of your telegram chat
 * @param content prompt you want to pass to the bot
 */
export const getBotPrompt = async (chatId: number, content: string) => {
  const fbData: Exclude<QueryData.QueryResponse<QueryData.UserDataQuery | QueryData.ErrorUnion>, string> = await fetch(`${hostURL}/api/firebase?chatId=${chatId}&action=bot_prompt`, {
    method: 'GET',
    headers: {
      "firebase-query": FETCH_SAFETY_HEADER
    }
  }).then(res => res.json())

  if ('error' in fbData) {
    throw fbData
  }

  const { messages, apiKey } = fbData

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

    if (messages.length >= USER_MESSAGES_MAX_LENGTH * 2) {
      await new Promise(resolve => setTimeout(() => {
        resolve('')
      }, 1000))

      await startNewBotChat(chatId, `
        ${'-'.repeat(100)}
        %0ANew conversation has started.
        %0APrevious conversation context was cleared
      `)
    } else {
      await fetch(`${hostURL}/api/firebase`, {
        method: 'POST',
        body: JSON.stringify({
          action: MessageAction.BOT_PROMPT,
          messages,
          chatId
        }),
        headers: {
          "firebase-query": FETCH_SAFETY_HEADER
        }
      })
    }
  }
}


// Utils

/**
 * Function to set a current host URL
 * @param url Input your site hostURL
 */
export const setURL = (url: string): void => { hostURL = url }

/**
 * Function accepts telegram chat id and returns current user's message action
 * @param chatId telegram chat id
 * @returns user's message type
 */
export const getUserMessageData = (chatId: number): UserMessageData => usersDataMessages.get(chatId)!

/**
 * Function accepts telegram chat id and sets current user's message data
 * @param chatId telegram chat id
 * @param data data object of the data to be updated.
 * @returns updated user's message data
 */
export const setUserMessageData = (chatId: number, data: Partial<UserMessageData>): UserMessageData => {
  const newData = { ...(getUserMessageData(chatId) ?? {}), ...data }
  usersDataMessages.set(chatId, newData)
  return newData
}

/**
 * Encodes your options object into valid query string.
 * @param options your options object.
 * @returns encoded query string.
 */
export const encodeURIOptions = (options: { [K: string]: any }): ReturnType<typeof encodeURIComponent> => {
  const objectKeys = Object.entries(options)
  return objectKeys.map(([k, v]) => `${k}=${encodeURIComponent(typeof v === 'object' ? JSON.stringify(v) : v)}`).join("&")
}

/**
 * 
 * @param chatId 
 * @returns 
 */
const getAllModesQuery = async (chatId: number): Promise<QueryData.ModesQuery | null> => {
  const allModes: Exclude<QueryData.QueryResponse<QueryData.ModesQuery | QueryData.ErrorUnion>, string> = await fetch(`${hostURL}/api/firebase?chatId=${chatId}&action=${MessageAction.MODE_ALL}`, {
    method: 'GET',
    headers: {
      "firebase-query": FETCH_SAFETY_HEADER
    }
  }).then(res => res.json())

  if ('error' in allModes) {
    throw allModes
  }

  if (allModes.length === 0) {
    const messagId = getUserMessageData(chatId).last_message_id
    const response = `
        You haven't added any modes yet.
        %0AUse command /mode and choose "add" option to add a new mode.
      `
    await telegramEditMessage(chatId, response, messagId)
    return null
  } else {
    return allModes
  }
}

type LoadingActions = "set" | "remove"
type LoadingReturnType<T> = T extends "set" ? number : T extends "remove" ? string : any
/**
 * 
 * @param chatId telegram chat id.
 * @param action "set" - to send a loading message or "remove" - to remove it from chat.
 */
export const sendLoadingContent = async <T extends LoadingActions>(chatId: number, action: T, messageId?: number): Promise<LoadingReturnType<T>> => {
  if (action === "set") {
    setUserMessageData(chatId, { loading: true })
    const msg = await telegramSendMessage(chatId, "🍥Wait a moment, please...")

    return msg.message_id as any
  } else if (action === "remove") {
    await telegramDeleteMessage(chatId, messageId!)

    setUserMessageData(chatId, { loading: false })
    return "ok" as any
  } else {
    setUserMessageData(chatId, { action: MessageAction.BOT_PROMPT })
    throw errors.OTHER()
  }
}

/**
 * 
 * @param chatId chat id from telegram request.
 * @param message input your text you want to be send by bot here.
 * @param options extend your message with additional parameters. By default: { "parse_mode": "HTML" }.
 */
export const telegramSendMessage = async (chatId: number, message: string, options: { [K: string]: any } = { "parse_mode": "HTML" }): Promise<Message.TextMessage> => {
  const extendedOptions = encodeURIOptions(options)

  const messageData = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${chatId}&text=${message}&${extendedOptions}`
  )
    .then(res => res.json())
    .then(data => data.result)
    .catch(err => {
      throw errors.TELEGRAM_QUERY(`Couldn't send telegram message%0AReason: ${err}`)
    });
  return messageData
}

/**
 * 
 * @param chatId chat id from telegram request.
 * @param message input your text you want to be send by bot here.
 * @param messageId input id of the message you want to edit.
 * @param options extend your message with additional parameters. By default: { "parse_mode": "HTML" }.
 */
export const telegramEditMessage = async (chatId: number, message: string, messageId: number, options: { [K: string]: any } = { "parse_mode": "HTML" }): Promise<Message.TextMessage> => {
  const extendedOptions = encodeURIOptions(options)

  const messageData = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText?chat_id=${chatId}&message_id=${messageId}&text=${message}&${extendedOptions}`
  )
    .then(res => res.json())
    .then(data => data.result)
    .catch(err => {
      throw errors.TELEGRAM_QUERY(`Couldn't send telegram message%0AReason: ${err}`)
    });
  return messageData
}

/**
 * The function lets you delete the message in telegram by id.
 * @param chatId chat id from telegram request.
 * @param messageId Id of the message to be deleted.
 * @returns True if successfully delete or throws an Error otherwise. 
 */
export const telegramDeleteMessage = async (chatId: number, messageId: number): Promise<boolean> => {
  const messageData = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteMessage?chat_id=${chatId}&message_id=${messageId}`
  )
    .then(res => res.json())
    .then(res => res.result)
    .catch(err => {
      throw errors.TELEGRAM_QUERY(`Couldn't delete telegram message%0AReason: ${err}`)
    });
  return messageData
}