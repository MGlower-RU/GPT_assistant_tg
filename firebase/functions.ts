import { CollectionTypes, QueryData } from "@/types/tlg";
import { DocumentData, Firestore, doc, getDoc, getFirestore, setDoc, updateDoc } from "firebase/firestore";

// RETRIEVE DATA

/**
 * 
 * @param db Input your database reference
 * @param path Input path to the document as 'collectionName/docId' (e.g. 'messages/23' will create document with id 23 in messages collection)
 */
export const getDocumentData = async <T extends CollectionTypes.MESSAGES | CollectionTypes.OPENAI_API_KEY>(db: Firestore, path: string): Promise<QueryData.InferQueryType<T>> => {
  try {
    const queryRef = doc(db, path)
    const query = await getDoc(queryRef);

    if (query.exists()) {
      return dataType(query.data(), path.split('/')[0])
    } else {
      return null
    }
  } catch (error) {
    return null
  }
}

const dataType = (data: DocumentData, type: string) => {
  switch (type) {
    case CollectionTypes.MESSAGES:
      return data.messages ?? null
    case CollectionTypes.OPENAI_API_KEY:
      return data.apikey ?? null
    default:
      return null
  }
}

// CREATE DATA

// I think this function is a bit excessive because when i use POST method, there is a doc creation
// /**
//  *
//  * @param db Input your database reference
//  * @param path Input path to the document as 'collectionName/docId' (e.g. 'messages/23' will create document with id 23 in messages collection)
//  */
// export const createMessagesDoc = async (db: Firestore, chatId: string) => {
//   await setDoc(doc(db, `${CollectionTypes.MESSAGES}/${chatId}`), {
//     messages: []
//   })
// }

// ADD DATA

/**
 * 
 * @param db Paste your database reference
 * @param chatId Paste your document id
 * @param messages 
 */
export const updateMessages = async (db: Firestore, chatId: string, messages: QueryData.messagesQuery): Promise<void> => {
  // make function generic so it could update apikey as well
  const updatedMessages = messages.length >= 20 ? [] : messages

  await setDoc(doc(db, `${CollectionTypes.MESSAGES}/${chatId}`), {
    messages: updatedMessages
  })
}

export const updateApikey = async (db: Firestore, chatId: string, apikey: QueryData.apiKeyQuery): Promise<void> => {
  // make function generic so it could update apikey as well

  await setDoc(doc(db, `${CollectionTypes.OPENAI_API_KEY}/${chatId}`), {
    apikey
  })
}

/**
 * 
 * @param chatId chatID can be retrieved from telegram request.
 * @param message Input your text you want to be send by bot here. Accepts HTML.
 */
export const telegramSendMessage = async (chatId: number, message: string) => {
  await fetch(
    `https://api.telegram.org/bot${process.env.NEXT_TELEGRAM_TOKEN}/sendMessage?chat_id=${chatId}&text=${message}&parse_mode=HTML`
  );
}
