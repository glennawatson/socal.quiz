using System.Collections.ObjectModel;
using System.Text.Json.Serialization;

using SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// Represents a question in a quiz with its associated metadata and answers.
/// </summary>
public record QuestionDto
{
    /// <summary>
    /// Gets or sets the unique identifier for the question.
    /// </summary>
    [JsonPropertyName("questionId")]
    public string? QuestionId { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Gets or sets the text of the question.
    /// </summary>
    [JsonPropertyName("question")]
    public string? Question { get; set; }

    /// <summary>
    /// Gets or sets the list of possible answers for the question.
    /// </summary>
    [JsonPropertyName("answers")]
    public ObservableCollection<AnswerDto> Answers { get; set; } = [];

    /// <summary>
    /// Gets or sets the identifier of the correct answer.
    /// </summary>
    [JsonPropertyName("correctAnswerId")]
    public string? CorrectAnswerId { get; set; }

    /// <summary>
    /// Gets or sets the partition key for the question image.
    /// </summary>
    [JsonPropertyName("imagePartitionKey")]
    public string? ImagePartitionKey { get; set; }

    /// <summary>
    /// Gets or sets the explanation text for the question.
    /// </summary>
    [JsonPropertyName("explanation")]
    public string? Explanation { get; set; }

    /// <summary>
    /// Gets or sets the partition key for the explanation image.
    /// </summary>
    [JsonPropertyName("explanationImagePartitionKey")]
    public string? ExplanationImagePartitionKey { get; set; }

    /// <summary>
    /// Gets or sets the display time for the question in milliseconds.
    /// </summary>
    [JsonPropertyName("questionShowTimeMs")]
    public int QuestionShowTimeMs { get; set; } = 20000;

    public static implicit operator QuestionRequestDto(QuestionDto question) => new()
    {
        QuestionId = question.QuestionId,
        Question = question.Question,
        Answers = new(question.Answers),
        CorrectAnswerId = question.CorrectAnswerId,
        ImagePartitionKey = question.ImagePartitionKey,
        Explanation = question.Explanation,
        ExplanationImagePartitionKey = question.ExplanationImagePartitionKey,
        QuestionShowTimeMs = question.QuestionShowTimeMs
    };
}
