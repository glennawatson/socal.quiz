import {IDiscordCommand} from "./discordCommand";
import {DiscordBotService} from "../discordBotService";
import {SlashCommandBuilder, SlashCommandOptionsOnlyBuilder} from "@discordjs/builders";
import {APIChatInputApplicationCommandInteraction, APIInteractionResponse} from "discord-api-types/v10";
import {createEphemeralResponse, generateErrorResponse, generateOptionMissingErrorResponse} from "../../util/interactionHelpers";

export class NextQuestionCommand implements IDiscordCommand {
    constructor(private discordBotService: DiscordBotService) {
    }

    data(): SlashCommandOptionsOnlyBuilder {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription('Show the next quiz question');
    }

    name = "nextQuestion";

    async execute(interaction: APIChatInputApplicationCommandInteraction): Promise<APIInteractionResponse> {
        try {
            const guildId = interaction.guild_id;

            if (!guildId)
            {
                return generateOptionMissingErrorResponse('guild id');
            }

            const quizManager = await this.discordBotService.getQuizManager(guildId);

            if (!quizManager)
            {
                return generateOptionMissingErrorResponse('invalid quiz manager');
            }

            await quizManager.sendQuizQuestion(interaction.channel.id);

            return createEphemeralResponse('Showing next question.');
        } catch (error) {
            return generateErrorResponse(error as Error);
        }
    }
}