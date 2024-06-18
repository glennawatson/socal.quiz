import { Question } from "../question";
import { Subscription } from "rxjs";

export interface QuizState {
  currentQuestionIndex: number;
  questionBank: Question[];
  activeUsers: Map<string, number>;
  correctUsers: Set<string>;
  quizSubscription: Subscription | null;
  channelId: string;
}
