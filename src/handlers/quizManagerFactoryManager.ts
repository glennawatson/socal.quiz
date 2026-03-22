import { QuizManagerBase } from "./quizManagerBase.js";

export type QuizManagerFactory = () => QuizManagerBase;

/** Caches one QuizManagerBase per guild, creating instances on demand via a factory function. */
export class QuizManagerFactoryManager {
  private quizManagers: Map<string, Promise<QuizManagerBase>>;
  private readonly quizFactory: QuizManagerFactory;

  /**
   * @param quizFactory - The factory function to create quiz manager instances.
   */
  constructor(quizFactory: QuizManagerFactory) {
    this.quizFactory = quizFactory;
    this.quizManagers = new Map();
  }

  /**
   * Returns the cached quiz manager for the guild, or creates one via the factory.
   *
   * @param guildId - The ID of the guild.
   * @returns A promise that resolves to the quiz manager for the guild.
   */
  public async getQuizManager(guildId: string): Promise<QuizManagerBase> {
    const manager: QuizManagerBase | undefined = await this.quizManagers.getOrAdd(
      guildId,
      // eslint-disable-next-line @typescript-eslint/require-await -- Map stores Promise<T>, async wrapper required for type compatibility
      async () => this.quizFactory(),
    );

    if (!manager)
      throw new Error(`could not find a quiz manager for guild ${guildId}`);
    return manager;
  }
}
