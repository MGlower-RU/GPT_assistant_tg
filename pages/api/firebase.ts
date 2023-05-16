import { NextApiRequest, NextApiResponse } from "next"

import { initializeApp } from "firebase/app";
import { addMessageToDoc, getDocumentData } from "@/firebase/functions";
import { getFirestore } from "firebase/firestore";
import { CollectionTypes, QueryData, RequestFirebaseApi } from "@/types/tlg.d";
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

const firebase = async (req: NextApiRequest, res: NextApiResponse<QueryData.Data | string | { error: 'other', data: string }>) => {
  // set-header and check if valid otherwise return without data || hash chatId so no one could make a request with CURL
  try {
    if (req.method === 'GET') {
      console.log('firebase GET')
      const chatId = req.query['chatId'] as string
      const apiKey = await getDocumentData<CollectionTypes.OPENAI_API_KEY>(db, `${CollectionTypes.OPENAI_API_KEY}/${chatId}`)
      console.log('Is it here? ', QueryData.ErrorType.APIKEY);

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
      const { type } = data

      if (type === CollectionTypes.MESSAGES) {
        const { chatId, messages } = data
        await addMessageToDoc(db, chatId, messages)
        return res.status(200).send('Messages updated')
      } else if (type === CollectionTypes.OPENAI_API_KEY) {
        // call setApikey function here
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

    console.log('My custom error? ', errorTyped)
    if ('error' in errorTyped) {
      console.log('It should throw here');
      res.status(200).json({ error: errorTyped.error, data: errorTyped.data })
    } else {
      res.status(200).json({ error: 'other', data: `Oops...Something went wrong. Reason: /r/n ${error}` })
    }
  }
}

export default firebase