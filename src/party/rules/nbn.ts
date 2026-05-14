import type { Player, RoomState } from "../types";

export function applyCorrectNbn(state: RoomState, answerer: Player): void {
  answerer.correctCount += 1;
  answerer.score = answerer.correctCount;
  if (
    answerer.correctCount >= state.nbyN &&
    answerer.incorrectCount < state.nbyN
  ) {
    answerer.hasWon = true;
  }
}

export function applyIncorrectNbn(state: RoomState, answerer: Player): void {
  answerer.incorrectCount += 1;
  if (answerer.incorrectCount >= state.nbyN) {
    answerer.isEliminated = true;
    state.buzzes = state.buzzes.filter((b) => b.playerId !== answerer.id);
  }
}

export function refreshNbn(state: RoomState, player: Player): void {
  player.score = player.correctCount;
  player.hasWon =
    player.correctCount >= state.nbyN && player.incorrectCount < state.nbyN;
  player.isEliminated = player.incorrectCount >= state.nbyN;
}
