import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Config } from "../util/config.js";
import {ImageType, IQuizImageStorage} from "../util/IQuestionStorage.interfaces.js";
import {
  isErrorResponse, isValidationSuccess, validateAuth,
  validateAuthAndGuildOwnership,
} from "../util/authHelper.js";
import { APIGuild, Routes } from "discord-api-types/v10";
import { Question } from "../question.interfaces.js";
import { REST } from "@discordjs/rest";

interface QuestionRequestBody extends Question {
  imageUrl?: string;
  explanationImageUrl?: string;
}

interface UpsertResult {
  questionId: string;
  success: boolean;
  errorMessage?: string;
}

async function processQuestion(requestBody: QuestionRequestBody, guildId: string, imageStorage: IQuizImageStorage): Promise<UpsertResult> {
  if (!requestBody.bankName) {
    return {
      questionId: requestBody.questionId,
      success: false,
      errorMessage: "Required fields: bankName",
    };
  }

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
          guildId,
          requestBody.imageUrl,
          requestBody.bankName,
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
          guildId,
          requestBody.explanationImageUrl,
          requestBody.bankName,
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
  questionId: string;
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
  const questionId = req.query.get("questionId");

  if (!bankName || !questionId) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Required fields: bankName, questionId"),
    };
  }

  return { guildId, bankName, questionId };
}

export async function deleteQuestionHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {

  await Config.initialize();
  const questionStorage = Config.questionStorage;

  const validationResult = await validate(req, context);
  if (isErrorValidationResult(validationResult)) return validationResult;

  try {
    await questionStorage.deleteQuestion(validationResult.guildId, validationResult.bankName, validationResult.questionId);

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

export async function getQuestionHandler(
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
    const question = await questionStorage.getQuestion(
      guildId,
      bankName,
      questionId,
    );

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

export async function updateQuestionHandler(
    req: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;
  const { guildId } = authResult;

  try {
    await Config.initialize();
    const questionStorage = Config.questionStorage;
    const imageStorage = Config.imageStorage;
    let requestBody: QuestionRequestBody;

    try {
      requestBody = JSON.parse(await req.text()) as QuestionRequestBody;
    } catch {
      return {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Invalid JSON body"),
      };
    }

    const result = await processQuestion(requestBody, guildId, imageStorage);
    if (!result.success) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      };
    }

    await questionStorage.updateQuestion(guildId, requestBody);

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

export async function upsertQuestionsHandlers(
    req: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;
  const { guildId } = authResult;

  try {
    await Config.initialize();
    const questionStorage = Config.questionStorage;
    const imageStorage = Config.imageStorage;
    let requestBody: QuestionRequestBody[];

    try {
      requestBody = JSON.parse(await req.text()) as QuestionRequestBody[];
    } catch {
      return {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Invalid JSON body"),
      };
    }

    const results: UpsertResult[] = await Promise.all(
        requestBody.map(async x => await processQuestion(x, guildId, imageStorage))
    );

    const successfulQuestions = requestBody.filter((_, index) => results[index]?.success);

    if (successfulQuestions.length > 0) {
      await questionStorage.upsertQuestions(guildId, successfulQuestions);
    }

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(results),
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

export async function getQuestionsHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;
  const { guildId } = authResult;

  await Config.initialize();
  const questionStorage = Config.questionStorage;
  const bankName = req.query.get("bankname");

  if (!bankName) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Required field: bankname"),
    };
  }

  try {
    const questions = await questionStorage.getQuestions(guildId, bankName);

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(questions),
    };
  } catch (error) {
    context.error(`Could not retrieve questions: ${error}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Error retrieving questions"),
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
    context: InvocationContext,
): Promise<HttpResponseInit> {
  await Config.initialize(); // Ensure configuration is loaded

  const botRest = Config.rest;

  const authResult = await validateAuth(req, context);
  if (!isValidationSuccess(authResult)) return authResult;

  const token = authResult.token;

  const userRest = new REST().setToken(token);

  try {
    const userGuilds = await userRest.get(Routes.userGuilds()) as APIGuild[];

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
    context.error(`Could not retrieve guilds: ${error}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Error retrieving guilds"),
    };
  }
}

app.http("getQuestionBankNames", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getQuestionBankNamesHandler,
});

app.http("getGuilds", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getGuildsHandler,
});

app.http("upsertQuestions", {
  methods: ["PUT"],
  authLevel: "anonymous",
  handler: upsertQuestionsHandlers,
});


app.http("getQuestions", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getQuestionsHandler,
});

app.http("updateQuestion", {
  methods: ["PUT"],
  authLevel: "anonymous",
  handler: updateQuestionHandler,
});

app.http("getQuestion", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getQuestionHandler,
});

app.http("deleteQuestion", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: deleteQuestionHandler,
});
