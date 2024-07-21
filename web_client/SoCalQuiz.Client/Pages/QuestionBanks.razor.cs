using Microsoft.AspNetCore.Components;
using SoCal.Quiz.QuestionEditor.Service;

namespace SoCal.Quiz.QuestionEditor.Pages;

/// <summary>
/// A view for the question banks.
/// </summary>
public partial class QuestionBanks
{
    private List<string> _questionBanks = [];

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

        _questionBanks = await QuestionService.GetQuestionBankNamesAsync(GuildId).ConfigureAwait(false) ?? [];
    }

    private void NavigateToAddQuestionBank()
    {
        Navigation.NavigateTo($"/addquestionbank/{GuildId}");
    }

    private void NavigateToEditQuestionBank(string bankName)
    {
        Navigation.NavigateTo($"/editquestionbank/{GuildId}/{bankName}");
    }
}
