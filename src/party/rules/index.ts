import type { Player, QuizContext } from "../types";
import {
  applyCorrectMonBatsu,
  applyIncorrectMonBatsu,
  refreshMonBatsu,
} from "./mon-batsu";
import {
  applyCorrectMonKyu,
  applyIncorrectMonKyu,
  refreshMonKyu,
} from "./mon-kyu";
import { applyCorrectNbn, applyIncorrectNbn, refreshNbn } from "./nbn";
import {
  applyCorrectPoints,
  applyIncorrectPoints,
  refreshPoints,
} from "./points";
import { applyCorrectSimple, applyIncorrectSimple } from "./simple";

export function applyCorrectByRule(state: QuizContext, player: Player): void {
  switch (state.ruleType) {
    case "simple":
      applyCorrectSimple(state, player);
      break;
    case "mon_batsu":
      applyCorrectMonBatsu(state, player);
      break;
    case "mon_kyu":
      applyCorrectMonKyu(state, player);
      break;
    case "nbn":
      applyCorrectNbn(state, player);
      break;
    case "points":
      applyCorrectPoints(state, player);
      break;
  }
}

export function applyIncorrectByRule(state: QuizContext, player: Player): void {
  switch (state.ruleType) {
    case "simple":
      applyIncorrectSimple(state, player);
      break;
    case "mon_batsu":
      applyIncorrectMonBatsu(state, player);
      break;
    case "mon_kyu":
      applyIncorrectMonKyu(state, player);
      break;
    case "nbn":
      applyIncorrectNbn(state, player);
      break;
    case "points":
      applyIncorrectPoints(state, player);
      break;
  }
}

export function refreshOutcomeByRule(state: QuizContext, player: Player): void {
  player.hasWon = false;
  player.isEliminated = false;
  switch (state.ruleType) {
    case "simple":
      // simple では hasWon/isEliminated を使わない
      break;
    case "mon_batsu":
      refreshMonBatsu(state, player);
      break;
    case "mon_kyu":
      refreshMonKyu(state, player);
      break;
    case "nbn":
      refreshNbn(state, player);
      break;
    case "points":
      refreshPoints(state, player);
      break;
  }
}
