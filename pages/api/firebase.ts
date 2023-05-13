import { NextApiRequest, NextApiResponse } from "next"

import { initializeApp } from "firebase/app";
import { createMessagesDoc, getDocumentData } from "@/firebase/functions";
import { getFirestore } from "firebase/firestore";
import { CollectionTypes, QueryData } from "@/types/tlg.d";

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

const firebase = async (req: NextApiRequest, res: NextApiResponse<QueryData.Data>) => {
  // set-header and check if valid otherwise return without data
  if (req.method === 'GET') {
    try {
      console.log('firebase GET')
      const chatId = req.query['chatId'] as string
      const apiKey = await getDocumentData<CollectionTypes.OPENAI_API_KEY>(db, `${CollectionTypes.OPENAI_API_KEY}/${chatId}`)

      if (apiKey === null) return res.status(400).json({ error: QueryData.ErrorType.APIKEY, data: 'Please enter OpenAI apiKey with command /apikey "your apikey"' })

      const messages = await getDocumentData<CollectionTypes.MESSAGES>(db, `${CollectionTypes.MESSAGES}/${chatId}`)

      if (messages === null) {
        console.log(await createMessagesDoc(db, chatId))
        return res.status(200).json({ data: { messages: [], apiKey } })
      }

      console.log('apiKey: ', apiKey)
      return res.status(200).json({ data: { messages, apiKey } })

    } catch (error) {
      res.status(400).json({ error: QueryData.ErrorType.QUERY, data: `Oops...Something went wrong. Reason: /r/n ${error}` })
    }
  } else if (req.method === 'POST') {
    // insert apikey into firestore
  } else {
    res.status(400).json({ error: QueryData.ErrorType.OTHER, data: 'Your request is not valid' })
  }
}

export default firebase