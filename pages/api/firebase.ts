import { NextApiRequest, NextApiResponse } from "next"

import { initializeApp } from "firebase/app";
import { createDoc, getDocumentData } from "@/firebase/functions";
import { getFirestore } from "firebase/firestore";
import { QueryData } from "@/types/tlg.d";

// enum ErrorType {
//   APIKEY = 'apikey',
//   QUERY = 'query'
// }

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

const firebase = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      console.log('firebase GET')
      const chatId = req.query['chatId'] as string
      const apiKey = await getDocumentData(db, `openai_api_keys/${chatId}`)

      if (apiKey === null) return res.status(200).json({ error: QueryData.ErrorType.APIKEY })

      const messages = await getDocumentData(db, `messages/${chatId}5`)

      if (messages === null) {
        console.log(await createDoc(db, `messages/${chatId}5`))
        return res.status(200).json({ data: { messages: [], apiKey } })
      }

      console.log('apiKey: ', apiKey)
      return res.status(200).json({ data: { messages, apiKey } })

    } catch (error) {
      res.status(200).json({ error: QueryData.ErrorType.QUERY, data: `Oops...Something went wrong. Reason: /r/n ${error}` })
    }
  } else if (req.method === 'POST') {
    // insert apikey into firestore
  } else {
    res.status(200).json('delivered')
  }
}

export default firebase