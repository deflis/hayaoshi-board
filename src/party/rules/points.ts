import type { Player, RoomState } from "../types";

export function applyCorrectPoints(state: RoomState, answerer: Player): void {
  answerer.correctCount += 1;
  answerer.score += state.addPoints;
  if (state.nonBuzzerPoints > 0) {
    const buzzedIds = new Set(state.buzzes.map((b) => b.playerId));
    for (const p of Object.values(state.players)) {
      if (!buzzedIds.has(p.id) && !p.isEliminated && !p.hasWon) {
        p.score += state.nonBuzzerPoints;
      }
    }
  }
  if (answerer.score >= state.winPoints) {
    answerer.hasWon = true;
  }
}

export function applyIncorrectPoints(state: RoomState, answerer: Player): void {
  answerer.incorrectCount += 1;
  answerer.score -= state.subtractPoints;
  if (
    state.eliminatePoints !== null &&
    answerer.score <= state.eliminatePoints
  ) {
    answerer.isEliminated = true;
    state.buzzes = state.buzzes.filter((b) => b.playerId !== answerer.id);
  }
}

export function refreshPoints(state: RoomState, player: Player): void {
  player.hasWon = player.score >= state.winPoints;
  player.isEliminated =
    state.eliminatePoints !== null && player.score <= state.eliminatePoints;
}
