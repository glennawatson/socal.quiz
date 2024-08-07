﻿using System.Collections.ObjectModel;
using System.Text.Json.Serialization;

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
    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Gets or sets the URL of the image associated with the explanation.
    /// Optional.
    /// </summary>
    [JsonPropertyName("explanationImageUrl")]
    public string? ExplanationImageUrl { get; set; }

    /// <summary>
    /// Gets or sets the unique identifier for the question.
    /// </summary>
    [JsonPropertyName("questionId")]
    [JsonRequired]
    public string? QuestionId { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Gets or sets the text of the question.
    /// </summary>
    [JsonPropertyName("question")]
    [JsonRequired]
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
    [JsonRequired]
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
}
