namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// A answer in a quiz.
/// </summary>
public record AnswerDto
{
    /// <summary>
    /// Gets or sets the ID of the quiz.
    /// </summary>
    public string AnswerId { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Gets or sets the answer text.
    /// </summary>
    public string? Answer { get; set; }
}
