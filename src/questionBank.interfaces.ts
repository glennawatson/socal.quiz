import { Question } from "./question.interfaces.js";

export interface QuestionBank {
  name: string;
  guildId: string;
  questions: Question[];
}