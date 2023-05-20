import { telegramSendMessage } from "@/firebase/functions";
import { CatchErrorProps, CollectionTypes, QueryData, MessageTypeStatuses } from "@/types/tlg";
import { NextApiRequest, NextApiResponse } from "next";
import { ChatCompletionRequestMessageRoleEnum, ChatCompletionResponseMessageRoleEnum, Configuration, OpenAIApi } from 'openai'

import type { BotCommand, Message } from 'typegram'

let URL: string | null = null

const tlg = async (req: NextApiRequest, res: NextApiResponse) => {
  if (URL === null) URL = `https://${req.headers.host}`

  const message: Message.TextMessage = req.body.message

  try {
    if (!message || !message.text) {
      throw new Error
    }

    const { text } = message;

    switch (text) {
      case '/start':
        await startMessage(message)
        break;
      case '/help':
        await helpMessage(message)
        break;
      case '/apikey':
        await setApikey(message.chat.id)
        break;
      default:
        await promptMessage(message)
        break;
    }
  }
  catch (error) {
    console.log('error in tlg')
    const typedError = error as CatchErrorProps

    if ('error' in typedError) {
      await telegramSendMessage(message.chat.id, typedError.data)
    } else {
      const errorMessage = `Oops..Something went wrong.%0ATry again later%0AThe cause: ${typedError}`
      await telegramSendMessage(message.chat.id, errorMessage)
    }
  }
  finally {
    res.status(200).json('ok')
  }
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

async function setApikey(chatId: number) {
  const result: QueryData.QueryResponse<{ error: QueryData.ErrorType.OTHER }> = await fetch(`${URL}/api/firebase`, {
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

async function promptMessage(message: Message.TextMessage) {
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
  }).catch(() => { throw { error: QueryData.ErrorType.APIKEY, data: 'Enter an actual ApiKey given by OpenAI.%0AVisit <a href="https://platform.openai.com/account/api-keys">official OpenAI page</a> to see your apiKey.' } })

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
}