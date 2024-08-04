using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// A JSON source generator context for the QuestionDto object.
/// </summary>
[JsonSerializable(typeof(QuestionRequestDto))]

public partial class QuestionRequestDtoJsonContext : JsonSerializerContext
{
}
