using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// A JSON source generator context for a list of QuestionRequestDto objects.
/// </summary>
[JsonSerializable(typeof(List<QuestionRequestDto>))]
public partial class ListQuestionRequestDtoJsonContext : JsonSerializerContext
{
}
