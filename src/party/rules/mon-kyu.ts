import type { Player, RoomState } from "../types";

export function applyCorrectMonKyu(state: RoomState, answerer: Player): void {
  answerer.correctCount += 1;
  answerer.score = answerer.correctCount;
  if (answerer.correctCount >= state.winCount) {
    answerer.hasWon = true;
  }
}

export function applyIncorrectMonKyu(state: RoomState, answerer: Player): void {
  answerer.incorrectCount += 1;
  answerer.suspendedUntilQuestion =
    state.currentQuestionIndex + state.eliminateCount;
}

export function refreshMonKyu(state: RoomState, player: Player): void {
  player.score = player.correctCount;
  player.hasWon = player.correctCount >= state.winCount;
  // isEliminated は mon_kyu では使わない
}
