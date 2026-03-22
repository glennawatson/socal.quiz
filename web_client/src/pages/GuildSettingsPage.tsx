import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { useGuildConfig, useUpsertGuildConfig } from "@/api/hooks";
import type {
  GuildQuizConfig,
  InterQuestionMessage,
} from "@shared/index";
import { defaultQuizConfig } from "@shared/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GuildSettingsPage() {
  const { guildId: rawGuildId } = useParams<{ guildId: string }>();
  const guildId = rawGuildId ?? "";
  const { data: existingConfig, isLoading } = useGuildConfig(guildId);
  const upsertMutation = useUpsertGuildConfig(guildId);

  const [advanceMode, setAdvanceMode] = useState<string>(
    defaultQuizConfig.advanceMode,
  );
  const [defaultTimerSeconds, setDefaultTimerSeconds] = useState(
    defaultQuizConfig.defaultQuestionShowTimeMs / 1000,
  );
  const [summaryDurationSeconds, setSummaryDurationSeconds] = useState(
    defaultQuizConfig.summaryDurationMs / 1000,
  );
  const [interQuestionMessages, setInterQuestionMessages] = useState<
    InterQuestionMessage[]
  >([]);
  const [soundboardEnabled, setSoundboardEnabled] = useState(false);
  const [soundboardVoiceChannelId, setSoundboardVoiceChannelId] = useState("");

  useEffect(() => {
    if (existingConfig) {
      setAdvanceMode(
        existingConfig.advanceMode ?? defaultQuizConfig.advanceMode,
      );
      setDefaultTimerSeconds(
        (existingConfig.defaultQuestionShowTimeMs ??
          defaultQuizConfig.defaultQuestionShowTimeMs) / 1000,
      );
      setSummaryDurationSeconds(
        (existingConfig.summaryDurationMs ??
          defaultQuizConfig.summaryDurationMs) / 1000,
      );
      setInterQuestionMessages(
        existingConfig.interQuestionMessages ??
          defaultQuizConfig.interQuestionMessages,
      );
      setSoundboardEnabled(
        existingConfig.soundboardEnabled ??
          defaultQuizConfig.soundboardEnabled,
      );
      setSoundboardVoiceChannelId(
        existingConfig.soundboardVoiceChannelId ??
          defaultQuizConfig.soundboardVoiceChannelId,
      );
    }
  }, [existingConfig]);

  const handleSave = useCallback(() => {
    const config: GuildQuizConfig = {
      guildId,
      scope: "default",
      advanceMode: advanceMode as GuildQuizConfig["advanceMode"],
      defaultQuestionShowTimeMs: defaultTimerSeconds * 1000,
      summaryDurationMs: summaryDurationSeconds * 1000,
      interQuestionMessages,
      soundboardEnabled,
      soundboardVoiceChannelId,
    };
    upsertMutation.mutate(config);
  }, [
    guildId,
    advanceMode,
    defaultTimerSeconds,
    summaryDurationSeconds,
    interQuestionMessages,
    soundboardEnabled,
    soundboardVoiceChannelId,
    upsertMutation,
  ]);

  const handleAddMessage = useCallback(() => {
    setInterQuestionMessages((prev) => [
      ...prev,
      { messageId: crypto.randomUUID(), content: "" },
    ]);
  }, []);

  const handleUpdateMessage = useCallback(
    (messageId: string, content: string) => {
      setInterQuestionMessages((prev) =>
        prev.map((m) => (m.messageId === messageId ? { ...m, content } : m)),
      );
    },
    [],
  );

  const handleUpdateMessageImage = useCallback(
    (messageId: string, imageUrl: string) => {
      setInterQuestionMessages((prev) =>
        prev.map((m) =>
          m.messageId === messageId
            ? { ...m, imageUrl: imageUrl || undefined }
            : m,
        ),
      );
    },
    [],
  );

  const handleRemoveMessage = useCallback((messageId: string) => {
    setInterQuestionMessages((prev) =>
      prev.filter((m) => m.messageId !== messageId),
    );
  }, []);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading settings...</p>;
  }

  return (
    <div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Servers</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/guilds/${guildId}/banks`}>
              Question Banks
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-2xl font-bold mb-6">Server Quiz Settings</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quiz Behavior</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="advanceMode">Advance Mode</Label>
              <Select value={advanceMode} onValueChange={(value) => { if (value) setAdvanceMode(value); }}>
                <SelectTrigger id="advanceMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    Auto (advance after timer)
                  </SelectItem>
                  <SelectItem value="manual">
                    Manual (admin advances)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="defaultTimer">
                Default Question Timer (seconds)
              </Label>
              <Input
                id="defaultTimer"
                type="number"
                min={5}
                max={300}
                value={defaultTimerSeconds}
                onChange={(e) =>
                  setDefaultTimerSeconds(Number(e.target.value))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="summaryDuration">
                Summary Duration (seconds)
              </Label>
              <Input
                id="summaryDuration"
                type="number"
                min={1}
                max={60}
                value={summaryDurationSeconds}
                onChange={(e) =>
                  setSummaryDurationSeconds(Number(e.target.value))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inter-Question Messages</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Messages displayed between quiz questions. They cycle
              round-robin.
            </p>
            {interQuestionMessages.map((msg, idx) => (
              <div
                key={msg.messageId}
                className="grid gap-2 p-3 border rounded"
              >
                <div className="flex items-center justify-between">
                  <Label>Message {idx + 1}</Label>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveMessage(msg.messageId)}
                  >
                    Remove
                  </Button>
                </div>
                <Textarea
                  placeholder="Message content (Markdown supported)"
                  value={msg.content}
                  onChange={(e) =>
                    handleUpdateMessage(msg.messageId, e.target.value)
                  }
                  rows={3}
                />
                <Input
                  placeholder="Image URL (optional)"
                  value={msg.imageUrl ?? ""}
                  onChange={(e) =>
                    handleUpdateMessageImage(msg.messageId, e.target.value)
                  }
                />
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Preview"
                    className="max-h-24 object-contain"
                  />
                )}
              </div>
            ))}
            <Button variant="outline" onClick={handleAddMessage}>
              Add Message
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Soundboard</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 max-w-md">
            <div className="flex items-center gap-2">
              <input
                id="soundboardEnabled"
                type="checkbox"
                checked={soundboardEnabled}
                onChange={(e) => setSoundboardEnabled(e.target.checked)}
              />
              <Label htmlFor="soundboardEnabled">
                Enable soundboard between questions
              </Label>
            </div>
            {soundboardEnabled && (
              <div className="grid gap-2">
                <Label htmlFor="voiceChannel">Voice Channel ID</Label>
                <Input
                  id="voiceChannel"
                  placeholder="Discord voice channel ID"
                  value={soundboardVoiceChannelId}
                  onChange={(e) =>
                    setSoundboardVoiceChannelId(e.target.value)
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={upsertMutation.isPending}
          >
            {upsertMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {upsertMutation.isError && (
          <p className="text-destructive">
            Save failed: {upsertMutation.error.message}
          </p>
        )}

        {upsertMutation.isSuccess && (
          <p className="text-green-600">Settings saved successfully.</p>
        )}
      </div>
    </div>
  );
}
