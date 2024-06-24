[![codecov](https://codecov.io/gh/glennawatson/socal.quiz/graph/badge.svg?token=A97VS6OVIP)](https://codecov.io/gh/glennawatson/socal.quiz)
[![Deploy Discord Quiz Bot](https://github.com/glennawatson/socal.quiz/actions/workflows/deploy.yml/badge.svg)](https://github.com/glennawatson/socal.quiz/actions/workflows/deploy.yml)

# SoCal Quiz Bot

## Overview

This project is a Discord bot designed to host and manage quizzes within Discord servers. The bot is built using TypeScript and Azure services, including Azure Functions and Azure Storage.

## Features

* Interaction Handling: Processes interactions from Discord using discord-verify and discord-api-types/v10.
* Command Management: Supports multiple commands for managing quizzes, including starting, stopping, adding questions, and more.
* Question Management: Utilizes Azure Storage to persist quiz questions and maintain quiz states.
* Quiz Management: Manages the state of ongoing quizzes, handles user responses, and provides summaries.

## Setup Guide
### Prerequisites
* Node.js v20 or above
* Azure account (for Azure Functions and Azure Storage)
* Discord account (for creating a Discord bot)

### Step-by-Step Setup

#### Install Dependencies

```bash
npm install
```

#### Set Up Environment Variables

Create a .env file in the root directory with the following content:

```plaintext
DISCORD_BOT_TOKEN=<your_discord_bot_token>
DISCORD_CLIENT_ID=<your_discord_client_id>
DISCORD_PUBLIC_KEY=<your_discord_public_key>
AZURE_STORAGE_CONNECTION_STRING=<your_azure_storage_connection_string>
```

#### Deploy Azure Functions
* Follow the Azure Functions documentation to deploy the function. Ensure the function app is set to use Node.js.
* Set the environment variables in the Azure Functions configuration.

## How It Works
### Interaction Handling

The main entry point for handling interactions is interactions in index.ts. This function verifies the request, parses the interaction, and delegates it to the DiscordBotService.

#### DiscordBotService

DiscordBotService is responsible for managing the bot's interactions and quiz operations. It initializes the necessary components and handles interaction requests.

#### CommandManager

CommandManager registers and executes commands. Each command is defined in the actions directory and implements the IDiscordCommand interface.

#### Question and Guild Storage

QuestionStorage and GuildStorage handle storing and retrieving data from Azure Table Storage. QuestionStorage manages quiz questions, while GuildStorage handles guild registrations.

#### Quiz Management

QuizManager manages the state and flow of quizzes. It handles starting and stopping quizzes, posting questions, and processing user responses.

## Contributing

    Fork the repository
    Create a feature branch
    Commit your changes
    Push to the branch
    Open a pull request

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contact

For any questions or issues, please open an issue on GitHub or contact the repository maintainer.# socal.quiz
