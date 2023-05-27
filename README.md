Hook setup: https://api.telegram.org/bot<YOUR_CHAT_TOKEN>/setWebhook?url=<YOUR_HTTPS_URL>/api/tlg

- add modes button to choose mode AND newMode button to set new mode
- more generic functions and typo
- loading messages on every tg request (delete after request completion)
- generate avatar and description for bot with AI like (MidJourney | GPT) or any other
- hide secret header as an .env
- /balance command && payment with payment API
- Alert user when a new chat start (on message.length limit)
- /test command that will set my apiKey for user and count test uses in db (trial: true option in User data). P.S. Be sure that my key is not exposed in requests
- when loading on request set user status to Loading and prevent any attempt to send another command before last one hasn't finished (delete any incoming messages)

## Today

- sendMessage with Inline Markup option
- write comprehensive text content of the /help command (i.e. contact info, commands list, bot description)
- set userActions in functions
- optional query settings for telegramSendMessage function
