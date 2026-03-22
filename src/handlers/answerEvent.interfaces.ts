/** Data payload for a user's answer to a quiz question. */
export interface AnswerEvent {
  userId: string;
  selectedAnswerId: string;
}

/**
 * Type guard that validates an unknown value is an AnswerEvent.
 *
 * @param event - The value to check.
 * @returns True if the value is an AnswerEvent.
 */
export function isAnswerEvent(event: unknown): event is AnswerEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    typeof (event as AnswerEvent).userId === "string" &&
    typeof (event as AnswerEvent).selectedAnswerId === "string"
  );
}
