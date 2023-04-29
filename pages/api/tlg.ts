import { NextApiRequest, NextApiResponse } from "next";

const tlg = async (req: NextApiRequest, res: NextApiResponse) => {
  const tgbot = process.env.NEXT_TELEGRAM_TOKEN

  if (req.body.message.text === '/start') {
    const message =
      'Welcome to <i>AI assistant bot</i> <b>' +
      req.body.message.from.first_name +
      '</b>.%0ATo get a list of commands send /help';
    const ret = await fetch(
      `https://api.telegram.org/bot${tgbot}/sendMessage?chat_id=${req.body.message.chat.id}&text=${message}&parse_mode=HTML`
    );
  }
  if (req.body.message.text === '/help') {
    const message =
      'Help for <i>AI assistant bot</i>.%0AUse /start <i>keyword</i> to get greeting message.';
    const ret = await fetch(
      `https://api.telegram.org/bot${tgbot}/sendMessage?chat_id=${req.body.message.chat.id}&text=${message}&parse_mode=HTML`
    );
  }
  res.status(200).send('OK');
}

export default tlg