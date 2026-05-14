import type { Player, RoomState } from "../types";

export function applyCorrectSimple(_state: RoomState, answerer: Player): void {
  answerer.correctCount += 1;
  answerer.score += 1;
}

export function applyIncorrectSimple(
  _state: RoomState,
  _answerer: Player,
): void {
  // 誤答ペナルティなし
}
