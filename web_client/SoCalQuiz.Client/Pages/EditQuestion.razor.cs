using Microsoft.AspNetCore.Components;

using SoCal.Quiz.QuestionEditor.Service;
using SoCal.Quiz.QuestionEditor.Service.DTOs;

namespace SoCal.Quiz.QuestionEditor.Pages;

/// <summary>
/// The edit question page code behind.
/// </summary>
public partial class EditQuestion
{
    /// <summary>
    /// Gets or sets the guild id.
    /// </summary>
    [Parameter]
    public QuestionRequestDto Question { get; set; } = null!;

    /// <summary>
    /// Gets or sets the question service.
    /// </summary>
    [Inject]
    public QuestionService QuestionService { get; set; } = null!;

    private void DeleteAnswer(AnswerDto answer)
    {
        Question.Answers.Remove(answer);
    }

    private void AddNewAnswer()
    {
        Question.Answers.Add(new());
    }
}
