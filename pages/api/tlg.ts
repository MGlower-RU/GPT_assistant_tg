import { telegramSendMessage } from "@/firebase/functions";
import { CatchErrorProps, CollectionTypes, QueryData } from "@/types/tlg";
import { NextApiRequest, NextApiResponse } from "next";
import { ChatCompletionRequestMessageRoleEnum, ChatCompletionResponseMessageRoleEnum, Configuration, OpenAIApi } from 'openai'

import type { BotCommand, Message } from 'typegram'

const tgBotVar = process.env.NEXT_TELEGRAM_TOKEN
let URL: string | null = null

const tlg = async (req: NextApiRequest, res: NextApiResponse) => {
  // return res.status(200).json('ok')
  if (URL === null) URL = `https://${req.headers.host}`

  const message: Message.TextMessage = req.body.message

  if (!message || !message.text) {
    return res.status(200).json('something went wrong!')
  }

  const { text } = message;

  const commands: BotCommand[] = [
    { command: "/help", description: 'Get information of how this bot works' },
    { command: "/new", description: 'Start new conversation with bot' },
    { command: "/mode", description: 'Select a mode for current chat and manage modes' },
    { command: "/apikey", description: 'Input your OpenAI apikey' },
    { command: "/history", description: 'Show previous conversation' }
  ]
  const commandsJSON = JSON.stringify(commands)

  await fetch(
    `https://api.telegram.org/bot${tgBotVar}/setMyCommands?commands=${commandsJSON}`,
  ).then(res => console.log(res))
  // - /start
  // - /help
  // - /newChat
  // - /chatMode
  // - /setApikey (status field in FB === 'apikey' --> call function to set apikey with message.text)
  // - /history

  if (text.startsWith('/setApikey')) {
    await setApikey(message)
  } else {
    switch (text) {
      case '/start':
        await startMessage(message)
        break;
      case '/help':
        await helpMessage(message)
        break;
      default:
        await promptMessage(message)
        break;
    }
  }
  res.status(200).json('ok')
}

export default tlg

async function startMessage(message: Message.TextMessage) {
  const response =
    'Welcome to <i>AI assistant bot</i>, <b>' +
    message.from?.first_name +
    '</b>.%0ATo get a list of commands send /help';
  await telegramSendMessage(message.chat.id, response)
}

async function helpMessage(message: Message.TextMessage) {
  const response = 'Help for <i>AI assistant bot</i>.%0AUse /start <i>keyword</i> to get greeting message.';
  await telegramSendMessage(message.chat.id, response)
}

async function setApikey(message: Message.TextMessage) {
  try {
    const apikey = message.text.split(' ')[1] ?? ''

    const promise: QueryData.QueryResponse<{ error: QueryData.ErrorType.APIKEY }> = await fetch(`${URL}/api/firebase`, {
      method: 'POST',
      body: JSON.stringify({
        type: CollectionTypes.OPENAI_API_KEY,
        apikey: apikey,
        chatId: message.chat.id
      }),
      headers: {
        "firebase-query": "firebaseQueryHeader"
      }
    }).then(res => res.json())

    if (typeof promise !== 'string') {
      throw promise
    } else {
      await telegramSendMessage(message.chat.id, promise)
    }
  } catch (error) {
    const typedError = error as CatchErrorProps

    if ('error' in typedError) {
      await telegramSendMessage(message.chat.id, typedError.data)
    } else {
      const errorMessage = `Oops..Something went wrong.%0A<b>Try again later.</b>%0AThe cause: ${typedError}`
      await telegramSendMessage(message.chat.id, errorMessage)
    }
  }
}

async function promptMessage(message: Message.TextMessage) {
  try {
    const firebase = await fetch(`${URL}/api/firebase?chatId=${message.chat.id}`, {
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
    })

    const botResponse = completion.data.choices[0].message;

    await telegramSendMessage(message.chat.id, botResponse?.content ?? '')

    newMessagesArray.push({ role: botResponse?.role ?? ChatCompletionResponseMessageRoleEnum.Assistant, content: botResponse?.content ?? '' })

    await fetch(`${URL}/api/firebase`, {
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
  } catch (error) {
    console.log('error in tlg')
    const typedError = error as CatchErrorProps

    if ('error' in typedError) {
      console.log(typedError.data)
      await telegramSendMessage(message.chat.id, typedError.data)
    } else {

      const errorMessage = `Oops..Something went wrong.%0ATry again later%0AThe cause: ${typedError}`
      await telegramSendMessage(message.chat.id, errorMessage)
    }
  }
}