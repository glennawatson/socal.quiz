export interface AnswerEvent {
    userId : string,
    selectedAnswerId: string
}

export function isAnswerEvent(event: any): event is AnswerEvent {
    return event && typeof event.userId === 'string' && typeof event.selectedAnswerId === 'string';
}