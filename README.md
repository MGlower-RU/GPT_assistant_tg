Hook setup: https://api.telegram.org/bot<YOUR_CHAT_TOKEN>/setWebhook?url=<YOUR_HTTPS_URL>/api/tlg

- setCommands (check if they will be available to all users or should i initialize them on /start command)
- the same goes for buttons
- menu button
- newChat button
- add roles button to choose role AND newRole button to set new role
- more generic functions and typo

### Commands

- /start
- /help
- /newChat
- /chatMode
- /setApikey

## Firestore

- change db structure:
  -- COLLECTION USERS
  --- COLLECTIONS WITH ID'S
  ---- MESSAGES
  -- COLLECTION SOMETHING ELSE

- /start should initialize user in firebase like (create new document with userId if not exists and also create complementary collection such as messages, modes and so on)

- bring error messages into another file
