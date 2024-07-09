using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// A JSON source generator context for a list of QuestionDto objects.
/// </summary>
[JsonSerializable(typeof(List<QuestionDto>))]
public partial class ListQuestionDtoJsonContext : JsonSerializerContext
{
}
