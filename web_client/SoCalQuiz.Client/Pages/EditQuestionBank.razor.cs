using Microsoft.AspNetCore.Components;
using SoCal.Quiz.QuestionEditor.Service;
using SoCal.Quiz.QuestionEditor.Service.DTOs;

namespace SoCal.Quiz.QuestionEditor.Pages;

/// <summary>
/// The question bank.
/// </summary>
public partial class EditQuestionBank
{
    private QuestionBankRequestDto _questionBankRequestDto = new();
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
        if (GuildId is null)
        {
            return;
        }

        if (BankName is null)
        {
            _questionBankRequestDto = new() { GuildId = GuildId };
            return;
        }

        _questionBankRequestDto = (await QuestionService.GetQuestionBankAsync(GuildId, BankName).ConfigureAwait(false)) ?? new() { GuildId = GuildId };
    }

    private void AddNewQuestion()
    {
        var newQuestion = new QuestionRequestDto
        {
        };

        _questionBankRequestDto.Questions.Add(newQuestion);

        StateHasChanged();
    }

    private void DeleteQuestion(QuestionRequestDto? question)
    {
        if (question != null)
        {
            _questionBankRequestDto.Questions.Remove(question);
        }

        StateHasChanged();
    }

    private void Cancel()
    {
        Navigation?.NavigateTo("/");
    }

    private async Task HandleValidSubmit(QuestionBankRequestDto? request)
    {
        if (request is null)
        {
            return;
        }

        var upsertResults = await QuestionService.UpsertQuestionBankAsync(_questionBankRequestDto.GuildId, _questionBankRequestDto);
        if (upsertResults?.Any(result => !result.Success) == true)
        {
            // Handle error
            var errorMessage = string.Join(", ", upsertResults.Where(result => !result.Success).Select(result => result.ErrorMessage));
            Console.Error.WriteLine($"Error upserting question: {errorMessage}");
        }
    }
}
