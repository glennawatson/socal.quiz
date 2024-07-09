using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// The JSON context for the UpsertResultDto.
/// </summary>
[JsonSerializable(typeof(UpsertResultDto))]
public partial class UpsertResultDtoJsonContext : JsonSerializerContext
{
}
