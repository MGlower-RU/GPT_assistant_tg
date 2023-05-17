import { NextApiRequest, NextApiResponse } from "next"

import { initializeApp } from "firebase/app";
import { updateMessages, getDocumentData, updateApikey } from "@/firebase/functions";
import { getFirestore } from "firebase/firestore";
import { CollectionTypes, QueryData, RequestFirebaseApi } from "@/types/tlg";
import { ErrorProps } from "next/error";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_APIKEY,
  authDomain: process.env.FIREBASE_AUTHDOMAIN,
  databaseURL: process.env.FIREBASE_DATABASEURL,
  projectId: process.env.FIREBASE_PROJECTID,
  storageBucket: process.env.FIREBASE_STORAGEBUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGINGSENDERID,
  appId: process.env.FIREBASE_APPID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app)

const firebase = async (req: NextApiRequest, res: NextApiResponse<QueryData.Data | string>) => {
  // set-header and check if valid otherwise return without data || hash chatId so no one could make a request with CURL
  try {
    if (req.method === 'GET') {
      console.log('firebase GET')
      const chatId = req.query['chatId'] as string
      const apiKey = await getDocumentData<CollectionTypes.OPENAI_API_KEY>(db, `${CollectionTypes.OPENAI_API_KEY}/${chatId}`)

      if (apiKey === null) throw { error: QueryData.ErrorType.APIKEY, data: 'Please enter OpenAI apiKey with command /apikey "your apikey"' }

      const messages = await getDocumentData<CollectionTypes.MESSAGES>(db, `${CollectionTypes.MESSAGES}/${chatId}`)

      if (messages === null) {
        return res.status(200).json({ data: { messages: [], apiKey } })
      }

      return res.status(200).json({ data: { messages, apiKey } })
    } else if (req.method === 'POST') {
      // insert apikey into firestore
      console.log('POST something')
      const data: RequestFirebaseApi = JSON.parse(req.body)
      const { type, chatId } = data

      if (type === CollectionTypes.MESSAGES) {
        const { messages } = data
        await updateMessages(db, chatId, messages)
        return res.status(200).send('Messages updated')
      } else if (type === CollectionTypes.OPENAI_API_KEY) {
        const { apikey } = data
        if (apikey.trim().length > 16) {
          updateApikey(db, chatId, apikey)
        } else {
          throw { error: QueryData.ErrorType.APIKEY, data: 'Enter an actual ApiKey given by OpenAI. /r/n Visit official OpenAI page to see your ApiKey: https://platform.openai.com/account/api-keys' }
        }
        return res.status(200).send('Apikey has been set')
      } else {
        throw { error: QueryData.ErrorType.OTHER, data: 'Your request is not valid' }
      }
    } else {
      throw { error: QueryData.ErrorType.OTHER, data: 'Your request is not valid' }
    }
    return res.status(200).json('ok')
  } catch (error) {
    console.log('error in Fb')
    const errorTyped = error as QueryData.Data | ErrorProps

    // Use this as a typeGuard
    // function isCustomError(error): error is ErrorUnion {
    //   return 'error' in error
    // }

    if ('error' in errorTyped) {
      res.status(400).json({ error: errorTyped.error, data: errorTyped.data })
    } else {
      res.status(400).json({ error: QueryData.ErrorType.OTHER, data: `Oops...Something went wrong. Reason: /r/n ${error}` })
    }
  }
}

export default firebase