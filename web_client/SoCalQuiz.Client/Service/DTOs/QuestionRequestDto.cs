namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// Represents a request body for creating or updating a question in a quiz.
/// Extends QuestionDto with additional fields.
/// </summary>
public record QuestionRequestDto
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
    /// Gets or sets the unique identifier for the question.
    /// </summary>
    public string? QuestionId { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Gets or sets the text of the question.
    /// </summary>
    public string? Question { get; set; }

    /// <summary>
    /// Gets or sets the list of possible answers for the question.
    /// </summary>
    public List<AnswerDto> Answers { get; set; } = [];

    /// <summary>
    /// Gets or sets the identifier of the correct answer.
    /// </summary>
    public string? CorrectAnswerId { get; set; }

    /// <summary>
    /// Gets or sets the partition key for the question image.
    /// </summary>
    public string? ImagePartitionKey { get; set; }

    /// <summary>
    /// Gets or sets the explanation text for the question.
    /// </summary>
    public string? Explanation { get; set; }

    /// <summary>
    /// Gets or sets the partition key for the explanation image.
    /// </summary>
    public string? ExplanationImagePartitionKey { get; set; }

    /// <summary>
    /// Gets or sets the display time for the question in milliseconds.
    /// </summary>
    public int QuestionShowTimeMs { get; set; } = 20000;
}
