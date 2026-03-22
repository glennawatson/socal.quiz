import { useNavigate } from "react-router";
import { useGuilds } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function GuildsPage() {
  const { data: guilds, isLoading, error } = useGuilds();
  const navigate = useNavigate();

  if (isLoading) {
    return <p className="text-muted-foreground">Loading guilds...</p>;
  }

  if (error) {
    return <p className="text-destructive">Failed to load guilds: {error.message}</p>;
  }

  if (!guilds?.length) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No guilds found</h2>
        <p className="text-muted-foreground">
          The bot must be added to a server you have access to.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Your Servers</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guilds.map((guild) => (
          <Card key={guild.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                {guild.icon ? (
                  <img
                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=48`}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {guild.name.charAt(0)}
                  </div>
                )}
                <div>
                  <CardTitle className="text-base">{guild.name}</CardTitle>
                  <CardDescription className="text-xs">{guild.id}</CardDescription>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => void navigate(`/guilds/${guild.id}/banks`)}
              >
                Manage
              </Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
