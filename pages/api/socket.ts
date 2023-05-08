import { NextApiRequest, NextApiResponse } from "next"

const socket = (req: NextApiRequest, res: NextApiResponse) => {
  console.log('connected')
}

export default socket