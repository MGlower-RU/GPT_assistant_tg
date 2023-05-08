import { FC, PropsWithChildren } from "react"
import AppContext from "./AppContext"
import useAppData from "@/utils/hooks/useAppData"

const AppProvider: FC<PropsWithChildren> = ({ children }) => {
  const { appData, dispatch } = useAppData()

  return <AppContext.Provider value={appData}>{children}</AppContext.Provider>
}

export default AppProvider
