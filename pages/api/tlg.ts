import { helpMessage, hostURL, defaultMessage, setApikey, setURL, startMessage, telegramSendMessage, startNewBotChat, getUserMessageData, setUserMessageData, sendLoadingContent } from "@/utils/telegram/functions";
import { CatchErrorProps, MessageAction } from "@/types/tlg";
import { NextApiRequest, NextApiResponse } from "next";

import type { CallbackQuery, InlineQueryResult, Message } from 'typegram'
import { errors } from "@/utils/telegram/errors";

const tlg = async (req: NextApiRequest, res: NextApiResponse) => {
  // const description = `🤖 Your personal AI assistant in Telegram! Get instant help with anything you need, 24/7. Let's chat! 💬`
  // await fetch(`https://api.telegram.org/bot6229726777:AAHeThWTuqQc-58Wx5nH5Unn_7FP7omF6yQ/setMyShortDescription?short_description=${description}`)
  // return res.status(200).json('ok')
  if (hostURL === null) setURL(`https://${req.headers.host}`)

  let isReplyQuery = req.body.callback_query ? true : false
  let message: Message.TextMessage = isReplyQuery ? req.body.callback_query.message : req.body.message
  let chatId = message.chat.id

  if (isReplyQuery) {
    message.text = req.body.callback_query.data
  }

  let userAction = getUserMessageData(chatId)

  if (!userAction) {
    userAction = setUserMessageData(chatId, { action: MessageAction.INITIALIZE, loading: false })
  }

  const messageId = await sendLoadingContent(chatId, "set")

  try {
    if (!message || !message.text) {
      throw errors.TELEGRAM_QUERY('It seems you are trying to send something besides text')
    }

    const { text } = message;

    switch (text) {
      case '/start':
        await startMessage(message)
        break;
      case '/help':
        await helpMessage(chatId, message.from?.username)
        break;
      case '/apikey':
        await setApikey(chatId)
        break;
      case '/new':
        await startNewBotChat(chatId)
        break;
      default:
        await defaultMessage(message)
        break;
    }

    // if somehow User wasn't initialized call startMessage again
    if (userAction.action === MessageAction.INITIALIZE && getUserMessageData(chatId).action === MessageAction.INITIALIZE) {
      await startMessage(message)
    }
  }
  catch (error) {
    console.log('error in tlg')
    const typedError = error as CatchErrorProps

    if ('error' in typedError) {
      await telegramSendMessage(chatId, typedError.data)
    } else {
      const errorMessage = `Oops..Something went wrong.%0ATry again later%0AThe cause: ${typedError}`
      await telegramSendMessage(chatId, errorMessage)
    }
    setUserMessageData(chatId, { action: MessageAction.BOT_PROMPT })
  }
  finally {
    await sendLoadingContent(chatId, "remove", messageId)
    res.status(200).json('ok')
  }
}

export default tlg