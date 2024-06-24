import { Question } from "../question.interfaces.js";

export interface QuizState {
  questionBank: Question[];
  activeUsers: Map<string, number>;
  correctUsersForQuestion: Set<string>;
  answeredUsersForQuestion: Set<string>;
  channelId: string;
  guildId: string;
  currentQuestionId: string | undefined | null;
}
