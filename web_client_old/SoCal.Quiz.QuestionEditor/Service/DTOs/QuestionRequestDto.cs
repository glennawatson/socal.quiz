namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// Represents a request body for creating or updating a question in a quiz.
/// Extends QuestionDto with additional fields.
/// </summary>
public record QuestionRequestDto : QuestionDto
{
    /// <summary>
    /// Gets or sets the URL of the image associated with the question.
    /// Optional.
    /// </summary>
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Gets or sets the URL of the image associated with the explanation.
    /// Optional.
    /// </summary>
    public string? ExplanationImageUrl { get; set; }

    /// <summary>
    /// Implicitly converts a QuestionDto to a QuestionRequestDto.
    /// </summary>
    /// <param name="question">The QuestionDto to convert.</param>
    /// <returns>The request DTO.</returns>
    public static QuestionRequestDto ToRequestDto(QuestionDto question)
    {
        return new QuestionRequestDto
        {
            GuildId = question.GuildId,
            BankName = question.BankName,
            QuestionId = question.QuestionId,
            Question = question.Question,
            Answers = question.Answers,
            CorrectAnswerId = question.CorrectAnswerId,
            ImagePartitionKey = question.ImagePartitionKey,
            Explanation = question.Explanation,
            ExplanationImagePartitionKey = question.ExplanationImagePartitionKey,
            QuestionShowTimeMs = question.QuestionShowTimeMs
        };
    }
}
