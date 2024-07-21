namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// A question bank.
/// </summary>
public record QuestionBankDto
{
    /// <summary>
    /// Gets or sets the name of the question bank.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the guild id.
    /// </summary>
    public string GuildId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the questions.
    /// </summary>
    public List<QuestionDto> Questions { get; set; } = [];

    public static implicit operator QuestionBankRequestDto(QuestionBankDto dto) => new()
    {
        Name = dto.Name,
        GuildId = dto.GuildId,
        Questions = dto.Questions.ConvertAll(x => (QuestionRequestDto)x),
    };
}
