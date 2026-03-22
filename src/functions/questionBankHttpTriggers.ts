import {
  app,
  HttpRequest,
  type HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Config } from "../util/config.js";
import {ImageType} from "../util/IQuestionStorage.interfaces.js";
import {
  isErrorResponse, isValidationSuccess, validateAuth,
  validateAuthAndGuildOwnership,
} from "../util/authHelper.js";
import { type APIGuild, Routes } from "discord-api-types/v10";
import type { Question } from "../question.interfaces.js";
import type { IQuizImageStorage } from "../util/IQuizImageStorage.interfaces.js";
import type { QuestionBank } from "../questionBank.interfaces.js";

import type { AnswerRequestBody } from "../../shared/api.interfaces.js";

/** Extends Question with optional image URLs and answer bodies for the HTTP request payload. */
interface QuestionRequestBody extends Question {
  imageUrl?: string;
  explanationImageUrl?: string;
  answers: AnswerRequestBody[];
}

/** Request body for upserting a question bank, including all its questions. */
interface QuestionBankRequestBody extends QuestionBank {
  questions: QuestionRequestBody[];
}

/** Result of processing a single question during upsert — tracks success or failure per question. */
interface UpsertResult {
  questionId: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Processes a single question's images (question image, explanation image, and answer images)
 * by downloading and validating them for Discord embedding.
 * Returns a result indicating success or the first image processing failure encountered.
 *
 * @param requestBody - The question request body containing image URLs to process.
 * @param imageStorage - The image storage service for downloading and validating images.
 * @returns A promise that resolves to the upsert result indicating success or failure.
 */
async function processQuestion(requestBody: QuestionRequestBody, imageStorage: IQuizImageStorage): Promise<UpsertResult> {
  if (!requestBody.questionId) {
    return {
      questionId: requestBody.questionId,
      success: false,
      errorMessage: "Required fields: questionId",
    };
  }

  if (requestBody.answers.length > 0 && !requestBody.correctAnswerId) {
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
  } catch {
    /* v8 ignore next -- imageUrl is always truthy inside the if-guard so ?? fallback is unreachable */
    return { questionId: requestBody.questionId, success: false, errorMessage: `failed to download question image ${requestBody.imageUrl ?? ''}` };
  }

  try {
    if (requestBody.explanationImageUrl) {
      requestBody.explanationImagePartitionKey = await imageStorage.downloadAndValidateImageForDiscord(
          requestBody.explanationImageUrl,
          requestBody.questionId,
          ImageType.Explanation,
      );
    }

  } catch {
    /* v8 ignore next -- explanationImageUrl is always truthy inside the if-guard so ?? fallback is unreachable */
    return { questionId: requestBody.questionId, success: false, errorMessage: `failed to download explanation image ${requestBody.explanationImageUrl ?? ''}` };
  }

  // Process answer images
  for (const answer of requestBody.answers) {
    if (answer.imageUrl) {
      try {
        answer.imagePartitionKey = await imageStorage.downloadAndValidateAnswerImage(
          answer.imageUrl,
          requestBody.questionId,
          answer.answerId,
        );
      } catch {
        return { questionId: requestBody.questionId, success: false, errorMessage: `failed to download answer image for answer ${answer.answerId}: ${answer.imageUrl}` };
      }
    }
  }

  return { questionId: requestBody.questionId, success: true };
}

/** Result of validating the request's auth and required query parameters. */
interface ValidationResult {
  guildId: string;
  bankName: string;
}

/**
 * Type guard that determines whether a validation result is an HTTP error response
 * rather than a successful ValidationResult.
 *
 * @param validationResult - The result to check.
 * @returns True if the result is an HTTP error response.
 */
function isErrorValidationResult(validationResult: ValidationResult | HttpResponseInit): validationResult is HttpResponseInit {
  return "status" in validationResult;
}

/**
 * Validates the request by checking guild ownership auth and extracting the
 * required "bankname" query parameter. Returns either a ValidationResult on
 * success or an HttpResponseInit error response.
 *
 * @param req - The incoming HTTP request.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to either a ValidationResult or an HTTP error response.
 */
async function validate(req: HttpRequest,
                  context: InvocationContext) : Promise<ValidationResult | HttpResponseInit>
{
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;
  const { guildId } = authResult;

  const bankName: string | null = req.query.get("bankname");

  if (!bankName) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Required fields: bankName, questionId"),
    };
  }

  return { guildId, bankName };
}

/**
 * Deletes an entire question bank for the authenticated guild by bank name.
 *
 * @param req - The incoming HTTP request.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response indicating success or failure.
 */
export async function deleteQuestionBankHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {

  await Config.initialize();
  const questionStorage = Config.questionStorage;

  const validationResult: ValidationResult | HttpResponseInit = await validate(req, context);
  if (isErrorValidationResult(validationResult)) return validationResult;

  try {
    await questionStorage.deleteQuestionBank(validationResult.guildId, validationResult.bankName);

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Question deleted successfully"),
    };
  } catch (error) {
    context.error(`Could not delete the question ${String(error)}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(`Error deleting question`),
    };
  }
}

/**
 * Retrieves a question bank for the authenticated guild by bank name and question ID.
 * Requires "bankname" and "questionId" query parameters.
 *
 * @param req - The incoming HTTP request.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response containing the question bank or an error.
 */
export async function getQuestionBankHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;
  const { guildId } = authResult;

  await Config.initialize();
  const questionStorage = Config.questionStorage;

  const bankName: string | null = req.query.get("bankname");
  const questionId: string | null = req.query.get("questionId");

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
    context.error(`Could not get the question ${String(error)}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(`Error fetching question`),
    };
  }
}

/**
 * Creates or updates a question bank for the authenticated guild.
 * Parses the JSON body, validates guild ownership, processes all question and answer
 * images, and persists the question bank to storage.
 *
 * @param req - The incoming HTTP request containing the question bank JSON body.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response indicating success or failure.
 */
export async function upsertQuestionBankHandler(
    req: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
  const authResult = await validateAuthAndGuildOwnership(req, context);
  if (isErrorResponse(authResult)) return authResult;

  const guildId: string = authResult.guildId;

  try {
    await Config.initialize();
    const questionStorage = Config.questionStorage;
    const imageStorage = Config.imageStorage;
    let requestBody: QuestionBankRequestBody;

    try {
      requestBody = JSON.parse(await req.text()) as QuestionBankRequestBody;
    } catch (error) {
      context.error(`Could not upsert the question bank, since we are unable to read the request body ${String(error)}`);
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

      const processedQuestions: UpsertResult[] = await Promise.all(requestBody.questions.map(question => processQuestion(question, imageStorage)));

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
    context.error(`Could not update the question ${String(error)}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(`Error updating question`),
    };
  }
}

/**
 * Returns the list of question bank names for the authenticated guild.
 *
 * @param req - The incoming HTTP request.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response containing the bank names or an error.
 */
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
    context.error(`Could not retrieve question bank names: ${String(error)}`);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify("Error retrieving question bank names"),
    };
  }
}

/**
 * Returns the list of Discord guilds accessible to the authenticated user
 * that the bot is also a member of. Cross-references the user's guilds
 * (from Discord API) with the bot's guilds.
 *
 * @param req - The incoming HTTP request.
 * @param context - The Azure Functions invocation context.
 * @returns A promise that resolves to the HTTP response containing the accessible guilds or an error.
 */
export async function getGuildsHandler(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  await Config.initialize(); // Ensure configuration is loaded

  const botRest = Config.rest;

  const authResult = await validateAuth(req, context);
  if (!isValidationSuccess(authResult)) return authResult;

  const token: string = authResult.token;

  const userGuildsResponse: Response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
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
    const accessibleGuilds: APIGuild[] = userGuilds.filter(userGuild =>
      botGuilds.some(botGuild => botGuild.id === userGuild.id)
    );

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(accessibleGuilds),
    };
  } catch (error) {
    context.error(`Could not retrieve bot guilds: ${String(error)}`);
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
