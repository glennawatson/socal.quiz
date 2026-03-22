import { QuizManagerBase } from "./quizManagerBase.js";

export type QuizManagerFactory = () => QuizManagerBase;
export class QuizManagerFactoryManager {
  private quizManagers: Map<string, Promise<QuizManagerBase>>;
  private readonly quizFactory: QuizManagerFactory;
  constructor(quizFactory: QuizManagerFactory) {
    this.quizFactory = quizFactory;
    this.quizManagers = new Map();
  }

  public async getQuizManager(guildId: string): Promise<QuizManagerBase> {
    const manager = await this.quizManagers.getOrAdd(guildId, async () =>
      this.quizFactory(),
    );

    if (!manager)
      throw new Error(`could not find a quiz manager for guild ${guildId}`);
    return manager;
  }
}
