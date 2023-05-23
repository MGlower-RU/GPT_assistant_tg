Hook setup: https://api.telegram.org/bot<YOUR_CHAT_TOKEN>/setWebhook?url=<YOUR_HTTPS_URL>/api/tlg

- setCommands (check if they will be available to all users or should i initialize them on /start command)
- the same goes for buttons
- menu button
- newChat button
- add roles button to choose role AND newRole button to set new role
- more generic functions and typo
- change greeting screen, when bot is not initialized
- bring error messages into another file

## Today

- Bring out command function into another file
- Adapt get function for statuses -- maybe set status locally
- set messages locally and chat history in Firestore
- keep apikey locally and update on its change (/apikey command)
