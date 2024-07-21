using System.Text.Json.Serialization;

namespace SoCal.Quiz.QuestionEditor.Service.DTOs;

/// <summary>
/// A json context for serializing a list of strings.
/// </summary>
[JsonSerializable(typeof(List<string>))]
public partial class ListStringJsonContext : JsonSerializerContext
{
}
