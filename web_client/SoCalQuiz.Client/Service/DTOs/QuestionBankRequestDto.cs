using System.Collections.ObjectModel;
using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// A request for a QuestionBank.
/// </summary>
public record QuestionBankRequestDto
{
    /// <summary>
    /// Gets or sets the name of the question bank.
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the guild id.
    /// </summary>
    [JsonPropertyName("guildId")]
    public string GuildId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the questions.
    /// </summary>
    [JsonPropertyName("questions")]
    public ObservableCollection<QuestionRequestDto> Questions { get; set; } = [];
}
