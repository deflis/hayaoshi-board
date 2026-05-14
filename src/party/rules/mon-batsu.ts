import type { Player, RoomState } from "../types";

export function applyCorrectMonBatsu(state: RoomState, answerer: Player): void {
  answerer.correctCount += 1;
  answerer.score = answerer.correctCount;
  if (answerer.correctCount >= state.winCount) {
    answerer.hasWon = true;
  }
}

export function applyIncorrectMonBatsu(
  state: RoomState,
  answerer: Player,
): void {
  answerer.incorrectCount += 1;
  if (answerer.incorrectCount >= state.eliminateCount) {
    answerer.isEliminated = true;
    state.buzzes = state.buzzes.filter((b) => b.playerId !== answerer.id);
  }
}

export function refreshMonBatsu(state: RoomState, player: Player): void {
  player.score = player.correctCount;
  player.hasWon = player.correctCount >= state.winCount;
  player.isEliminated = player.incorrectCount >= state.eliminateCount;
}
