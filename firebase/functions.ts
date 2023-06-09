import { CollectionTypes, QueryData } from "@/types/tlg";
import { errors } from "@/utils/telegram/errors";
import { setUserMessageData } from "@/utils/telegram/functions";
import { DocumentData, DocumentSnapshot, Firestore, QueryDocumentSnapshot, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { ChatCompletionRequestMessage } from "openai";

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
    throw errors.FIREBASE_QUERY("Couldn't get document data")
  }
}

/**
 * 
 * @param db 
 * @param path 
 */
const getDocuments = async (db: Firestore, path: string): Promise<QueryDocumentSnapshot<DocumentData>[]> => {
  try {
    const queryRef = query(collection(db, path), where("name", "!=", "default"))
    const querySnapshot = await getDocs(queryRef)
    return querySnapshot.docs
  } catch (error) {
    throw errors.FIREBASE_QUERY("Couldn't get collection data")
  }
}

/**
 * 
 * @param db 
 * @param chatId 
 * @returns 
 */
export const getModesCollection = async (db: Firestore, chatId: number): Promise<QueryData.ModesQuery> => {
  const path = `${CollectionTypes.USERS}/${chatId}/${CollectionTypes.MODES}`
  const modesSnapshotData = await getDocuments(db, path)

  return modesSnapshotData.map(el => el.data()) as QueryData.ModesQuery
}

/**
 * 
 * @param db 
 * @param chatId 
 * @returns 
 */
export const getUserData = async (db: Firestore, chatId: number): Promise<QueryData.UserDataQuery> => {
  const userDataQuery = await getDocumentData(db, `${CollectionTypes.USERS}/${chatId}`)

  if (!userDataQuery.exists()) {
    throw errors.FIREBASE_QUERY('User is not found')
  }

  const userData = userDataQuery.data() as QueryData.UserDataQuery

  const { apiKey, isTrial } = userData

  if (!isTrial && apiKey === null) throw errors.INVALID_APIKEY()

  return userData
}

// ADD DATA

/**
 * 
 * @param db 
 * @param path 
 * @param data 
 * @param isDocNew 
 */
export const updateDocumentData = async (db: Firestore, path: string, data: Partial<Exclude<QueryData.Data, QueryData.ErrorUnion | QueryData.ModesQuery | QueryData.MessagesQuery>>, isDocNew?: boolean) => {
  try {
    const queryRef = doc(db, path)

    if (isDocNew) {
      await setDoc(queryRef, data)
    } else {
      await updateDoc(queryRef, data)
    }
  } catch (error) {
    throw errors.FIREBASE_QUERY("Couldn't update document data")
  }
}

export const updateUserData = async (db: Firestore, chatId: number, data: Partial<QueryData.UserDataQuery>) => {
  const path = `${CollectionTypes.USERS}/${chatId}`
  await updateDocumentData(db, path, data)
}

/**
 * 
 * @param db Input your database reference
 * @param chatId Input your telegram chat id
 * @param messages Input array of messages
 */
export const updateMessages = async (db: Firestore, chatId: number, messages: QueryData.MessagesQuery): Promise<void> => {
  const path = `${CollectionTypes.USERS}/${chatId}`
  const userDataQuery = await getUserData(db, chatId)

  const { mode, isTrial, trialUses } = userDataQuery
  const isTrialLeft = isTrial ? trialUses > 0 : false

  if (mode !== 'default' && messages.length === 0) {
    const modeDataQuery = await getDocumentData(db, `${path}/modes/${mode}`)

    const modeData = modeDataQuery.data() as QueryData.ModeQuery
    const newMessages: ChatCompletionRequestMessage[] = [{ role: 'user', content: modeData.description }]

    if (isTrialLeft) {
      await updateDocumentData(db, path, { messages: newMessages, trialUses: trialUses - 1 })
    } else {
      await updateDocumentData(db, path, { messages: newMessages })
    }
  } else {
    if (isTrialLeft) {
      await updateDocumentData(db, path, { messages, trialUses: trialUses - 1 })
    } else {
      await updateDocumentData(db, path, { messages })
    }

    if (messages.length === 0) setUserMessageData(chatId, { last_bot_prompt: '' })
  }
}

/**
 * 
 * @param db 
 * @param chatId 
 * @param modeData 
 */
export const addNewMode = async (db: Firestore, chatId: number, modeData: QueryData.ModeQuery): Promise<void> => {
  await updateDocumentData(db, `${CollectionTypes.USERS}/${chatId}/modes/${modeData.name}`, modeData, true)
}


// DELETE DATA

const deleteDocument = async (db: Firestore, path: string) => {
  try {
    const queryRef = doc(db, path)
    await deleteDoc(queryRef)
  } catch (error) {
    throw errors.FIREBASE_QUERY(`The document doesn't exist or can't be deleted at the moment.`)
  }
}

export const deleteModeDocument = async (db: Firestore, chatId: number, modeId: string) => {
  const path = `${CollectionTypes.USERS}/${chatId}/${CollectionTypes.MODES}/${modeId}`
  await deleteDocument(db, path)
  const mode = (await getUserData(db, chatId)).mode
  if (mode === modeId) await updateUserData(db, chatId, { mode: 'default' })
}

// INITIALIZE USER
export const initializeUserDoc = async (db: Firestore, chatId: number): Promise<void> => {
  const path = `${CollectionTypes.USERS}/${chatId}`
  const userData = await getDocumentData(db, path)

  if (!userData.exists()) {
    await setDoc(userData.ref, {
      apiKey: null,
      mode: 'default',
      isTrial: true,
      trialUses: 10,
      messages: [],
    })

    await setDoc(doc(db, `${path}/modes/default`), {
      name: 'default',
      description: ''
    })
  }
}