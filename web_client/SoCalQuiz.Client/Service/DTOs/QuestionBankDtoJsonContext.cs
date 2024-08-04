using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// A json context for the QuestionBankDto object.
/// </summary>
[JsonSerializable(typeof(QuestionBankDto))]
public partial class QuestionBankDtoJsonContext : JsonSerializerContext
{
}
