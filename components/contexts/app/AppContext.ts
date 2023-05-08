import { createContext } from "react";
import { AppIface } from "./AppIface";

const AppContext = createContext<AppIface>({ messages: [], openaiApikey: '', chatId: '', socket: null })

export default AppContext