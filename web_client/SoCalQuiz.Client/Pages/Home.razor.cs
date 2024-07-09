using Microsoft.AspNetCore.Components;

using SoCal.Quiz.QuestionEditor.Service;
using SoCal.Quiz.QuestionEditor.Service.DTOs;

namespace SoCal.Quiz.QuestionEditor.Pages;

/// <summary>
/// The main home page.
/// </summary>
public partial class Home
{
    private IQueryable<GuildDto> _guilds = new List<GuildDto>().AsQueryable();

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

    /// <inheritdoc/>
    protected override async Task OnInitializedAsync()
    {
        _guilds = ((await QuestionService.GetCurrentUserGuilds()) ?? []).AsQueryable();
    }

    private void NavigateToQuestionBanks(GuildDto? selectedGuild)
    {
        if (selectedGuild is null)
        {
            return;
        }

        Navigation.NavigateTo($"/questionBanks/{selectedGuild.Id}");
    }
}
