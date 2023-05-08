import { Firestore, collection, getDocs } from "firebase/firestore";

export const getMessages = async (db: Firestore) => {
  const messages: string[] = []
  const querySnapshot = await getDocs(collection(db, "messages"));
  querySnapshot.forEach((doc) => {
    messages.push(...doc.data().messages)
  });
  return messages
}