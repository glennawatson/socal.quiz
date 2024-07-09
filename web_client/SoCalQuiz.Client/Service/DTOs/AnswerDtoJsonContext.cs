using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// A JSON source generator context for the AnswerDto object.
/// </summary>
[JsonSerializable(typeof(AnswerDto))]
public partial class AnswerDtoJsonContext : JsonSerializerContext
{
}
