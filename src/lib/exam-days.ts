export const QUESTION_DAYS = ["Day 1", "Day 2", "Day 3", "Day 4"] as const;
export const TRAINING_DAYS = [...QUESTION_DAYS, "Day 5"] as const;

export type QuestionDay = (typeof QUESTION_DAYS)[number];

export function isQuestionDay(day: string): day is QuestionDay {
  return (QUESTION_DAYS as readonly string[]).includes(day);
}
