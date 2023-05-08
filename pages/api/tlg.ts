import { openaiApikeyVar, tgbotVar } from "@/utils/variables";
import { NextApiRequest, NextApiResponse } from "next";
import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, ChatCompletionResponseMessageRoleEnum, Configuration, OpenAIApi } from 'openai'

import type { Message } from 'typegram'

const configuration = new Configuration({
  apiKey: openaiApikeyVar,
})

const openai = new OpenAIApi(configuration)

const messages: ChatCompletionRequestMessage[] = []
const apiKey: string | null = process.env.OPENAI_API_KEY ?? null

const tlg = async (req: NextApiRequest, res: NextApiResponse) => {
  // return res.status(200).json('ok')
  const firebase = await fetch('http://localhost:3000/api/firebase', {
    method: 'GET',
  })
  const fbData = await firebase.json()
  console.log(fbData.data)

  const message: Message.TextMessage = req.body.message

  if (!message || !message.text) {
    res.status(500).json('something went wrong!')
  }

  // const db = getFirestore(app)
  // const querySnapshot = await getDocs(collection(db, "messages"));
  // querySnapshot.forEach((doc) => {
  //   console.log(`${doc.id} => ${doc.data()}`);
  // });

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
  res.status(200).json(message)
}

export default tlg

async function startMessage(message: Message.TextMessage) {
  const response =
    'Welcome to <i>AI assistant bot</i> <b>' +
    message.from?.first_name +
    '</b>.%0ATo get a list of commands send /help';
  await fetch(
    `https://api.telegram.org/bot${tgbotVar}/sendMessage?chat_id=${message.chat.id}&text=${response}&parse_mode=HTML`
  );
}

async function helpMessage(message: Message.TextMessage) {
  const response =
    'Help for <i>AI assistant bot</i>.%0AUse /start <i>keyword</i> to get greeting message.';
  await fetch(
    `https://api.telegram.org/bot${tgbotVar}/sendMessage?chat_id=${message.chat.id}&text=${response}&parse_mode=HTML`
  );
}

async function promptMessage(message: Message.TextMessage) {
  // emit event promptMessage to useEffect hook and generate response on client
  try {
    messages.push({ role: ChatCompletionRequestMessageRoleEnum.User, content: message.text })

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.6,
      max_tokens: 1000,
      n: 1
    })
    const botResponse = completion.data.choices[0].message;

    await fetch(
      `https://api.telegram.org/bot${tgbotVar}/sendMessage?chat_id=${message.chat.id}&text=${botResponse?.content ?? ''}`
    );
    messages.push({ role: botResponse?.role ?? ChatCompletionResponseMessageRoleEnum.Assistant, content: botResponse?.content ?? '' })
  } catch (error) {
    const errorMessage = `Oops..Something went wrong.%0ATry again later%0AThe cause: ${error}`
    await fetch(
      `https://api.telegram.org/bot${tgbotVar}/sendMessage?chat_id=${message.chat.id}&text=${errorMessage}`
    );
  }
}