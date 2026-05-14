import type { Player, QuizContext } from "../types";

export function applyCorrectMonKyu(state: QuizContext, answerer: Player): void {
  answerer.correctCount += 1;
  answerer.score = answerer.correctCount;
  if (answerer.correctCount >= state.winCount) {
    answerer.hasWon = true;
  }
}

export function applyIncorrectMonKyu(
  state: QuizContext,
  answerer: Player,
): void {
  answerer.incorrectCount += 1;
  answerer.suspendedUntilQuestion =
    state.currentQuestionIndex + state.eliminateCount;
}

export function refreshMonKyu(state: QuizContext, player: Player): void {
  player.score = player.correctCount;
  player.hasWon = player.correctCount >= state.winCount;
  // isEliminated は mon_kyu では使わない
}
