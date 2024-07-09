namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// Represents the result of an upsert operation.
/// </summary>
public record UpsertResultDto
{
    /// <summary>
    /// Gets or sets the unique identifier for the question.
    /// </summary>
    public string QuestionId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether the upsert operation was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Gets or sets the error message if the upsert operation failed.
    /// Optional.
    /// </summary>
    public string? ErrorMessage { get; set; }
}
