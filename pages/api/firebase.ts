import { NextApiRequest, NextApiResponse } from "next"

import { initializeApp } from "firebase/app";
import { addNewMode, deleteModeDocument, getModesCollection, getUserData, initializeUserDoc, updateApiKey, updateMessages } from "@/firebase/functions";
import { getFirestore } from "firebase/firestore";

import { CatchErrorProps, MessageAction, QueryData, RequestFirebaseApiGet, RequestFirebaseApiPost } from "@/types/tlg";
import { errors } from "@/utils/telegram/errors";
import { getUserMessageData, telegramSendMessage, usersDataMessages } from "@/utils/telegram/functions";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_APIKEY,
  authDomain: process.env.FIREBASE_AUTHDOMAIN,
  projectId: process.env.FIREBASE_PROJECTID,
  storageBucket: process.env.FIREBASE_STORAGEBUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGINGSENDERID,
  appId: process.env.FIREBASE_APPID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app)

const firebase = async (req: NextApiRequest, res: NextApiResponse<QueryData.Data | string>) => {
  try {
    if (req.headers["firebase-query"] !== process.env.SAFETY_FETCH_HEADER) throw new Error("Don't pick on others, please :)")

    let responseJSON: any = null

    if (req.method === 'GET') {
      console.log('firebase GET')

      const { chatId, action } = req.query as RequestFirebaseApiGet

      if (!chatId) throw errors.OTHER("Incorrect chatId");

      if (action === MessageAction.BOT_PROMPT) {
        const userData = await getUserData(db, +chatId)
        responseJSON = userData
      } else if (action === MessageAction.MODE_ALL) {
        const modesData = await getModesCollection(db, +chatId)
        responseJSON = modesData
      } else if (action === MessageAction.CHAT_HISTORY) {
        const chatHistory = await getUserData(db, chatId)
        responseJSON = chatHistory.messages
      } else {
        throw errors.OTHER("This action type doesn't exist")
      }
    } else if (req.method === 'POST') {
      console.log('POST something')

      const data: RequestFirebaseApiPost = JSON.parse(req.body)

      const { action } = data
      const chatId = +data.chatId

      if (action === MessageAction.INITIALIZE) {
        await initializeUserDoc(db, chatId)
        responseJSON = 'User initialized'
      } else if (action === MessageAction.BOT_PROMPT) {
        await updateMessages(db, chatId, data.messages)
        responseJSON = 'Messages updated'
      } else if (action === MessageAction.NEW_BOT_CHAT) {
        await telegramSendMessage(chatId, `Fb mode: ${JSON.stringify(usersDataMessages.get(chatId))}`)

        await updateMessages(db, chatId, [])
        responseJSON = 'New chat has been started'
      } else if (action === MessageAction.APIKEY_INPUT) {
        await updateApiKey(db, chatId, data.apiKey)
        responseJSON = 'ApiKey successfully updated'
      } else if (action === MessageAction.MODE_NEW) {
        const { modeData } = data
        await addNewMode(db, chatId, modeData)
        responseJSON = `Mode [${modeData.name}] was created.`
      } else if (action === MessageAction.MODE_DELETE) {
        const { modeId } = data
        await deleteModeDocument(db, chatId, modeId)
        responseJSON = `Mode [${modeId}] was deleted.`
      } else {
        throw errors.OTHER()
      }
    } else {
      throw errors.OTHER()
    }
    return res.status(200).json(responseJSON)
  } catch (error) {
    console.log('error in Fb')
    const typedError = error as CatchErrorProps

    if ('error' in typedError) {
      res.status(400).json(typedError)
    } else {
      res.status(400).json(errors.OTHER(`Oops...Something went wrong.%0A${typedError}`))
    }
  }
}

export default firebase