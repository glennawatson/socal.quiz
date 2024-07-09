using System.Net.Http.Json;

using SoCal.Quiz.QuestionEditor.Service.DTOs;

namespace SoCal.Quiz.QuestionEditor.Service;

/// <summary>
/// Represents a service for handling questions.
/// </summary>
/// <param name="httpClient">The http client.</param>
public class QuestionService(HttpClient httpClient)
{

    /// <summary>
    /// Retrieves a list of questions asynchronously from the API based on the specified bank name.
    /// </summary>
    /// <param name="guildId">The guild id.</param>
    /// <param name="bankName">The name of the bank to retrieve questions from.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of <see cref="QuestionDto"/>.</returns>
    public async Task<List<QuestionDto>> GetQuestionsAsync(string guildId, string bankName)
    {
        var response = await httpClient.GetAsync($"api/questions?guildId={guildId}&bankname={bankName}").ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var values = await response.Content.ReadFromJsonAsync(ListQuestionDtoJsonContext.Default.ListQuestionDto).ConfigureAwait(false);

        return values ?? [];
    }

    /// <summary>
    /// Retrieves the names of question banks from the API.
    /// </summary>
    /// <param name="guildId">The guild id.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of bank names.</returns>
    public async Task<List<string>> GetQuestionBankNamesAsync(string guildId)
    {
        var response = await httpClient.GetAsync($"api/getQuestionBankNames?guildId={guildId}").ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var values = await response.Content.ReadFromJsonAsync<List<string>>().ConfigureAwait(false);

        return values ?? [];
    }

    /// <summary>
    /// Retrieves a question asynchronously from the specified bank.
    /// </summary>
    /// <param name="guildId">The guild id.</param>
    /// <param name="bankName">The name of the bank.</param>
    /// <param name="questionId">The ID of the question.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the retrieved <see cref="QuestionDto"/> object, or null if the question was not found.</returns>
    public async Task<QuestionDto?> GetQuestionAsync(string guildId, string bankName, string questionId)
    {
        var response = await httpClient.GetAsync($"api/question?guildId={guildId}&bankname={bankName}&questionId={questionId}").ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var values = await response.Content.ReadFromJsonAsync(QuestionDtoJsonContext.Default.QuestionDto).ConfigureAwait(false);
        return values;
    }

    /// <summary>
    /// Deletes a question asynchronously.
    /// </summary>
    /// <param name="guildId">The guild id.</param>
    /// <param name="bankName">The name of the question bank.</param>
    /// <param name="questionId">The ID of the question to delete.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task DeleteQuestionAsync(string guildId, string bankName, string questionId)
    {
        var response = await httpClient.DeleteAsync($"api/question?guildId={guildId}&bankname={bankName}&questionId={questionId}").ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
    }

    /// <summary>
    /// Updates a question asynchronously.
    /// </summary>
    /// <param name="guildId">The guild id.</param>
    /// <param name="question">The question to update.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task UpdateQuestionAsync(string guildId, QuestionRequestDto question)
    {
        var response = await httpClient.PutAsJsonAsync($"api/question?guildId={guildId}", question, QuestionRequestDtoJsonContext.Default.QuestionRequestDto).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
    }

    /// <summary>
    /// Upserts multiple questions asynchronously.
    /// </summary>
    /// <param name="guildId">The guild id.</param>
    /// <param name="questions">The list of questions to upsert.</param>
    /// <returns>A task representing the asynchronous operation. The task result contains a list of <see cref="UpsertResultDto"/>.</returns>
    public async Task<List<UpsertResultDto>> UpsertQuestionsAsync(string guildId, List<QuestionRequestDto> questions)
    {
        var response = await httpClient.PutAsJsonAsync($"api/upsertQuestions?guildId={guildId}", questions, ListQuestionRequestDtoJsonContext.Default.ListQuestionRequestDto).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var values = await response.Content.ReadFromJsonAsync(ListUpsertResultDtoJsonContext.Default.ListUpsertResultDto).ConfigureAwait(false);

        return values ?? [];
    }

    /// <summary>
    /// Gets a list of guilds that both the bot and the user share in common.
    /// </summary>
    /// <returns>A list of the guilds.</returns>
    public async Task<List<GuildDto>> GetCurrentUserGuilds()
    {
        var response = await httpClient.GetAsync("api/getGuilds"); // Assumes your API route is "getGuilds"
        response.EnsureSuccessStatusCode();

        var values = await response.Content.ReadFromJsonAsync(ListGuildDtoJsonContext.Default.ListGuildDto);
        return values ?? [];
    }
}
