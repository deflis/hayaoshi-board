import type { Player, QuizContext } from "../types";

export function applyCorrectSimple(
  _state: QuizContext,
  answerer: Player,
): void {
  answerer.correctCount += 1;
  answerer.score += 1;
}

export function applyIncorrectSimple(
  _state: QuizContext,
  _answerer: Player,
): void {
  // 誤答ペナルティなし
}
