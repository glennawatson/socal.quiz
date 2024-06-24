import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  APIChatInputApplicationCommandInteraction,
  APIInteractionResponseChannelMessageWithSource,
  APIModalInteractionResponse,
  APIModalSubmitInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  ComponentType,
  GuildMemberFlags,
  InteractionResponseType,
  MessageFlags,
  ModalSubmitActionRowComponent,
} from "discord-api-types/v10";
import { Question } from "../../src/question.interfaces";
import { EditQuestionCommand } from "../../src/handlers/actions/editQuestionCommand";
import { IQuestionStorage } from "../../src/util/IQuestionStorage.interfaces";

function createComponents(
  fields: { custom_id: string; value: string }[],
): ModalSubmitActionRowComponent[] {
  return fields.map((field) => ({
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.TextInput,
        custom_id: field.custom_id,
        value: field.value,
      },
    ],
  })) as ModalSubmitActionRowComponent[];
}

function createInteraction(options: {
  bankname: string;
  questionid: string;
}): APIChatInputApplicationCommandInteraction {
  return {
    app_permissions: "",
    authorizing_integration_owners: {},
    channel: { id: "channel-id", type: ChannelType.GuildVoice },
    entitlements: [],
    locale: "en-US",
    version: 1,
    type: 2,
    data: {
      id: "command-id",
      name: "edit_question",
      options: [
        {
          name: "bankname",
          type: ApplicationCommandOptionType.String,
          value: options.bankname,
        },
        {
          name: "questionid",
          type: ApplicationCommandOptionType.String,
          value: options.questionid,
        },
      ],
      resolved: {},
      type: ApplicationCommandType.ChatInput,
    },
    guild_id: "guild-id",
    channel_id: "channel-id",
    member: {
      user: {
        id: "user-id",
        username: "username",
        discriminator: "0001",
        avatar: "avatar-hash",
        global_name: "user-id",
      },
      roles: [],
      premium_since: null,
      permissions: "0",
      pending: false,
      mute: false,
      deaf: false,
      joined_at: "",
      flags: GuildMemberFlags.CompletedOnboarding,
    },
    token: "interaction-token",
    id: "interaction-id",
    application_id: "application-id",
  };
}

function checkModalContainsExpectedValues(
  modal: APIModalInteractionResponse["data"],
  question: Question,
) {
  const componentValues = modal.components.flatMap((row) => row.components);

  // Helper function to find a component by its custom_id
  const findComponent = (customId: string) =>
    componentValues.find((c) => c.custom_id === customId);

  // Check bank name input
  const bankNameInput = findComponent(
    EditQuestionCommand.componentIds.bankName,
  );
  expect(bankNameInput).toBeDefined();

  if (!bankNameInput) throw Error("need to have a valid bank name");
  expect(bankNameInput.value).toBe(question.bankName);

  // Check question text input
  const questionTextInput = findComponent(
    EditQuestionCommand.componentIds.questionText,
  );
  expect(questionTextInput).toBeDefined();
  expect(questionTextInput!.value).toBe(question.question);

  // Check timeout time input
  const timeoutTimeInput = findComponent(
    EditQuestionCommand.componentIds.timeoutTimeSeconds,
  );
  expect(timeoutTimeInput).toBeDefined();
  expect(timeoutTimeInput!.value).toBe(question.questionShowTimeMs.toString());

  // Check image URL input
  const imageUrlInput = findComponent(
    EditQuestionCommand.componentIds.imageUrl,
  );
  expect(imageUrlInput).toBeDefined();
  expect(imageUrlInput!.value).toBe(undefined);

  // Check explanation input
  const explanationInput = findComponent(
    EditQuestionCommand.componentIds.explanation,
  );
  expect(explanationInput).toBeDefined();
  expect(explanationInput!.value).toBe(question.explanation ?? undefined);

  // Check explanation image URL input
  const explanationImageUrlInput = findComponent(
    EditQuestionCommand.componentIds.explanationImageUrl,
  );
  expect(explanationImageUrlInput).toBeDefined();
  expect(explanationImageUrlInput!.value).toBe(undefined);

  // Check each answer input
  question.answers.forEach((answer) => {
    const answerInput = findComponent(`answer_${answer.answerId}`);
    expect(answerInput).toBeDefined();
    expect(answerInput!.value).toBe(answer.answer);
  });

  // Check correct answer index input
  const correctAnswerIndexInput = findComponent(
    EditQuestionCommand.componentIds.correctAnswerIndex,
  );
  expect(correctAnswerIndexInput).toBeDefined();
  expect(correctAnswerIndexInput!.value).toBe(
    question.correctAnswerIndex.toString(),
  );
}

describe("EditQuestionCommand", () => {
  let mockQuestionStorage: IQuestionStorage;
  let command: EditQuestionCommand;
  let question: Question;

  let interactionData: APIModalSubmitInteraction;

  beforeEach(() => {
    question = {
      bankName: "test-bank",
      questionId: "test-question-id",
      question: "What is 2 + 2?",
      answers: [
        { answerId: "answer1", answer: "3" },
        { answerId: "answer2", answer: "4" },
        { answerId: "answer3", answer: "5" },
      ],
      correctAnswerIndex: 1,
      questionShowTimeMs: 20000,
    };

    interactionData = {
      app_permissions: "",
      authorizing_integration_owners: {},
      entitlements: [],
      locale: "en-US",
      version: 1,
      type: 5,
      data: {
        custom_id: "edit_question_test-question-id",
        components: createComponents([
          { custom_id: "bankname", value: "test-bank" },
          { custom_id: "questionText", value: "What is 3 + 3?" },
          { custom_id: "timeoutTimeSeconds", value: "30" },
          { custom_id: "answer_answer1", value: "5" },
          { custom_id: "answer_answer2", value: "6" },
          { custom_id: "answer_answer3", value: "7" },
          { custom_id: "correctAnswerIndex", value: "1" },
        ]),
      },
      application_id: "application-id",
      channel_id: "channel-id",
      guild_id: "guild-id",
      id: "interaction-id",
      token: "interaction-token",
      user: {
        id: "user-id",
        username: "username",
        discriminator: "0001",
        avatar: "avatar-hash",
        global_name: "user-id",
      },
    };

    mockQuestionStorage = {
      getQuestions: vi.fn(),
      updateQuestion: vi.fn(),
      deleteQuestion: vi.fn(),
      deleteQuestionBank: vi.fn(),
      generateAndAddQuestion: vi.fn(),
      generateQuestion: vi.fn(),
      getQuestionImagePresignedUrl: vi.fn(),
      getExplanationImagePresignedUrl: vi.fn(),
      getPresignedUrl: vi.fn(),
    };

    command = new EditQuestionCommand(mockQuestionStorage);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  it("should update the question correctly", async () => {
    mockQuestionStorage.getQuestions = vi.fn().mockResolvedValue([question]);

    const response = (await command.handleModalSubmit(
      interactionData,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.type).toBe(
      InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe("Updated question in bank test-bank.");
    expect(mockQuestionStorage.updateQuestion).toHaveBeenCalledWith({
      ...question,
      question: "What is 3 + 3?",
      answers: [
        { answerId: "answer1", answer: "5" },
        { answerId: "answer2", answer: "6" },
        { answerId: "answer3", answer: "7" },
      ],
      correctAnswerIndex: 1,
      questionShowTimeMs: 30000,
    });
  });

  it("should return an error if required fields are missing", async () => {
    const invalidInteractionData = { ...interactionData };
    (invalidInteractionData.data.components[0]!.components[0] as any).value =
      "";

    const response = (await command.handleModalSubmit(
      invalidInteractionData,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.type).toBe(
      InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe("Bank name is missing.");
    expect(response.data.flags).toBe(MessageFlags.Ephemeral);
  });

  it("should return an error if question text is missing", async () => {
    const invalidInteractionData = { ...interactionData };
    (invalidInteractionData.data.components[1]!.components[0] as any).value =
      "";

    const response = (await command.handleModalSubmit(
      invalidInteractionData,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.type).toBe(
      InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe("Question text is missing.");
    expect(response.data.flags).toBe(MessageFlags.Ephemeral);
  });

  it("should return an error if correct answer index is missing", async () => {
    const invalidInteractionData = { ...interactionData };
    (invalidInteractionData.data.components[6]!.components[0] as any).value =
      "";

    const response = (await command.handleModalSubmit(
      invalidInteractionData,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.type).toBe(
      InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe("Correct answer index is missing.");
    expect(response.data.flags).toBe(MessageFlags.Ephemeral);
  });

  it("should return an error if the question ID is not found", async () => {
    mockQuestionStorage.getQuestions = vi.fn().mockResolvedValue([]);

    const response = (await command.handleModalSubmit(
      interactionData,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.type).toBe(
      InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe(
      "Question with ID test-question-id not found.",
    );
    expect(response.data.flags).toBe(MessageFlags.Ephemeral);
  });

  it("should return an error if the correct answer index is invalid", async () => {
    const invalidInteractionData = { ...interactionData };
    (invalidInteractionData.data.components[6]!.components[0] as any).value =
      "5";

    const response = (await command.handleModalSubmit(
      invalidInteractionData,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.type).toBe(
      InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe(
      "Invalid correct answer index. Please enter a number between 0 and 2",
    );
    expect(response.data.flags).toBe(MessageFlags.Ephemeral);
  });

  it("should generate the modal correctly", async () => {
    mockQuestionStorage.getQuestions = vi.fn().mockResolvedValue([question]);

    const interaction = createInteraction({
      bankname: "test-bank",
      questionid: "test-question-id",
    });

    const response = (await command.execute(
      interaction,
    )) as APIModalInteractionResponse;

    expect(response.type).toBe(InteractionResponseType.Modal);
    expect(response.data.components.length).toBeGreaterThan(0);

    checkModalContainsExpectedValues(response.data, question);
  });

  it("should return an error if the question is not found during modal generation", async () => {
    mockQuestionStorage.getQuestions = vi.fn().mockResolvedValue([]);

    const interaction = createInteraction({
      bankname: "test-bank",
      questionid: "test-question-id",
    });

    const response = (await command.execute(
      interaction,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.type).toBe(
      InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe(
      "No valid question found for bank name test-bank and question id test-question-id.",
    );
    expect(response.data.flags).toBe(MessageFlags.Ephemeral);
  });

  it("should return an error if bankName option is missing", async () => {
    const interaction = createInteraction({
      bankname: "",
      questionid: "test-question-id",
    });

    const response = (await command.execute(
      interaction,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.type).toBe(
      InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe("The bankname was not specified!");
    expect(response.data.flags).toBe(MessageFlags.Ephemeral);
  });

  it("should return an error if questionId option is missing", async () => {
    const interaction = createInteraction({
      bankname: "test-bank",
      questionid: "",
    });

    const response = (await command.execute(
      interaction,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.type).toBe(
      InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe("The questionid was not specified!");
    expect(response.data.flags).toBe(MessageFlags.Ephemeral);
  });

  it("should return an error if an exception occurs during execution", async () => {
    mockQuestionStorage.getQuestions = vi
      .fn()
      .mockRejectedValue(new Error("Failed to fetch questions"));

    const interaction = createInteraction({
      bankname: "test-bank",
      questionid: "test-question-id",
    });

    const response = (await command.execute(
      interaction,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.type).toBe(
      InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe("Failed to fetch questions");
    expect(response.data.flags).toBe(MessageFlags.Ephemeral);
  });

  it("should return an error if an exception occurs during handleModalSubmit", async () => {
    // Simulate the condition where the question is found but updateQuestion throws an error
    mockQuestionStorage.getQuestions = vi.fn().mockResolvedValue([question]);
    mockQuestionStorage.updateQuestion = vi
      .fn()
      .mockRejectedValue(new Error("Failed to update question"));

    const response = (await command.handleModalSubmit(
      interactionData,
    )) as APIInteractionResponseChannelMessageWithSource;

    expect(response.type).toBe(
      InteractionResponseType.ChannelMessageWithSource,
    );
    expect(response.data.content).toBe(
      "Failed to update question: Failed to update question",
    );
    expect(response.data.flags).toBe(MessageFlags.Ephemeral);
  });
});