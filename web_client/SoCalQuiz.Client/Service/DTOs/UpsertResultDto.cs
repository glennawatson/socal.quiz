using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// Represents the result of an upsert operation.
/// </summary>
public record UpsertResultDto
{
    /// <summary>
    /// Gets or sets the unique identifier for the question.
    /// </summary>
    [JsonPropertyName("questionId")]
    public string QuestionId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether the upsert operation was successful.
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Gets or sets the error message if the upsert operation failed.
    /// Optional.
    /// </summary>
    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }
}
