import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useDeleteQuestionBank, useQuestionBankNames } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function QuestionBanksPage() {
  const { guildId: rawGuildId } = useParams<{ guildId: string }>();
  const guildId = rawGuildId ?? "";
  const navigate = useNavigate();
  const { data: bankNames, isLoading, error } = useQuestionBankNames(guildId);
  const deleteMutation = useDeleteQuestionBank(guildId);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading question banks...</p>;
  }

  if (error) {
    return <p className="text-destructive">Failed to load: {error.message}</p>;
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
            <BreadcrumbPage>Question Banks</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Question Banks</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => void navigate(`/guilds/${guildId}/settings`)}
          >
            Settings
          </Button>
          <Button
            onClick={() =>
              void navigate(`/guilds/${guildId}/banks/__new__`)
            }
          >
            Add Bank
          </Button>
        </div>
      </div>

      {!bankNames?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No question banks yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {bankNames.map((name) => (
            <Card key={name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                <CardTitle className="text-base font-medium">{name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void navigate(
                        `/guilds/${guildId}/banks/${encodeURIComponent(name)}`,
                      )
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(name)}
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this question bank and all its
              questions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
