import { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi } from 'openai'

import type { Message } from 'typegram'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)
const tgbot = process.env.NEXT_TELEGRAM_TOKEN

const tlg = async (req: NextApiRequest, res: NextApiResponse) => {
  const message: Message.TextMessage = req.body.message

  switch (message.text) {
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
  res.status(200).send(message)
  return
}

export default tlg

async function startMessage(message: Message.TextMessage) {
  const response =
    'Welcome to <i>AI assistant bot</i> <b>' +
    message.from?.first_name +
    '</b>.%0ATo get a list of commands send /help';
  await fetch(
    `https://api.telegram.org/bot${tgbot}/sendMessage?chat_id=${message.chat.id}&text=${response}&parse_mode=HTML`
  );
}

async function helpMessage(message: Message.TextMessage) {
  const response =
    'Help for <i>AI assistant bot</i>.%0AUse /start <i>keyword</i> to get greeting message.';
  await fetch(
    `https://api.telegram.org/bot${tgbot}/sendMessage?chat_id=${message.chat.id}&text=${response}&parse_mode=HTML`
  );
}

async function promptMessage(message: Message.TextMessage) {
  try {
    const completion = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: message.text,
      temperature: 0.6,
      max_tokens: 1000,
    })
    await fetch(
      `https://api.telegram.org/bot${tgbot}/sendMessage?chat_id=${message.chat.id}&text=${completion.data.choices[0].text}`
    );
  } catch (error) {
    const errorMessage = `Oops..Something went wrong.%0ATry again later%0AThe cause: ${error}`
    await fetch(
      `https://api.telegram.org/bot${tgbot}/sendMessage?chat_id=${message.chat.id}&text=${errorMessage}`
    );
  }
}