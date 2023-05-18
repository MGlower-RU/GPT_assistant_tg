import { CatchErrorProps, CollectionTypes, QueryData } from "@/types/tlg";
import { NextApiRequest, NextApiResponse } from "next";
import { ChatCompletionRequestMessageRoleEnum, ChatCompletionResponseMessageRoleEnum, Configuration, OpenAIApi } from 'openai'

import type { Message } from 'typegram'

const tgBotVar = process.env.NEXT_TELEGRAM_TOKEN
let URL: string | null = null

const tlg = async (req: NextApiRequest, res: NextApiResponse) => {
  // return res.status(200).json('ok')
  if (URL === null) URL = `https://${req.headers.host}`

  const message: Message.TextMessage = req.body.message

  if (!message || !message.text) {
    res.status(500).json('something went wrong!')
  }

  const { text } = message

  if (text.startsWith('/apikey')) {
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
    'Welcome to <i>AI assistant bot</i> <b>' +
    message.from?.first_name +
    '</b>.%0ATo get a list of commands send /help';
  await fetch(
    `https://api.telegram.org/bot${tgBotVar}/sendMessage?chat_id=${message.chat.id}&text=${response}&parse_mode=HTML`
  );
}

async function helpMessage(message: Message.TextMessage) {
  const response =
    'Help for <i>AI assistant bot</i>.%0AUse /start <i>keyword</i> to get greeting message.';
  await fetch(
    `https://api.telegram.org/bot${tgBotVar}/sendMessage?chat_id=${message.chat.id}&text=${response}&parse_mode=HTML`
  );
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
      })
    }).then(res => res.json())



    if (typeof promise !== 'string') {
      throw promise
    } else {
      await fetch(
        `https://api.telegram.org/bot${tgBotVar}/sendMessage?chat_id=${message.chat.id}&text=${promise}`
      );
    }

  } catch (error) {
    const typedError = error as CatchErrorProps

    if ('error' in typedError) {
      await fetch(
        `https://api.telegram.org/bot${tgBotVar}/sendMessage?chat_id=${message.chat.id}&text=${typedError.data}&parse_mode=HTML`
      );
    } else {
      const errorMessage = `Oops..Something went wrong.%0ATry again later%0AThe cause: ${typedError}`
      await fetch(
        `https://api.telegram.org/bot${tgBotVar}/sendMessage?chat_id=${message.chat.id}&text=${errorMessage}`
      );
    }
  }
}

async function promptMessage(message: Message.TextMessage) {
  try {
    const firebase = await fetch(`${URL}/api/firebase?chatId=${message.chat.id}`, {
      method: 'GET',
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

    await fetch(
      `https://api.telegram.org/bot${tgBotVar}/sendMessage?chat_id=${message.chat.id}&text=${botResponse?.content ?? ''}`
    );
    newMessagesArray.push({ role: botResponse?.role ?? ChatCompletionResponseMessageRoleEnum.Assistant, content: botResponse?.content ?? '' })

    await fetch(`${URL}/api/firebase`, {
      method: 'POST',
      body: JSON.stringify({
        type: CollectionTypes.MESSAGES,
        messages: newMessagesArray,
        chatId: message.chat.id
      })
    })
  } catch (error) {
    console.log('error in tlg')
    const typedError = error as CatchErrorProps

    if ('error' in typedError) {
      await fetch(
        `https://api.telegram.org/bot${tgBotVar}/sendMessage?chat_id=${message.chat.id}&text=${typedError.data}`
      );
    } else {
      const errorMessage = `Oops..Something went wrong.%0ATry again later%0AThe cause: ${typedError}`
      await fetch(
        `https://api.telegram.org/bot${tgBotVar}/sendMessage?chat_id=${message.chat.id}&text=${errorMessage}`
      );
    }
  }
}