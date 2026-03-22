export interface AnswerEvent {
  userId: string;
  selectedAnswerId: string;
}

export function isAnswerEvent(event: unknown): event is AnswerEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    typeof (event as AnswerEvent).userId === "string" &&
    typeof (event as AnswerEvent).selectedAnswerId === "string"
  );
}
