using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// The JSON context for the question bank list.
/// </summary>
[JsonSerializable(typeof(List<QuestionBankDto>))]
public partial class ListQuestionBankDtoJsonContext : JsonSerializerContext
{
}
