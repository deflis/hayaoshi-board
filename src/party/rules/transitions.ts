import type { QuizContext } from "../types";

export function applyTransitionOnIncorrect(state: QuizContext): void {
  switch (state.answerTransition) {
    case "single_chance": {
      state.lastBuzzes = [...state.buzzes];
      state.buzzes = [];
      state.phase = "waiting";
      break;
    }
    case "endless_chance": {
      state.lastBuzzes = [...state.buzzes];
      state.buzzes = [];
      state.phase = "question";
      break;
    }
    case "second_chance": {
      state.buzzes = state.buzzes.slice(1);
      if (state.buzzes.length > 0) {
        state.phase = "buzzed";
      } else {
        state.lastBuzzes = [];
        state.phase = "waiting";
      }
      break;
    }
    default: {
      // all_order
      state.buzzes = state.buzzes.slice(1);
      if (state.buzzes.length > 0) {
        state.phase = "buzzed";
      } else {
        state.lastBuzzes = [];
        state.phase = "question";
      }
      break;
    }
  }
}
