import type { QuizContext } from "../types";

export function applyTransitionOnIncorrect(state: QuizContext): void {
  switch (state.answerTransition) {
    case "single_chance":
    case "endless_chance": {
      state.lastBuzzes = [...state.buzzes];
      state.buzzes = [];
      break;
    }
    default: {
      state.buzzes = state.buzzes.slice(1);
      if (state.buzzes.length === 0) {
        state.lastBuzzes = [];
      }
      break;
    }
  }
}
