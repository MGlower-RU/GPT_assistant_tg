# AI Assistant bot

![Bot avatar](/public/avatar.jpg)

Bot link: [@MGlower_GPT_Bot](https://t.me/MGlower_GPT_Bot)

This is an AI Assistant Bot created to answer any of your questions.

To start using it input your [OpenAI apiKey](https://platform.openai.com/account/api-keys) with a command /apiKey

<!-- or use test account with a command /test. You will have 20 trial uses. -->

After that send a message to get an answer to your question.

The bot remembers the context of your dialog.  
After 20 messages from you new chat will be created and Bot context will be reset.

**Here is the list of Bot available commands:**

- 😣 _/help_ - get information of how this bot works
- 🆕 _/new_ - start new conversation with bot
- 🦖 _/mode_ - select a mode for current chat and manage modes
- 🔑 _/apikey_ - input your OpenAI apikey
- 📜 _/history_ - show previous conversation
- 📌 _/retry_ - send previous prompt again
- ✖️ _/cancel_ - cancel an active action

## FAQ

#### **What is the context?**

By default, Bot remembers the content of your last messages. It is done like that so you can ask bot to clarify previous question OR to have a continuous conversation within the topic.  
Use command /new to reset a context.

#### **Have any questions?**

Send a detailed message to account @MGlower (https://t.me/MGlower)

#### **Found a problem?**

Create an issue on GitHub [Link](https://github.com/MGlower-RU/GPT_assistant_tg/issues)

## Setup your own bot locally

1.  Clone this repository:

        git clone -b main git@github.com:MGlower-RU/GPT_assistant_tg.git

2.  Initialize a package.json file:

        npm install

3.  Setup your local server:

        ngrok http 3000

4.  Create telegram bot with [@BotFather](https://t.me/BotFather) and copy your bot token.

5.  Connect your bot with a local server:

        https://api.telegram.org/bot[BOT_TOKEN]/setWebhook?url=[ngrok https url]

6.  Initialize your Firebase project with Firestore and paste your credentials to .env file.

7.  Create collection USERS in Firestore.

8.  All is done! Your bot is ready for questions.
