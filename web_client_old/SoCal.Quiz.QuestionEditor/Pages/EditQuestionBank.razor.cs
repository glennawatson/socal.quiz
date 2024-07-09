using Blazorise;

using Microsoft.AspNetCore.Components;
using SoCal.Quiz.QuestionEditor.Service;
using SoCal.Quiz.QuestionEditor.Service.DTOs;

namespace SoCal.Quiz.QuestionEditor.Pages;

/// <summary>
/// The question bank.
/// </summary>
public partial class EditQuestionBank
{
    private Validations? _validations;
    private List<QuestionRequestDto> _questions = [];
    private QuestionRequestDto? _selectedQuestion;

    /// <summary>
    /// Gets or sets the question service.
    /// </summary>
    [Inject]
    public QuestionService QuestionService { get; set; } = null!;

    /// <summary>
    /// Gets or sets the navigation service.
    /// </summary>
    [Inject]
    public NavigationManager Navigation { get; set; } = null!;

    /// <summary>
    /// Gets or sets the bank name parameter.
    /// </summary>
    [Parameter]
    public string? BankName { get; set; }

    /// <summary>
    /// Gets or sets the guild id.
    /// </summary>
    [Parameter]
    public string? GuildId { get; set; }

    /// <inheritdoc/>
    protected override async Task OnInitializedAsync()
    {
        if (BankName is null)
        {
            return;
        }

        if (GuildId is null)
        {
            return;
        }

        _questions = (await QuestionService.GetQuestionsAsync(GuildId, BankName)).ConvertAll(x => QuestionRequestDto.ToRequestDto(x));
    }

    private void AddNewQuestion()
    {
        _selectedQuestion = new QuestionRequestDto
        {
            BankName = BankName,
            Answers = [new AnswerDto()]
        };

        _questions.Add(_selectedQuestion);
    }

    private void DeleteQuestion()
    {
        if (_selectedQuestion != null)
        {
            _questions.Remove(_selectedQuestion);
            _selectedQuestion = null;
        }
    }

    private async Task HandleValidSubmit()
    {
        if (BankName is null)
        {
            return;
        }

        if (GuildId is null)
        {
            return;
        }

        if (_selectedQuestion != null && _validations != null)
        {
            var isValid = await _validations.ValidateAll();

            if (!isValid)
            {
                return;
            }

            var upsertResults = await QuestionService.UpsertQuestionsAsync(GuildId, [_selectedQuestion]);
            if (upsertResults.Any(result => !result.Success))
            {
                // Handle error
                var errorMessage = string.Join(", ", upsertResults.Where(result => !result.Success).Select(result => result.ErrorMessage));
                Console.Error.WriteLine($"Error upserting question: {errorMessage}");
            }
        }
    }
}
