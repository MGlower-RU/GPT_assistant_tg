import { helpMessage, hostURL, defaultMessage, setApikey, setURL, startMessage, telegramSendMessage, startNewBotChat, getUserMessageData, setUserMessageData, sendLoadingContent, isDev, getModesMenu, setMode, getAllModes, addMode, deleteMode, cancelLastAction, retryBotPrompt, getChatHistory } from "@/utils/telegram/functions";
import { CatchErrorProps, MessageAction } from "@/types/tlg";
import { NextApiRequest, NextApiResponse } from "next";

import type { Message } from 'typegram'
import { errors } from "@/utils/telegram/errors";

const allowedDevIds = [754969855, 6079106109]

const tlg = async (req: NextApiRequest, res: NextApiResponse) => {
  // return res.status(200).json('ok')
  if (hostURL === null) setURL(`https://${req.headers.host}`)

  let isReplyQuery = req.body.callback_query ? true : false
  let message: Message.TextMessage = isReplyQuery ? req.body.callback_query.message : req.body.message
  let chatId = message.chat.id

  if (isDev) {
    console.log('development')
    if (!allowedDevIds.includes(chatId)) {
      telegramSendMessage(chatId, 'Sorry! My creator forbides me to talk to strangers.')
      return res.status(200).json('dev')
    }
  }

  if (isReplyQuery) {
    message.text = req.body.callback_query.data
  }

  let userAction = getUserMessageData(chatId)

  if (!userAction) {
    userAction = setUserMessageData(chatId, { action: MessageAction.INITIALIZE, loading: false })
  }

  const loadingId = await sendLoadingContent(chatId, "set")

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
      case '/mode':
        await getModesMenu(chatId)
        break;
      case '/mode_all':
        await getAllModes(chatId)
        break;
      case '/mode_add':
        await addMode(chatId)
        break;
      case '/mode_set':
        await setMode(chatId)
        break;
      case '/mode_delete':
        await deleteMode(chatId)
        break;
      case '/cancel':
        await cancelLastAction(chatId)
        break;
      case '/retry':
        await retryBotPrompt(chatId)
        break;
      case '/history':
        await getChatHistory(chatId)
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
    if (loadingId) {
      await sendLoadingContent(chatId, "remove", loadingId)
    }
    res.status(200).json('ok')
  }
}

export default tlg