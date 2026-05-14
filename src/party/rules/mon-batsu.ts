import type { Player, QuizContext } from "../types";

export function applyCorrectMonBatsu(
  state: QuizContext,
  answerer: Player,
): void {
  answerer.correctCount += 1;
  answerer.score = answerer.correctCount;
  if (answerer.correctCount >= state.winCount) {
    answerer.hasWon = true;
  }
}

export function applyIncorrectMonBatsu(
  state: QuizContext,
  answerer: Player,
): void {
  answerer.incorrectCount += 1;
  if (answerer.incorrectCount >= state.eliminateCount) {
    answerer.isEliminated = true;
    state.buzzes = state.buzzes.filter((b) => b.playerId !== answerer.id);
  }
}

export function refreshMonBatsu(state: QuizContext, player: Player): void {
  player.score = player.correctCount;
  player.hasWon = player.correctCount >= state.winCount;
  player.isEliminated = player.incorrectCount >= state.eliminateCount;
}
