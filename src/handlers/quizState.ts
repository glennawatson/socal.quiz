import {Question} from "../question";
import {SetIntervalAsyncTimer} from "set-interval-async";

export interface QuizState {
    currentQuestionIndex: number;
    questionBank: Question[];
    activeUsers: Map<string, number>;
    correctUsers: Set<string>;
    quizInterval: SetIntervalAsyncTimer<[]> | null;
}