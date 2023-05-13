import { CollectionTypes, QueryData } from "@/types/tlg";
import { DocumentData, Firestore, collection, doc, getDoc, setDoc } from "firebase/firestore";
import { ChatCompletionRequestMessage } from "openai";

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
  // if messages exceed items length limit => delete all or shift from array! dunno
  switch (type) {
    case CollectionTypes.MESSAGES:
      return data.messages
    case CollectionTypes.OPENAI_API_KEY:
      return data.apikey
    default:
      return null
  }
}

// CREATE DATA

/**
 * 
 * @param db Input your database reference
 * @param path Input path to the document as 'collectionName/docId' (e.g. 'messages/23' will create document with id 23 in messages collection)
 */
export const createMessagesDoc = async (db: Firestore, chatId: string) => {
  await setDoc(doc(db, `${CollectionTypes.MESSAGES}/${chatId}`), {
    messages: []
  })
}