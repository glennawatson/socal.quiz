using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// A context for a list of GuildDto objects.
/// </summary>
[JsonSerializable(typeof(List<GuildDto>))]
public partial class ListGuildDtoJsonContext : JsonSerializerContext
{
}
