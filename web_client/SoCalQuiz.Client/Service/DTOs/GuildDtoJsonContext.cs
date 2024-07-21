using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// The JSON context for the GuildDto.
/// </summary>
[JsonSerializable(typeof(GuildDto))]
public partial class GuildDtoJsonContext : JsonSerializerContext
{
}
