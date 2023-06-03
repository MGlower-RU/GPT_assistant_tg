import { MessageAction, QueryData, UserMessageData } from "@/types/tlg"
import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from "openai"
import { BotCommand, Message } from "typegram"
import { errors } from "./errors"

const FETCH_SAFETY_HEADER = process.env.SAFETY_FETCH_HEADER!

const commands: BotCommand[] = [
  { command: "/help", description: 'get information of how this bot works' },
  { command: "/new", description: 'start new conversation with bot' },
  { command: "/mode", description: 'select a mode for current chat and manage modes' },
  { command: "/apikey", description: 'input your OpenAI apikey' },
  { command: "/history", description: 'show previous conversation' },
  { command: "/retry", description: 'send previous prompt again' },
  { command: "/cancel", description: 'cancel an active action' },
  { command: "/test", description: 'ask 10 free questions to the bot' },
]
const commandsIcons = ['😣', '🆕', '🦖', '🔑', '📜', '📌', '✖️', '🆓']

const commandsString = commands.reduce((acc, { command, description }, idx) => {
  return acc + `
  %0A-------------------
  %0A${commandsIcons[idx] ?? '🍥'} ${command} - ${description}
  `
}, '')

console.log('updated');

export const usersDataMessages = new Map<number, UserMessageData>()

export const USER_MESSAGES_MAX_LENGTH = 20
export let hostURL: string | null = null
export const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'

let TELEGRAM_TOKEN = isDev ? process.env.TELEGRAM_TOKEN_DEV : process.env.TELEGRAM_TOKEN;

// setBotCommands automatically
(async () => {
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setMyCommands?commands=${JSON.stringify(commands)}`
  )
})()

// TELEGRAM COMMANDS FUNCTIONS

/**
 * Function for /start command. Initializes a user on the first bot launch.
 * @param message Message object from telegram request.
 */
export async function startMessage(message: Message.TextMessage) {
  const chatId = message.chat.id

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
        action: MessageAction.USER_DATA,
        chatId,
        userData: { apiKey }
      }),
      headers: {
        "firebase-query": FETCH_SAFETY_HEADER
      }
    }).then(res => res.json())

    if (typeof result !== 'string') {
      throw result
    }

    await setTestApikey(chatId, false)
    await telegramSendMessage(chatId, 'ApiKey successfully updated')
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
export async function startNewBotChat(chatId: number, options?: { message: string, userData?: Partial<QueryData.UserDataQuery> }) {
  const result: QueryData.QueryResponse<QueryData.ErrorUnion> = await fetch(`${hostURL}/api/firebase`, {
    method: 'POST',
    body: JSON.stringify({
      action: MessageAction.NEW_BOT_CHAT,
      userData: options?.userData ?? {},
      chatId
    }),
    headers: {
      "firebase-query": FETCH_SAFETY_HEADER
    }
  }).then(res => res.json())

  if (typeof result !== 'string') {
    throw result
  }

  await telegramSendMessage(chatId, options?.message ?? 'How can I help you today?')
  setUserMessageData(chatId, { action: MessageAction.BOT_PROMPT })
}

export const setTestApikey = async (chatId: number, isTrial: boolean = true) => {
  const result: QueryData.QueryResponse<QueryData.ErrorUnion> = await fetch(`${hostURL}/api/firebase`, {
    method: 'POST',
    body: JSON.stringify({
      action: MessageAction.USER_DATA,
      userData: { isTrial },
      chatId
    }),
    headers: {
      "firebase-query": FETCH_SAFETY_HEADER
    }
  }).then(res => res.json())

  if (typeof result !== 'string') {
    throw result
  }
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
    %0Adelete - to delete an existing mode
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
        ],
        [
          {
            text: 'add',
            callback_data: '/mode_add'
          },
          {
            text: 'delete',
            callback_data: '/mode_delete'
          },
        ]
      ],
    }
  }

  const message = await telegramSendMessage(chatId, response, options)
  setUserMessageData(chatId, { last_message_id: message.message_id })
}

/**
 * 
 * @param chatId 
 * @param text 
 */
export const addMode = async (chatId: number, text?: string) => {
  const { action, new_mode_name } = getUserMessageData(chatId)

  if (text && action === MessageAction.MODE_NAME) {
    await telegramSendMessage(chatId, 'Enter mode prompt:')
    setUserMessageData(chatId, { action: MessageAction.MODE_PROMPT, new_mode_name: text })
  } else if (text && action === MessageAction.MODE_PROMPT) {
    const result: QueryData.QueryResponse<QueryData.ErrorUnion> = await fetch(`${hostURL}/api/firebase`, {
      method: 'POST',
      body: JSON.stringify({
        action: MessageAction.MODE_NEW,
        modeData: {
          name: new_mode_name,
          description: text
        },
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
      Mode [${new_mode_name}] was successfully created.
      %0A
      %0ATo use this mode enter command /mode --> choose "set" ---> choose your mode  
    `
    await telegramSendMessage(chatId, response)
    setUserMessageData(chatId, { action: MessageAction.BOT_PROMPT, new_mode_name: '' })
  } else {
    await telegramSendMessage(chatId, 'Enter mode name:')
    setUserMessageData(chatId, { action: MessageAction.MODE_NAME })
  }
}

/**
 * Function edits a mode menu message and lets you choose a mode for bot
 * @param chatId id of your chat
 * @param modeId
 */
export const setMode = async (chatId: number, modeId?: string) => {
  const { action, last_message_id } = getUserMessageData(chatId)

  if (modeId && action === MessageAction.MODE_SET) {
    const result: QueryData.QueryResponse<{ error: QueryData.ErrorType.OTHER }> = await fetch(`${hostURL}/api/firebase`, {
      method: 'POST',
      body: JSON.stringify({
        action: MessageAction.USER_DATA,
        chatId,
        userData: { mode: modeId }
      }),
      headers: {
        "firebase-query": FETCH_SAFETY_HEADER
      }
    }).then(res => res.json())

    if (typeof result !== 'string') {
      throw result
    }
    setUserMessageData(chatId, { mode: modeId })

    await startNewBotChat(chatId)
    await telegramEditMessage(chatId, `Mode [${modeId}] is set`, last_message_id)
  } else {
    const allModes = await getAllModesQuery(chatId)

    if (allModes !== null) {
      const inline_keyboard = allModes.map(mode => [{ text: mode.name, callback_data: mode.name }])
      const response = `Choose a mode to set:`
      const options = {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard
        }
      }

      await telegramEditMessage(chatId, response, last_message_id, options)
      setUserMessageData(chatId, { action: MessageAction.MODE_SET })
    }
  }
}

export const cancelLastAction = async (chatId: number, isButton?: boolean) => {
  const { action, last_message_id } = getUserMessageData(chatId)

  if (action === MessageAction.BOT_PROMPT) {
    await telegramSendMessage(chatId, 'There is nothing to cancel.')
  } else if (isButton && last_message_id) {
    console.log('should return a previous action on button')
  } else {
    setUserMessageData(chatId, { action: MessageAction.BOT_PROMPT })
    await telegramSendMessage(chatId, 'Your last action was cancelled.')
  }
}

export const deleteMode = async (chatId: number, modeId?: string) => {
  const { action, last_message_id, mode } = getUserMessageData(chatId)

  if (modeId && action === MessageAction.MODE_DELETE) {
    const result: QueryData.QueryResponse<QueryData.ErrorUnion> = await fetch(`${hostURL}/api/firebase`, {
      method: 'POST',
      body: JSON.stringify({
        action: MessageAction.MODE_DELETE,
        modeId,
        chatId
      }),
      headers: {
        "firebase-query": FETCH_SAFETY_HEADER
      }
    }).then(res => res.json())

    if (typeof result !== 'string') {
      throw result
    }

    const response = `Mode [${modeId}] was successfully deleted.`

    await telegramEditMessage(chatId, response, last_message_id)
    setUserMessageData(chatId, { action: MessageAction.BOT_PROMPT })

    if (modeId === mode) {
      setUserMessageData(chatId, { mode: 'default' })

      const response = `
        You have deleted your last conversation mode,
        %0Atherefore, new chat without any mode has started.
      `
      await startNewBotChat(chatId, { message: response })
    }
  } else {
    const allModes = await getAllModesQuery(chatId)

    if (allModes !== null) {
      const inline_keyboard = allModes.map(mode => [{ text: mode.name, callback_data: mode.name }])
      const response = `Choose a mode to delete:`
      const options = {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard
        }
      }

      await telegramEditMessage(chatId, response, last_message_id, options)
      setUserMessageData(chatId, { action: MessageAction.MODE_DELETE })
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

export const retryBotPrompt = async (chatId: number) => {
  const { last_bot_prompt } = getUserMessageData(chatId)

  if (last_bot_prompt) {
    await createBotPrompt(chatId, last_bot_prompt)
  } else {
    await telegramSendMessage(chatId, `You haven't asked any questions yet.`)
  }
}

export const getChatHistory = async (chatId: number) => {
  const chatHistory: Exclude<QueryData.QueryResponse<QueryData.MessagesQuery | QueryData.ErrorUnion>, string> = await fetch(`${hostURL}/api/firebase?chatId=${chatId}&action=${MessageAction.CHAT_HISTORY}`, {
    method: 'GET',
    headers: {
      "firebase-query": FETCH_SAFETY_HEADER
    }
  }).then(res => res.json())

  if ('error' in chatHistory) {
    throw chatHistory
  }

  const formattedChatHistory = chatHistory.reduce((acc, { content, role }) => {
    return acc + `
      %0A<b>${role}:</b> ${content}
      %0A
    `
  }, '')

  const response = `
    The history of your chat:
    %0A
    ${formattedChatHistory}
  `

  await telegramSendMessage(chatId, response)
}

export const defaultMessage = async (message: Message.TextMessage) => {
  const { chat: { id }, text } = message
  let actionType = getUserMessageData(id).action

  // change to switch if possible
  if (actionType === MessageAction.BOT_PROMPT) {
    await createBotPrompt(id, text)
  } else if (actionType === MessageAction.APIKEY_INPUT) {
    await setApikey(id, text)
  } else if (actionType === MessageAction.MODE_SET) {
    if (message.from?.is_bot) {
      await setMode(id, text)
    } else {
      await telegramSendMessage(id, 'You have to pick one of the options above')
    }
  } else if (actionType === MessageAction.MODE_NAME || actionType === MessageAction.MODE_PROMPT) {
    await addMode(id, text)
  } else if (actionType === MessageAction.MODE_DELETE) {
    if (message.from?.is_bot) {
      await deleteMode(id, text)
    } else {
      await telegramSendMessage(id, 'You have to pick one of the options above')
    }
  }
}

/**
 * Function to get an answer on prompt from GPT-bot
 * @param chatId id of your telegram chat
 * @param content prompt you want to pass to the bot
 */
export const createBotPrompt = async (chatId: number, content: string) => {
  const fbData: Exclude<QueryData.QueryResponse<QueryData.UserDataQuery | QueryData.ErrorUnion>, string> = await fetch(`${hostURL}/api/firebase?chatId=${chatId}&action=${MessageAction.BOT_PROMPT}`, {
    method: 'GET',
    headers: {
      "firebase-query": FETCH_SAFETY_HEADER
    }
  }).then(res => res.json())

  if ('error' in fbData) {
    throw fbData
  }

  const { messages, apiKey, isTrial, trialUses } = fbData

  if (isTrial && trialUses < 1) {
    throw errors.INVALID_APIKEY(`You have 0 trial messages left. Please, input your own apiKey with a command /apikey`)
  }

  const configuration = new Configuration({ apiKey: isTrial ? process.env.OPENAI_API_KEY! : apiKey })
  const openai = new OpenAIApi(configuration)
  const userPrompt = { role: ChatCompletionRequestMessageRoleEnum.User, content }

  messages.push(userPrompt)
  setUserMessageData(chatId, { last_bot_prompt: userPrompt.content })

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

  if (!botResponse?.content) {
    await telegramSendMessage(chatId, "Bot couldn't answer your question%0ATry to ask another one")
  } else {
    await telegramSendMessage(chatId, botResponse.content)

    messages.push({ role: botResponse.role, content: botResponse.content })

    if (messages.length >= USER_MESSAGES_MAX_LENGTH * 2) {
      await new Promise(resolve => setTimeout(() => {
        resolve('')
      }, 1000))

      await startNewBotChat(chatId, {
        message: `
          ${'-'.repeat(100)}
          %0ANew conversation has started.
          %0APrevious conversation context was cleared
        `,
        userData: { trialUses, isTrial }
      })
    } else {
      await fetch(`${hostURL}/api/firebase`, {
        method: 'POST',
        body: JSON.stringify({
          action: MessageAction.BOT_PROMPT,
          userData: { messages, trialUses, isTrial },
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
      throw errors.TELEGRAM_QUERY(`Couldn't edit telegram message%0AReason: ${err}`)
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