using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// The JSON context for the list UpsertResultDto.
/// </summary>
[JsonSerializable(typeof(List<UpsertResultDto>))]
public partial class ListUpsertResultDtoJsonContext : JsonSerializerContext
{
}
