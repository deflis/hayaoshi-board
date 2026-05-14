import { describe, expect, it } from "bun:test";
import type { Player, RoomState } from "../types";
import {
  applyCorrectByRule,
  applyIncorrectByRule,
  refreshOutcomeByRule,
} from "./index";
import {
  applyCorrectMonBatsu,
  applyIncorrectMonBatsu,
  refreshMonBatsu,
} from "./mon-batsu";
import { applyCorrectMonKyu, applyIncorrectMonKyu } from "./mon-kyu";
import { applyCorrectNbn, applyIncorrectNbn, refreshNbn } from "./nbn";
import {
  applyCorrectPoints,
  applyIncorrectPoints,
  refreshPoints,
} from "./points";
import { applyCorrectSimple, applyIncorrectSimple } from "./simple";
import { applyTransitionOnIncorrect } from "./transitions";

function makeRoom(overrides?: Partial<RoomState>): RoomState {
  return {
    roomId: "test-room",
    phase: "question",
    hostId: "host",
    players: {},
    currentQuestionIndex: 1,
    totalQuestions: 10,
    buzzes: [],
    lastBuzzes: [],
    chatMessages: [],
    ruleType: "simple",
    answerTransition: "all_order",
    winCount: 7,
    eliminateCount: 3,
    nbyN: 5,
    addPoints: 1,
    subtractPoints: 1,
    winPoints: 7,
    eliminatePoints: null,
    nonBuzzerPoints: 0,
    ...overrides,
  } as RoomState;
}

function makePlayer(overrides?: Partial<Player>): Player {
  return {
    id: "p1",
    name: "Player",
    score: 0,
    role: "player",
    correctCount: 0,
    incorrectCount: 0,
    isEliminated: false,
    hasWon: false,
    suspendedUntilQuestion: 0,
    ...overrides,
  };
}

// ---- simple ----
describe("simple", () => {
  it("correct adds 1 to score and correctCount", () => {
    const state = makeRoom();
    const player = makePlayer();
    applyCorrectSimple(state, player);
    expect(player.correctCount).toBe(1);
    expect(player.score).toBe(1);
  });

  it("incorrect does nothing", () => {
    const state = makeRoom();
    const player = makePlayer();
    applyIncorrectSimple(state, player);
    expect(player.incorrectCount).toBe(0);
    expect(player.score).toBe(0);
  });
});

// ---- mon_batsu ----
describe("mon_batsu", () => {
  it("correct increases score and sets hasWon at winCount", () => {
    const state = makeRoom({ ruleType: "mon_batsu", winCount: 2 });
    const player = makePlayer({ correctCount: 1 });
    applyCorrectMonBatsu(state, player);
    expect(player.correctCount).toBe(2);
    expect(player.score).toBe(2);
    expect(player.hasWon).toBe(true);
  });

  it("incorrect eliminates at eliminateCount", () => {
    const state = makeRoom({ ruleType: "mon_batsu", eliminateCount: 2 });
    const player = makePlayer({ incorrectCount: 1 });
    state.buzzes = [{ playerId: "p1", buzzedAt: 0 }];
    applyIncorrectMonBatsu(state, player);
    expect(player.incorrectCount).toBe(2);
    expect(player.isEliminated).toBe(true);
    expect(state.buzzes).toEqual([]);
  });

  it("refresh resets hasWon and isEliminated", () => {
    const state = makeRoom({
      ruleType: "mon_batsu",
      winCount: 3,
      eliminateCount: 3,
    });
    const player = makePlayer({ correctCount: 3, incorrectCount: 3 });
    refreshMonBatsu(state, player);
    expect(player.hasWon).toBe(true);
    expect(player.isEliminated).toBe(true);
  });
});

// ---- mon_kyu ----
describe("mon_kyu", () => {
  it("correct increases score and sets hasWon", () => {
    const state = makeRoom({ ruleType: "mon_kyu", winCount: 2 });
    const player = makePlayer({ correctCount: 1 });
    applyCorrectMonKyu(state, player);
    expect(player.correctCount).toBe(2);
    expect(player.score).toBe(2);
    expect(player.hasWon).toBe(true);
  });

  it("incorrect sets suspendedUntilQuestion", () => {
    const state = makeRoom({
      ruleType: "mon_kyu",
      currentQuestionIndex: 3,
      eliminateCount: 2,
    });
    const player = makePlayer();
    applyIncorrectMonKyu(state, player);
    expect(player.suspendedUntilQuestion).toBe(5);
  });
});

// ---- nbn ----
describe("nbn", () => {
  it("correct wins only if correctCount >= nbyN and incorrectCount < nbyN", () => {
    const state = makeRoom({ ruleType: "nbn", nbyN: 3 });
    const player = makePlayer({ correctCount: 2, incorrectCount: 1 });
    applyCorrectNbn(state, player);
    expect(player.correctCount).toBe(3);
    expect(player.hasWon).toBe(true);
  });

  it("correct does not win if incorrectCount already >= nbyN", () => {
    const state = makeRoom({ ruleType: "nbn", nbyN: 3 });
    const player = makePlayer({ correctCount: 2, incorrectCount: 3 });
    applyCorrectNbn(state, player);
    expect(player.correctCount).toBe(3);
    expect(player.hasWon).toBe(false);
  });

  it("incorrect eliminates at nbyN", () => {
    const state = makeRoom({ ruleType: "nbn", nbyN: 2 });
    const player = makePlayer({ incorrectCount: 1 });
    state.buzzes = [{ playerId: "p1", buzzedAt: 0 }];
    applyIncorrectNbn(state, player);
    expect(player.incorrectCount).toBe(2);
    expect(player.isEliminated).toBe(true);
    expect(state.buzzes).toEqual([]);
  });

  it("refresh respects nbyN boundary", () => {
    const state = makeRoom({ ruleType: "nbn", nbyN: 2 });
    const player = makePlayer({ correctCount: 2, incorrectCount: 2 });
    refreshNbn(state, player);
    expect(player.hasWon).toBe(false);
    expect(player.isEliminated).toBe(true);
  });
});

// ---- points ----
describe("points", () => {
  it("correct adds addPoints to score", () => {
    const state = makeRoom({ ruleType: "points", addPoints: 3, winPoints: 5 });
    const player = makePlayer({ score: 1 });
    applyCorrectPoints(state, player);
    expect(player.score).toBe(4);
    expect(player.hasWon).toBe(false);
  });

  it("correct sets hasWon at winPoints", () => {
    const state = makeRoom({ ruleType: "points", addPoints: 2, winPoints: 5 });
    const player = makePlayer({ score: 3 });
    applyCorrectPoints(state, player);
    expect(player.score).toBe(5);
    expect(player.hasWon).toBe(true);
  });

  it("correct awards nonBuzzerPoints to others", () => {
    const state = makeRoom({
      ruleType: "points",
      addPoints: 1,
      nonBuzzerPoints: 1,
    });
    state.players = {
      p1: makePlayer({ id: "p1", score: 0 }),
      p2: makePlayer({ id: "p2", score: 0 }),
    };
    state.buzzes = [{ playerId: "p1", buzzedAt: 0 }];
    applyCorrectPoints(state, state.players.p1);
    expect(state.players.p1.score).toBe(1);
    expect(state.players.p2.score).toBe(1);
  });

  it("incorrect subtracts and eliminates at eliminatePoints", () => {
    const state = makeRoom({
      ruleType: "points",
      subtractPoints: 3,
      eliminatePoints: 0,
    });
    const player = makePlayer({ score: 2 });
    state.buzzes = [{ playerId: "p1", buzzedAt: 0 }];
    applyIncorrectPoints(state, player);
    expect(player.score).toBe(-1);
    expect(player.isEliminated).toBe(true);
    expect(state.buzzes).toEqual([]);
  });

  it("refresh respects eliminatePoints", () => {
    const state = makeRoom({
      ruleType: "points",
      winPoints: 10,
      eliminatePoints: 0,
    });
    const player = makePlayer({ score: 0 });
    refreshPoints(state, player);
    expect(player.hasWon).toBe(false);
    expect(player.isEliminated).toBe(true);
  });
});

// ---- transitions ----
describe("transitions", () => {
  it("single_chance clears buzzes and saves lastBuzzes", () => {
    const state = makeRoom({ answerTransition: "single_chance" });
    state.buzzes = [{ playerId: "p1", buzzedAt: 1 }];
    applyTransitionOnIncorrect(state);
    expect(state.buzzes).toEqual([]);
    expect(state.lastBuzzes).toEqual([{ playerId: "p1", buzzedAt: 1 }]);
  });

  it("endless_chance clears buzzes and saves lastBuzzes", () => {
    const state = makeRoom({ answerTransition: "endless_chance" });
    state.buzzes = [{ playerId: "p1", buzzedAt: 1 }];
    applyTransitionOnIncorrect(state);
    expect(state.buzzes).toEqual([]);
    expect(state.lastBuzzes).toEqual([{ playerId: "p1", buzzedAt: 1 }]);
  });

  it("second_chance with remaining buzzes shifts buzzes", () => {
    const state = makeRoom({ answerTransition: "second_chance" });
    state.buzzes = [
      { playerId: "p1", buzzedAt: 1 },
      { playerId: "p2", buzzedAt: 2 },
    ];
    applyTransitionOnIncorrect(state);
    expect(state.buzzes).toEqual([{ playerId: "p2", buzzedAt: 2 }]);
  });

  it("second_chance with no remaining buzzes clears lastBuzzes", () => {
    const state = makeRoom({ answerTransition: "second_chance" });
    state.buzzes = [{ playerId: "p1", buzzedAt: 1 }];
    applyTransitionOnIncorrect(state);
    expect(state.buzzes).toEqual([]);
    expect(state.lastBuzzes).toEqual([]);
  });

  it("all_order with remaining buzzes shifts buzzes", () => {
    const state = makeRoom({ answerTransition: "all_order" });
    state.buzzes = [
      { playerId: "p1", buzzedAt: 1 },
      { playerId: "p2", buzzedAt: 2 },
    ];
    applyTransitionOnIncorrect(state);
    expect(state.buzzes).toEqual([{ playerId: "p2", buzzedAt: 2 }]);
  });

  it("all_order with no remaining buzzes clears lastBuzzes", () => {
    const state = makeRoom({ answerTransition: "all_order" });
    state.buzzes = [{ playerId: "p1", buzzedAt: 1 }];
    applyTransitionOnIncorrect(state);
    expect(state.buzzes).toEqual([]);
    expect(state.lastBuzzes).toEqual([]);
  });
});

// ---- dispatcher ----
describe("dispatcher", () => {
  it("dispatches correct rule", () => {
    const state = makeRoom({ ruleType: "points" });
    const player = makePlayer({ score: 0 });
    applyCorrectByRule(state, player);
    expect(player.score).toBe(1);
  });

  it("dispatches incorrect rule", () => {
    const state = makeRoom({ ruleType: "mon_batsu", eliminateCount: 1 });
    const player = makePlayer();
    state.buzzes = [{ playerId: "p1", buzzedAt: 0 }];
    applyIncorrectByRule(state, player);
    expect(player.isEliminated).toBe(true);
  });

  it("refresh resets outcomes", () => {
    const state = makeRoom({
      ruleType: "points",
      winPoints: 5,
      eliminatePoints: -5,
    });
    const player = makePlayer({ score: 6 });
    refreshOutcomeByRule(state, player);
    expect(player.hasWon).toBe(true);
    expect(player.isEliminated).toBe(false);
  });
});
