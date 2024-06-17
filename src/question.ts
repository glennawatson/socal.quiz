import { Answer } from "./answer";

export interface Question {
    bankName: string;
    questionId: string;
    question: string;
    answers: Answer[];
    correctAnswerIndex: number;
    imageUrl?: string; // Optional property for the image URL
    explanation?: string;
    explanationImageUrl?: string;
}