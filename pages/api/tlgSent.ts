import { tgbotVar } from "@/utils/variables";
import { NextApiRequest, NextApiResponse } from "next";
import { Message } from "typegram";

const tlgSent = async (req: NextApiRequest, res: NextApiResponse) => {
  const message: Message.TextMessage = req.body.message

  try {
    await fetch(
      `https://api.telegram.org/bot${tgbotVar}/sendMessage?chat_id=${message.chat.id}&text=${message}`
    );
  } catch (error) {
    const errorMessage = `Oops..Something went wrong.%0ATry again later%0AThe cause: ${error}`
    await fetch(
      `https://api.telegram.org/bot${tgbotVar}/sendMessage?chat_id=${message.chat.id}&text=${errorMessage}`
    );
  } finally {
    res.status(200).send('ok')
  }
}

export default tlgSent