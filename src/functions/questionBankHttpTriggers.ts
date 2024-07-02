import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import * as df from "durable-functions";
import { Config } from "../util/config.js";
import { ImageType } from "../util/IQuestionStorage.interfaces.js";
import {
  isErrorResponse,
  validateAuthAndGuildOwnership,
} from "../util/authHelper.js";

interface QuestionRequestBody {
  bankName: string;
  questionId: string;
  questionText?: string;
  answers?: string[];
  correctAnswerIndex?: number;
  imageUrl?: string;
  explanation?: string;
  explanationImageUrl?: string;
  showTimeMs?: number;
}

export async function deleteQuestionHandler(
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
    await questionStorage.deleteQuestion(guildId, bankName, questionId);

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

    if (!requestBody.bankName || !requestBody.questionId) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Required fields: bankName, questionId"),
      };
    }

    if (requestBody.answers && requestBody.correctAnswerIndex === undefined) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("Must have correct answer ID with answers"),
      };
    }

    if (
      requestBody.answers &&
      requestBody.correctAnswerIndex !== undefined &&
      requestBody.correctAnswerIndex >= requestBody.answers.length
    ) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          `Correct answer index must be between 0 and ${requestBody.answers.length - 1}`,
        ),
      };
    }

    const currentQuestion = await questionStorage.getQuestion(
      guildId,
      requestBody.bankName,
      requestBody.questionId,
    );

    if (requestBody.questionText) {
      currentQuestion.question = requestBody.questionText;
    }

    if (requestBody.explanation) {
      currentQuestion.explanation = requestBody.explanation;
    }

    if (requestBody.showTimeMs) {
      currentQuestion.questionShowTimeMs = requestBody.showTimeMs;
    }

    if (requestBody.answers && requestBody.correctAnswerIndex !== undefined) {
      const answers = await Promise.all(
        requestBody.answers.map(
          async (x) => await questionStorage.generateAnswer(x),
        ),
      );
      const correctAnswer = answers[requestBody.correctAnswerIndex];

      currentQuestion.answers = answers;

      if (correctAnswer) {
        currentQuestion.correctAnswerId = correctAnswer.answerId;
      }
    }

    if (requestBody.imageUrl) {
      currentQuestion.imagePartitionKey =
        await imageStorage.downloadAndValidateImageForDiscord(
          guildId,
          requestBody.imageUrl,
          requestBody.bankName,
          requestBody.questionId,
          ImageType.Question,
        );
    }

    if (requestBody.explanationImageUrl) {
      currentQuestion.imagePartitionKey =
        await imageStorage.downloadAndValidateImageForDiscord(
          guildId,
          requestBody.explanationImageUrl,
          requestBody.bankName,
          requestBody.questionId,
          ImageType.Explanation,
        );
    }

    await questionStorage.updateQuestion(guildId, currentQuestion);

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

app.http("getQuestionBankNames", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getQuestionBankNamesHandler,
});

app.http("getQuestions", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: getQuestionsHandler,
});

app.http("updateQuestion", {
  methods: ["PUT"],
  extraInputs: [df.input.durableClient()],
  authLevel: "anonymous",
  handler: updateQuestionHandler,
});

app.http("getQuestion", {
  methods: ["GET"],
  extraInputs: [df.input.durableClient()],
  authLevel: "anonymous",
  handler: getQuestionHandler,
});

app.http("deleteQuestion", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: deleteQuestionHandler,
});
