import {QuizManagerBase} from "./quizManagerBase.js";

export type QuizManagerFactory = () => QuizManagerBase;
export class QuizManagerFactoryManager {
    private quizManagers: Map<string, Promise<QuizManagerBase>>;
    constructor(private readonly quizFactory : QuizManagerFactory) {
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