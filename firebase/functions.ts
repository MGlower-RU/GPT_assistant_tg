import { CollectionTypes, QueryData } from "@/types/tlg";
import { errors } from "@/utils/telegram/errors";
import { USER_MESSAGES_MAX_LENGTH } from "@/utils/telegram/functions";
import { DocumentData, DocumentSnapshot, Firestore, Query, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// RETRIEVE DATA

/**
 * 
 * @param db Input your database reference
 * @param path Input path to the document as 'collectionName/docId' (e.g. 'messages/23' will create document with id 23 in messages collection)
 */
export const getDocumentData = async (db: Firestore, path: string): Promise<DocumentSnapshot<DocumentData>> => {
  try {
    const queryRef = doc(db, path)
    const query = await getDoc(queryRef);

    return query
  } catch (error) {
    throw new Error("Couldn't get documentData")
  }
}

export const getUserData = async (db: Firestore, chatId: number): Promise<QueryData.UserDataQuery> => {
  const userData = await getDocumentData(db, `${CollectionTypes.USERS}/${chatId}`)

  if (!userData.exists()) {
    throw errors.FIREBASE_QUERY('User is not found')
  }

  const { apiKey, messages } = userData.data() as QueryData.UserDataQuery

  if (apiKey === null) throw errors.INVALID_APIKEY()

  return {
    apiKey, messages
  }
}

// ADD DATA

/**
 * 
 * @param db 
 * @param path 
 * @param data 
 */
export const updateDocumentData = async (db: Firestore, path: string, data: Partial<QueryData.UserDataQuery>) => {
  try {
    const queryRef = doc(db, path)
    await updateDoc(queryRef, data);
  } catch (error) {
    throw new Error("Couldn't get documentData")
  }
}

/**
 * 
 * @param db Paste your database reference
 * @param chatId Paste your document id
 * @param messages 
 */
export const updateMessages = async (db: Firestore, chatId: number, messages: QueryData.MessagesQuery): Promise<void> => {
  // send message to user so he knows about newChat
  const updatedMessages = messages.length >= USER_MESSAGES_MAX_LENGTH ? [] : messages
  await updateDocumentData(db, `${CollectionTypes.USERS}/${chatId}`, { messages: updatedMessages })
}

/**
 * 
 * @param db 
 * @param chatId 
 * @param apikey 
 */
export const updateApikey = async (db: Firestore, chatId: number, apikey: QueryData.ApikeyQuery): Promise<void> => {
  // make function generic so it could update apikey as well

  await setDoc(doc(db, `${CollectionTypes.OPENAI_API_KEY}/${chatId}`), {
    apikey
  })
}


// INITIALIZE USER

export const initializeUserDoc = async (db: Firestore, chatId: number): Promise<void> => {
  // getDocumentQuery
  const path = `${CollectionTypes.USERS}/${chatId}`
  const userData = await getDocumentData(db, path)

  if (!userData.exists()) {
    await setDoc(userData.ref, {
      apikey: null,
      messages: []
    })

    await setDoc(doc(db, `${path}/modes/default`), {
      name: 'default',
      description: ''
    })
  }
}