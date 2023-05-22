import { helpMessage, hostURL, promptMessage, setApikey, setURL, startMessage, telegramSendMessage } from "@/utils/telegram/functions";
import { CatchErrorProps } from "@/types/tlg";
import { NextApiRequest, NextApiResponse } from "next";

import type { Message } from 'typegram'

const tlg = async (req: NextApiRequest, res: NextApiResponse) => {
  if (hostURL === null) setURL(`https://${req.headers.host}`)

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