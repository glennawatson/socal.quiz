using System.Collections.ObjectModel;
using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// A question bank.
/// </summary>
public record QuestionBankDto
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
    public ObservableCollection<QuestionDto> Questions { get; set; } = [];

    public static implicit operator QuestionBankRequestDto(QuestionBankDto dto) => new()
    {
        Name = dto.Name,
        GuildId = dto.GuildId,
        Questions = new(dto.Questions.Select(x => (QuestionRequestDto)x)),
    };
}
