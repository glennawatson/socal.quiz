import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Config } from "../util/config.js";
import {ImageType} from "../util/IQuestionStorage.interfaces.js";
import {
  isErrorResponse, isValidationSuccess, validateAuth,
  validateAuthAndGuildOwnership,
} from "../util/authHelper.js";
import { APIGuild, Routes } from "discord-api-types/v10";
import { Question } from "../question.interfaces.js";
import { IQuizImageStorage } from "../util/IQuizImageStorage.interfaces.js";
import { QuestionBank } from "../questionBank.interfaces.js";

interface QuestionRequestBody extends Question {
  imageUrl?: string;
  explanationImageUrl?: string;
}

interface QuestionBankRequestBody extends QuestionBank {
  questions: QuestionRequestBody[];
}

interface UpsertResult {
  questionId: string;
  success: boolean;
  errorMessage?: string;
}

async function processQuestion(requestBody: QuestionRequestBody, imageStorage: IQuizImageStorage): Promise<UpsertResult> {
  if (!requestBody.questionId) {
    return {
      questionId: requestBody.questionId,
      success: false,
      errorMessage: "Required fields: questionId",
    };
  }

  if (requestBody.answers && requestBody.correctAnswerId === undefined) {
    return {
      questionId: requestBody.questionId,
      success: false,
      errorMessage: `Must have correct answer ID with answers for question with id ${requestBody.questionId} and question text ${requestBody.question}`,
    };
  }

  try {
    if (requestBody.imageUrl) {
      requestBody.imagePartitionKey = await imageStorage.downloadAndValidateImageForDiscord(
          requestBody.imageUrl,
          requestBody.questionId,
          ImageType.Question,
      );
    }
  } catch (error) {
    return { questionId: requestBody.questionId, success: false, errorMessage: 'failed to download question image ' + requestBody.imageUrl };
  }

  try {
    if (requestBody.explanationImageUrl) {
      requestBody.imagePartitionKey = await imageStorage.downloadAndValidateImageForDiscord(
          requestBody.explanationImageUrl,
          requestBody.questionId,
          ImageType.Explanation,
      );
    }

  } catch (error) {
    return { questionId: requestBody.questionId, success: false, errorMessage: 'failed to download explanation image ' + requestBody.explanationImageUrl };
  }

  return { questionId: requestBody.questionId, success: true };
}

interface ValidationResult {
  guildId: string;
  bankName: string;
}

function isErrorValidationResult(validationResult: ValidationResult | HttpResponseInit): validationResult is HttpResponseInit {
  return "status" in validationResult;
}

async function validate(req: HttpRequest,
                  context: InvocationContext) : Promise<ValidationResult | HttpResponseInit>
{
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;
  const { guildId } = authResult;

  const bankName = req.query.get("bankname");

  if (!bankName) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Required fields: bankName, questionId"),
    };
  }

  return { guildId, bankName };
}

export async function deleteQuestionBankHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {

  await Config.initialize();
  const questionStorage = Config.questionStorage;

  const validationResult = await validate(req, context);
  if (isErrorValidationResult(validationResult)) return validationResult;

  try {
    await questionStorage.deleteQuestionBank(validationResult.guildId, validationResult.bankName);

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Question deleted successfully"),
    };
  } catch (error) {
    context.error(`Could not delete the question ${error}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(`Error deleting question`),
    };
  }
}

export async function getQuestionBankHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;
  const { guildId } = authResult;

  await Config.initialize();
  const questionStorage = Config.questionStorage;

  const bankName = req.query.get("bankname");
  const questionId = req.query.get("questionId");

  if (!bankName || !questionId) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Required fields: bankName, questionId"),
    };
  }

  try {
    const question = await questionStorage.getQuestionBank(
      guildId,
      bankName);

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(question),
    };
  } catch (error) {
    context.error(`Could not get the question ${error}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(`Error fetching question`),
    };
  }
}

export async function upsertQuestionBankHandler(
    req: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;

  const guildId = authResult.guildId;

  try {
    await Config.initialize();
    const questionStorage = Config.questionStorage;
    const imageStorage = Config.imageStorage;
    let requestBody: QuestionBankRequestBody;

    try {
      requestBody = JSON.parse(await req.text()) as QuestionBankRequestBody;
    } catch (error) {
      context.error(`Could not upsert the question bank, since we are unable to read the request body ${error}`);
      return {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Invalid JSON body"),
      };
    }

    if (guildId !== requestBody.guildId) {
      console.error(`Guild mismatch ${guildId} ${requestBody.guildId}`);
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({error: "Guild ID's do not match with logged in guild id"}),
      };
    }

      const processedQuestions = await Promise.all(requestBody.questions.map(question => processQuestion(question, imageStorage)));

    if (processedQuestions.some(x => !x.success)) {
      console.error("Could not process the questions.");
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedQuestions),
      };
    }

    await questionStorage.upsertQuestionBank(requestBody);

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Question updated successfully"),
    };
  } catch (error) {
    context.error(`Could not update the question ${error}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(`Error updating question`),
    };
  }
}

export async function getQuestionBankNamesHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;
  const { guildId } = authResult;

  await Config.initialize();
  const questionStorage = Config.questionStorage;

  try {
    const bankNames = await questionStorage.getQuestionBankNames(guildId);

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bankNames),
    };
  } catch (error) {
    context.error(`Could not retrieve question bank names: ${error}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Error retrieving question bank names"),
    };
  }
}

export async function getGuildsHandler(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  await Config.initialize(); // Ensure configuration is loaded

  const botRest = Config.rest;

  const authResult = await validateAuth(req, context);
  if (!isValidationSuccess(authResult)) return authResult;

  const token = authResult.token;

  const userGuildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!userGuildsResponse.ok) {
    context.error(`Could not retrieve user guilds: ${userGuildsResponse.statusText}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Error retrieving user guilds"),
    };
  }

  const userGuilds = await userGuildsResponse.json() as APIGuild[];

  try {
    const botGuilds = await botRest.get(Routes.userGuilds()) as APIGuild[];

    // Filter user guilds to find where the bot is also a member
    const accessibleGuilds = userGuilds.filter(userGuild =>
      botGuilds.some(botGuild => botGuild.id === userGuild.id)
    );

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(accessibleGuilds),
    };
  } catch (error) {
    context.error(`Could not retrieve bot guilds: ${error}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Error retrieving guilds"),
    };
  }
}

app.http("getGuilds", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getGuildsHandler,
});

app.http("getQuestionBankNames", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getQuestionBankNamesHandler,
});

app.http("getQuestionBank", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getQuestionBankHandler,
});

app.http("deleteQuestionBank", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: deleteQuestionBankHandler,
});

app.http("upsertQuestionBank", {
  methods: ["PUT"],
  authLevel: "anonymous",
  handler: upsertQuestionBankHandler,
});
