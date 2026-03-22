import { useCallback, useEffect, useState } from "react";
import type { Answer, Question } from "@shared/index";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question | null;
  onSave: (question: Question) => void;
}

export function EditQuestionDialog({
  open,
  onOpenChange,
  question: initialQuestion,
  onSave,
}: EditQuestionDialogProps) {
  const [question, setQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (initialQuestion) {
      setQuestion({
        ...initialQuestion,
        answers: initialQuestion.answers.map((a) => ({ ...a })),
      });
    }
  }, [initialQuestion]);

  const handleAddAnswer = useCallback(() => {
    if (!question) return;
    const newAnswer: Answer = {
      answerId: crypto.randomUUID(),
      answer: "",
    };
    setQuestion({
      ...question,
      answers: [...question.answers, newAnswer],
    });
  }, [question]);

  const handleDeleteAnswer = useCallback(
    (answerId: string) => {
      if (!question) return;
      setQuestion({
        ...question,
        answers: question.answers.filter((a) => a.answerId !== answerId),
        correctAnswerId:
          question.correctAnswerId === answerId
            ? ""
            : question.correctAnswerId,
      });
    },
    [question],
  );

  const handleAnswerChange = useCallback(
    (answerId: string, value: string) => {
      if (!question) return;
      setQuestion({
        ...question,
        answers: question.answers.map((a) =>
          a.answerId === answerId ? { ...a, answer: value } : a,
        ),
      });
    },
    [question],
  );

  const handleAnswerImageChange = useCallback(
    (answerId: string, imageUrl: string) => {
      if (!question) return;
      setQuestion({
        ...question,
        answers: question.answers.map((a) =>
          a.answerId === answerId
            ? { ...a, imagePartitionKey: imageUrl || undefined }
            : a,
        ),
      });
    },
    [question],
  );

  if (!question) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Question Text */}
          <div className="grid gap-2">
            <Label>Question Text (Markdown)</Label>
            <div data-color-mode="light">
              <MDEditor
                value={question.question}
                onChange={(val) =>
                  setQuestion({ ...question, question: val ?? "" })
                }
                height={150}
              />
            </div>
          </div>

          {/* Answers */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>Answers</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddAnswer}
                disabled={question.answers.length >= 6}
              >
                Add Answer
              </Button>
            </div>
            {question.answers.map((answer, idx) => (
              <div key={answer.answerId} className="grid gap-1 p-2 border rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-6">
                    {idx + 1}.
                  </span>
                  <Input
                    value={answer.answer}
                    onChange={(e) =>
                      handleAnswerChange(answer.answerId, e.target.value)
                    }
                    placeholder={`Answer ${idx + 1}`}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAnswer(answer.answerId)}
                    disabled={question.answers.length <= 2}
                  >
                    Remove
                  </Button>
                </div>
                <div className="flex items-center gap-2 ml-8">
                  <Input
                    value={answer.imagePartitionKey ?? ""}
                    onChange={(e) =>
                      handleAnswerImageChange(answer.answerId, e.target.value)
                    }
                    placeholder="Answer image URL (optional)"
                    className="flex-1 text-sm"
                  />
                  {answer.imagePartitionKey && (
                    <img
                      src={answer.imagePartitionKey}
                      alt={`Answer ${idx + 1}`}
                      className="h-10 w-10 rounded border object-contain"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Correct Answer */}
          <div className="grid gap-2">
            <Label>Correct Answer</Label>
            <Select
              value={question.correctAnswerId}
              onValueChange={(val) =>
                setQuestion({ ...question, correctAnswerId: val ?? "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select correct answer" />
              </SelectTrigger>
              <SelectContent>
                {question.answers.map((a, idx) => (
                  <SelectItem key={a.answerId} value={a.answerId}>
                    {idx + 1}. {a.answer || "(empty)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show Time */}
          <div className="grid gap-2 max-w-xs">
            <Label>Show Time (seconds)</Label>
            <Input
              type="number"
              value={question.questionShowTimeMs / 1000}
              onChange={(e) =>
                setQuestion({
                  ...question,
                  questionShowTimeMs: Number(e.target.value) * 1000,
                })
              }
              min={1}
            />
          </div>

          {/* Image URL */}
          <div className="grid gap-2">
            <Label>Question Image URL (optional)</Label>
            <Input
              value={question.imagePartitionKey ?? ""}
              onChange={(e) =>
                setQuestion({
                  ...question,
                  imagePartitionKey: e.target.value || undefined,
                })
              }
              placeholder="https://..."
            />
            {question.imagePartitionKey && (
              <img
                src={question.imagePartitionKey}
                alt="Question"
                className="max-h-32 rounded border object-contain"
              />
            )}
          </div>

          {/* Explanation */}
          <div className="grid gap-2">
            <Label>Explanation (Markdown, optional)</Label>
            <div data-color-mode="light">
              <MDEditor
                value={question.explanation ?? ""}
                onChange={(val) =>
                  setQuestion({
                    ...question,
                    explanation: val ?? undefined,
                  })
                }
                height={120}
              />
            </div>
          </div>

          {/* Explanation Image */}
          <div className="grid gap-2">
            <Label>Explanation Image URL (optional)</Label>
            <Input
              value={question.explanationImagePartitionKey ?? ""}
              onChange={(e) =>
                setQuestion({
                  ...question,
                  explanationImagePartitionKey: e.target.value || undefined,
                })
              }
              placeholder="https://..."
            />
            {question.explanationImagePartitionKey && (
              <img
                src={question.explanationImagePartitionKey}
                alt="Explanation"
                className="max-h-32 rounded border object-contain"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(question)}
            disabled={
              !question.question ||
              !question.correctAnswerId ||
              question.answers.length < 2
            }
          >
            Save Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
