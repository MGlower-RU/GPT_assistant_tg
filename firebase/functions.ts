import { CollectionTypes, QueryData } from "@/types/tlg";
import { DocumentData, Firestore, collection, doc, getDoc, setDoc } from "firebase/firestore";
import { ChatCompletionRequestMessage } from "openai";

// RETRIEVE DATA

export const getDocumentData = async (db: Firestore, path: string) => {
  // const collectionType = path.split('/')[0]
  try {
    const queryRef = doc(db, path)
    const query = await getDoc(queryRef);

    if (query.exists()) {
      return dataType(query.data())
    } else {
      return null
    }
  } catch (error) {
    return null
  }
}

const dataType = (data: DocumentData) => {
  // if messages exceed items length limit => delete all or shift from array! dunno
  if (data.messages) {
    return data.messages as QueryData.messagesQuery
  }
  if (data.apikey) {
    return data.apikey as QueryData.apiKeyQuery
  }
  return null
}

// CREATE DATA

/**
 * 
 * @param db Input your database reference
 * @param path Input path to the document as 'collectionName/docId' (e.g. 'messages/23' will create document with id 23 in messages collection)
 */
export const createDoc = async (db: Firestore, path: string) => {
  await setDoc(doc(db, path), {
    messages: []
  })
}