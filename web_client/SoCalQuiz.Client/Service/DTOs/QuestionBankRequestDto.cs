namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// A request for a QuestionBank.
/// </summary>
public record QuestionBankRequestDto
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
    public List<QuestionRequestDto> Questions { get; set; } = [];
}
