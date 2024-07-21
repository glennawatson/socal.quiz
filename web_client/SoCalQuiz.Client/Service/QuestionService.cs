using System.Net.Http.Json;
using System.Text.Json;

using SoCal.Quiz.QuestionEditor.Service.DTOs;

namespace SoCal.Quiz.QuestionEditor.Service;

/// <summary>
/// Represents a service for handling questions and question banks.
/// </summary>
public class QuestionService(HttpClient httpClient)
{
    /// <summary>
    /// Retrieves a question bank asynchronously from the API based on the specified bank name.
    /// </summary>
    /// <param name="guildId">The guild id.</param>
    /// <param name="bankName">The name of the bank to retrieve questions from.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the retrieved <see cref="QuestionBankDto"/> object, or null if the question bank was not found.</returns>
    public async Task<QuestionBankDto?> GetQuestionBankAsync(string guildId, string bankName)
    {
        var response = await httpClient.GetAsync($"api/questionBank?guildId={guildId}&bankname={bankName}").ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var values = await response.Content.ReadFromJsonAsync(QuestionBankDtoJsonContext.Default.QuestionBankDto).ConfigureAwait(false);
        return values;
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

        var valuesString = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
        var values = JsonSerializer.Deserialize(valuesString, ListStringJsonContext.Default.ListString);

        return values ?? [];
    }

    /// <summary>
    /// Deletes a question bank asynchronously.
    /// </summary>
    /// <param name="guildId">The guild id.</param>
    /// <param name="bankName">The name of the question bank to delete.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task DeleteQuestionBankAsync(string guildId, string bankName)
    {
        var response = await httpClient.DeleteAsync($"api/questionBank?guildId={guildId}&bankname={bankName}").ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
    }

    /// <summary>
    /// Updates a question bank asynchronously.
    /// </summary>
    /// <param name="guildId">The guild id.</param>
    /// <param name="questionBank">The question bank to update.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task<List<UpsertResultDto>?> UpsertQuestionBankAsync(string guildId, QuestionBankRequestDto questionBank)
    {
        var response = await httpClient.PutAsJsonAsync($"api/questionBank?guildId={guildId}", questionBank, QuestionBankRequestDtoJsonContext.Default.QuestionBankRequestDto).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync(ListUpsertResultDtoJsonContext.Default.ListUpsertResultDto).ConfigureAwait(false);
    }

    /// <summary>
    /// Gets a list of guilds that both the bot and the user share in common.
    /// </summary>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of <see cref="GuildDto"/> objects.</returns>
    public async Task<List<GuildDto>> GetCurrentUserGuilds()
    {
        var response = await httpClient.GetAsync("api/getGuilds").ConfigureAwait(false);
        response.EnsureSuccessStatusCode();

        var valuesString = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
        var values = JsonSerializer.Deserialize(valuesString, ListGuildDtoJsonContext.Default.ListGuildDto);

        return values ?? [];
    }
}
