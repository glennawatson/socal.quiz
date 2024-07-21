using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// The JSON context for the QuestionBankRequestDto.
/// </summary>
[JsonSerializable(typeof(QuestionBankRequestDto))]
public partial class QuestionBankRequestDtoJsonContext : JsonSerializerContext
{
}
