import { Question } from "../question";
import { Subscription } from "rxjs";

export interface QuizState {
  questionBank: Question[];
  activeUsers: Map<string, number>;
  correctUsersForQuestion: Set<string>;
  answeredUsersForQuestion: Set<string>;
  quizSubscription: Subscription | null;
  channelId: string;
  currentQuestionId: string | undefined | null;
}
