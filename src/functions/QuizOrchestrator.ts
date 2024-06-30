import {InvocationContext} from '@azure/functions';
import * as df from 'durable-functions';
import {ActivityHandler, OrchestrationContext, OrchestrationHandler} from 'durable-functions';
import {QuizState} from "../handlers/quizState.interfaces.js";
import {DateTime} from "luxon";
import {Config} from '../util/config.js';
import {postQuestion, sendQuestionSummary, showScores} from "../handlers/quizStateManager.js";
import {Question} from "../question.interfaces.js";
import {isAnswerEvent} from "../handlers/answerEvent.interfaces.js";

const summaryDurationMs = 5000;

const QuizOrchestrator: OrchestrationHandler = function* (context: OrchestrationContext) {
    const quiz: QuizState = context.df.getInput();

    for (let index = 0; index < quiz.questionBank.length; index++) {
        const question = quiz.questionBank[index];
        if (!question || !question.question) {
            continue;
        }


        quiz.currentQuestionId = question.questionId;
        yield context.df.callActivity('PostQuestion', quiz);

        const questionTime = DateTime.fromJSDate(context.df.currentUtcDateTime, {zone: 'utc'}).plus({milliseconds: question.questionShowTimeMs});

        // Wait for the timer, the skip signal, or the cancel signal
        const skipQuestionEvent = context.df.waitForExternalEvent('skipQuestion');
        const cancelEvent = context.df.waitForExternalEvent('cancelQuiz');
        const answerEvent = context.df.waitForExternalEvent('answerQuestion');

        let shouldSkip = false;

        while (true) {
            const winner = yield context.df.Task.any([
                context.df.createTimer(questionTime.toJSDate()),
                skipQuestionEvent,
                cancelEvent,
                answerEvent
            ]);

            // If the cancelQuiz signal is received, terminate the orchestrator
            if (winner === cancelEvent) {
                return;
            }

            // If the skipQuestion signal is received, continue to the next question
            if (winner === skipQuestionEvent) {
                shouldSkip = true;
                break;
            }

            if (winner == answerEvent) {
                if (!isAnswerEvent(answerEvent.result)) {
                    continue;
                }

                const answerEventData = answerEvent.result;
                const isCorrect = question.correctAnswerId === answerEventData.selectedAnswerId;

                if (isCorrect) {
                    quiz.correctUsersForQuestion.add(answerEventData.userId);
                    quiz.activeUsers.set(answerEventData.userId, (quiz.activeUsers.get(answerEventData.userId) || 0) + 1);
                } else {
                    quiz.activeUsers.set(answerEventData.userId, quiz.activeUsers.get(answerEventData.userId) || 0);
                }
            }

            yield context.df.callActivity('SendQuestionSummary', {quiz, questionNumber: index + 1});

            quiz.correctUsersForQuestion.clear();
            quiz.answeredUsersForQuestion.clear();
        }

        if (shouldSkip) {
            continue;
        }

        const summaryTime = DateTime.fromJSDate(context.df.currentUtcDateTime, {zone: 'utc'}).plus({milliseconds: summaryDurationMs});

        // Wait for the timer or the cancel signal during summary
        const summaryEvent = context.df.waitForExternalEvent('cancelQuiz');

        const summaryWinner = yield context.df.Task.any([
            context.df.createTimer(summaryTime.toJSDate()),
            summaryEvent
        ]);

        if (summaryWinner === summaryEvent) {
            return;
        }
    }

    yield context.df.callActivity('ShowScores', quiz);
};

df.app.orchestration('QuizOrchestrator', QuizOrchestrator);

interface QuestionServerData {
    currentQuestionId: number;
    currentQuestion: Question | undefined;
    durableClient: df.DurableClient;
}

async function getQuestionServerDetails(input: QuizState, context: InvocationContext): Promise<QuestionServerData> {
    const durableClient = df.getClient(context);

    await Config.initialize(durableClient);

    const questionNumber = input.questionBank.findIndex((q) => q.questionId === input.currentQuestionId) + 1;
    const currentQuestion = input.questionBank[questionNumber - 1];

    return {currentQuestion: currentQuestion, currentQuestionId: questionNumber, durableClient: durableClient};
}

const PostQuestion: ActivityHandler = async (input: QuizState, context: InvocationContext) => {
    const questionData = await getQuestionServerDetails(input, context);

    if (!questionData.currentQuestion) {
        console.error(`Question not found for question number ${input.currentQuestionId}`);
        return;
    }

    await postQuestion(Config.rest, Config.imageStorage, input.channelId, context.invocationId, questionData.currentQuestion);
};

const SendQuestionSummary: ActivityHandler = async (input: QuizState, context: InvocationContext) => {
    const questionData = await getQuestionServerDetails(input, context);

    if (!questionData.currentQuestion) {
        console.error(`Question not found for question number ${input.currentQuestionId}`);
        return;
    }

    await sendQuestionSummary(Config.rest, Config.imageStorage, questionData.currentQuestion, input, questionData.currentQuestionId);
};

const ShowScores: ActivityHandler = async (input: QuizState, context: InvocationContext) => {
    const durableClient = df.getClient(context);

    await Config.initialize(durableClient);

    await showScores(Config.rest, input);
};

df.app.activity('PostQuestion', {handler: PostQuestion});
df.app.activity('SendQuestionSummary', {handler: SendQuestionSummary});
df.app.activity('ShowScores', {handler: ShowScores});
