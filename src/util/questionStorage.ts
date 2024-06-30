import {odata, TableClient, TableDeleteEntityHeaders, TableEntity,} from "@azure/data-tables";
import {v4 as uuid} from "uuid";
import {Question} from "../question.interfaces.js";
import {Answer} from "../answer.interfaces.js";
import {IQuestionStorage} from "./IQuestionStorage.interfaces.js";
import {QuizImageStorage} from "./quizImageStorage.js";

export class QuestionStorage implements IQuestionStorage {
    private quizQuestionsClient: TableClient;

    constructor(
        private readonly quizImageClient: QuizImageStorage,
        connectionString?: string | undefined,
        quizQuestionsClient?: TableClient) {

        if (!quizQuestionsClient) {
            if (!connectionString) {
                connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            }

            if (!connectionString) {
                throw new Error("invalid azure storage connection string");
            }

            this.quizQuestionsClient =
                quizQuestionsClient ??
                TableClient.fromConnectionString(connectionString, "QuizQuestions");
        } else {
            this.quizQuestionsClient = quizQuestionsClient;
        }
    }

    async generateAnswer(answerText: string): Promise<Answer> {
        return { answer: answerText, answerId: uuid() };
    }

    async getQuestions(bankName: string): Promise<Question[]> {
        const entitiesIter = this.quizQuestionsClient.listEntities<
            TableEntity<Question>
        >({
            queryOptions: {
                filter: odata`PartitionKey eq ${bankName}`,
            },
        });

        const entities: Question[] = [];
        for await (const entity of entitiesIter) {
            entities.push(fromTableEntity(entity));
        }

        return entities;
    }

    async addQuestion(question: Question): Promise<void> {
        const entity = toTableEntity(question);
        await this.quizQuestionsClient.createEntity(entity);
    }

    async addQuestions(questions: Question[]): Promise<void> {
        const addPromises = questions.map((question) => {
            const entity = toTableEntity(question);
            return this.quizQuestionsClient.createEntity(entity);
        });
        await Promise.all(addPromises);
    }

    public async deleteQuestionBank(bankName: string): Promise<void> {
        const options = {
            queryOptions: {
                filter: odata`PartitionKey eq ${bankName}`,
            },
        };
        const entitiesToDelete =
            this.quizQuestionsClient.listEntities<TableEntity<Question>>(options);

        const deletePromises: Promise<TableDeleteEntityHeaders>[] = [];
        for await (const entity of entitiesToDelete) {
            deletePromises.push(
                this.quizQuestionsClient.deleteEntity(
                    entity.partitionKey,
                    entity.rowKey,
                ),
            );
        }
        await Promise.all(deletePromises);
    }

    async deleteQuestion(bankName: string, questionId: string): Promise<void> {
        await this.quizQuestionsClient.deleteEntity(bankName, questionId);
    }

    async generateAndAddQuestion(
        bankName: string,
        questionText: string,
        answers: Answer[],
        correctAnswerId: string,
        questionShowTimeMs = 20000,
        imageUrl?: string,
        explanation?: string,
        explanationImageUrl?: string,
    ): Promise<void> {
        const question = await this.generateQuestion(
            bankName,
            questionText,
            answers,
            correctAnswerId,
            questionShowTimeMs,
            imageUrl,
            explanation,
            explanationImageUrl,
        );
        await this.addQuestion(question);
    }

    async generateQuestion(
        bankName: string,
        questionText: string,
        answers: Answer[],
        correctAnswerId: string,
        questionShowTimeMs = 20000,
        imageUrl?: string,
        explanation?: string,
        explanationImageUrl?: string,
    ): Promise<Question> {
        const questionId = uuid();

        let imagePartitionKey: string | undefined;
        let explanationImagePartitionKey: string | undefined;

        if (imageUrl) {
            imagePartitionKey = `${bankName}-${questionId}-question`;
            await this.quizImageClient.downloadAndValidateImageForDiscord(
                imageUrl,
                bankName,
                imagePartitionKey,
            );
        }

        if (explanationImageUrl) {
            explanationImagePartitionKey = `${bankName}-${questionId}-explanation`;
            await this.quizImageClient.downloadAndValidateImageForDiscord(
                explanationImageUrl,
                bankName,
                explanationImagePartitionKey,
            );
        }

        return {
            bankName,
            questionId,
            question: questionText,
            answers,
            correctAnswerId,
            questionShowTimeMs,
            imagePartitionKey,
            explanation,
            explanationImagePartitionKey,
        };
    }

    public async updateQuestion(question: Question): Promise<void> {
        // New method for updating questions
        const entity = toTableEntity(question);
        await this.quizQuestionsClient.updateEntity(entity, "Merge");
    }
}

function toTableEntity(question: Question): TableEntity<Question> {
    const rowKey = question.questionId;
    return {
        partitionKey: question.bankName,
        rowKey: rowKey,
        question: question.question,
        questionId: rowKey,
        bankName: question.bankName,
        answers: question.answers,
        correctAnswerId: question.correctAnswerId,
        imagePartitionKey: question.imagePartitionKey,
        explanation: question.explanation,
        explanationImagePartitionKey: question.explanationImagePartitionKey,
        questionShowTimeMs: question.questionShowTimeMs,
    };
}

function fromTableEntity(entity: TableEntity<Question>): Question {
    return {
        bankName: entity.partitionKey,
        questionId: entity.rowKey,
        question: entity.question,
        answers: entity.answers,
        correctAnswerId: entity.correctAnswerId,
        imagePartitionKey: entity.imagePartitionKey,
        explanation: entity.explanation,
        explanationImagePartitionKey: entity.explanationImagePartitionKey,
        questionShowTimeMs: entity.questionShowTimeMs,
    };
}
