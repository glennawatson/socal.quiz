using Microsoft.AspNetCore.Components;
using SoCal.Quiz.QuestionEditor.Service.DTOs;

namespace SoCal.Quiz.QuestionEditor.Pages;

/// <summary>
/// A control for editing answers.
/// </summary>
public partial class EditAnswer
{
    /// <summary>
    /// Gets or sets the answer.
    /// </summary>
    [Parameter]
    public AnswerDto Answer { get; set; } = new AnswerDto();

    /// <summary>
    /// Gets or sets a event when the answer changes.
    /// </summary>
    [Parameter]
    public EventCallback<AnswerDto> AnswerChanged { get; set; }

    private void OnAnswerChanged()
    {
        AnswerChanged.InvokeAsync(Answer);
    }

    private void OnAnswerTextChanged(string value)
    {
        Answer.Answer = value;
        OnAnswerChanged();
    }
}
