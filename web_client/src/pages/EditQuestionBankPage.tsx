import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuestionBank, useUpsertQuestionBank } from "@/api/hooks";
import type { Question, QuestionBankRequestBody } from "@shared/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditQuestionDialog } from "@/components/EditQuestionDialog";

export function EditQuestionBankPage() {
  const { guildId, bankName: routeBankName } = useParams<{
    guildId: string;
    bankName: string;
  }>();
  const navigate = useNavigate();
  const isNew = routeBankName === "__new__";

  const { data: existingBank, isLoading } = useQuestionBank(
    guildId!,
    isNew ? "" : routeBankName!,
  );

  const upsertMutation = useUpsertQuestionBank(guildId!);

  const [bankName, setBankName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (existingBank && !isNew) {
      setBankName(existingBank.name);
      setQuestions(existingBank.questions);
    }
  }, [existingBank, isNew]);

  const handleSave = useCallback(() => {
    const body: QuestionBankRequestBody = {
      name: bankName,
      guildId: guildId!,
      questions: questions.map((q) => ({ ...q })),
    };
    upsertMutation.mutate(body, {
      onSuccess: () => {
        void navigate(`/guilds/${guildId}/banks`);
      },
    });
  }, [bankName, guildId, questions, upsertMutation, navigate]);

  const handleAddQuestion = useCallback(() => {
    const newQuestion: Question = {
      questionId: crypto.randomUUID(),
      question: "",
      answers: [
        { answerId: crypto.randomUUID(), answer: "" },
        { answerId: crypto.randomUUID(), answer: "" },
      ],
      correctAnswerId: "",
      questionShowTimeMs: 10000,
    };
    setEditingQuestion(newQuestion);
    setIsDialogOpen(true);
  }, []);

  const handleEditQuestion = useCallback((q: Question) => {
    setEditingQuestion({ ...q, answers: q.answers.map((a) => ({ ...a })) });
    setIsDialogOpen(true);
  }, []);

  const handleSaveQuestion = useCallback(
    (updated: Question) => {
      setQuestions((prev) => {
        const idx = prev.findIndex((q) => q.questionId === updated.questionId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
      setIsDialogOpen(false);
      setEditingQuestion(null);
    },
    [],
  );

  const handleDeleteQuestion = useCallback((questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.questionId !== questionId));
  }, []);

  if (isLoading && !isNew) {
    return <p className="text-muted-foreground">Loading...</p>;
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
            <BreadcrumbPage>
              {isNew ? "New Bank" : bankName}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{isNew ? "Create Question Bank" : "Edit Question Bank"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Enter bank name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Questions ({questions.length})
        </h2>
        <Button onClick={handleAddQuestion}>Add Question</Button>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No questions yet. Add one to get started.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead className="w-24">Answers</TableHead>
                <TableHead className="w-24">Time (s)</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((q) => (
                <TableRow key={q.questionId}>
                  <TableCell className="font-medium truncate max-w-xs">
                    {q.question || "(empty)"}
                  </TableCell>
                  <TableCell>{q.answers.length}</TableCell>
                  <TableCell>{q.questionShowTimeMs / 1000}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditQuestion(q)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteQuestion(q.questionId)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <div className="flex gap-3 mt-6">
        <Button
          onClick={handleSave}
          disabled={!bankName || upsertMutation.isPending}
        >
          {upsertMutation.isPending ? "Saving..." : "Save Bank"}
        </Button>
        <Button
          variant="outline"
          onClick={() => void navigate(`/guilds/${guildId}/banks`)}
        >
          Cancel
        </Button>
      </div>

      {upsertMutation.isError && (
        <p className="text-destructive mt-2">
          Save failed: {upsertMutation.error.message}
        </p>
      )}

      <EditQuestionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        question={editingQuestion}
        onSave={handleSaveQuestion}
      />
    </div>
  );
}
