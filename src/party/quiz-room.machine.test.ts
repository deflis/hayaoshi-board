import { describe, expect, it } from "bun:test";
import { createActor } from "xstate";
import { getRoomState, quizRoomMachine } from "./quiz-room.machine";
import type { QuizContext } from "./types";

function makeContext(overrides?: Partial<QuizContext>): QuizContext {
  return {
    roomId: "test-room",
    phase: "lobby",
    hostId: null,
    players: {},
    currentQuestionIndex: 0,
    totalQuestions: 10,
    buzzes: [],
    lastBuzzes: [],
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
    maxWinners: 0,
    boardEnabled: false,
    ...overrides,
  };
}

function createAndStartActor(ctx?: QuizContext) {
  const actor = createActor(quizRoomMachine, {
    input: ctx ?? makeContext(),
  });
  actor.start();
  return actor;
}

function collectEmits(
  actor: ReturnType<typeof createActor<typeof quizRoomMachine>>,
) {
  const emitted: unknown[] = [];
  actor.on("*", (e) => emitted.push(e));
  return emitted;
}

describe("quizRoomMachine", () => {
  it("starts in lobby", () => {
    const actor = createAndStartActor();
    expect(actor.getSnapshot().value).toBe("lobby");
  });

  it("first JOIN becomes host", () => {
    const actor = createAndStartActor();
    actor.send({ type: "JOIN", playerId: "p1", name: "Alice" });
    const ctx = actor.getSnapshot().context;
    expect(ctx.hostId).toBe("p1");
    expect(ctx.players.p1?.role).toBe("host");
  });

  it("START_GAME is only accepted by host", () => {
    const actor = createAndStartActor();
    actor.send({ type: "JOIN", playerId: "p1", name: "Alice" });
    actor.send({ type: "JOIN", playerId: "p2", name: "Bob" });
    actor.send({ type: "START_GAME", playerId: "p2" });
    expect(actor.getSnapshot().value).toBe("lobby");
    actor.send({ type: "START_GAME", playerId: "p1" });
    expect(actor.getSnapshot().value).toBe("waiting");
  });

  it("lobby -> waiting -> question -> buzzed flow", () => {
    const actor = createAndStartActor();
    actor.send({ type: "JOIN", playerId: "p1", name: "Alice" });
    actor.send({ type: "START_GAME", playerId: "p1" });
    expect(actor.getSnapshot().value).toBe("waiting");
    actor.send({ type: "START_QUESTION", playerId: "p1" });
    expect(actor.getSnapshot().value).toBe("question");
    actor.send({ type: "BUZZ", playerId: "p1" });
    expect(actor.getSnapshot().value).toBe("buzzed");
  });

  it("canBuzz guard rejects eliminated/suspended/already-buzzed", () => {
    const actor = createAndStartActor(
      makeContext({
        players: {
          p1: {
            id: "p1",
            name: "A",
            score: 0,
            role: "player",
            correctCount: 0,
            incorrectCount: 0,
            isEliminated: true,
            hasWon: false,
            suspendedUntilQuestion: 0,
          },
          p2: {
            id: "p2",
            name: "B",
            score: 0,
            role: "player",
            correctCount: 0,
            incorrectCount: 0,
            isEliminated: false,
            hasWon: false,
            suspendedUntilQuestion: 5,
          },
          p3: {
            id: "p3",
            name: "C",
            score: 0,
            role: "player",
            correctCount: 0,
            incorrectCount: 0,
            isEliminated: false,
            hasWon: false,
            suspendedUntilQuestion: 0,
          },
        },
        currentQuestionIndex: 3,
        buzzes: [{ playerId: "p3", buzzedAt: 1 }],
      }),
    );
    actor.start();
    actor.send({ type: "BUZZ", playerId: "p1" });
    actor.send({ type: "BUZZ", playerId: "p2" });
    actor.send({ type: "BUZZ", playerId: "p3" });
    expect(actor.getSnapshot().context.buzzes.length).toBe(1);
  });

  function setupForJudge(
    overrides?: Partial<QuizContext>,
    opts?: {
      players?: Record<
        string,
        {
          id: string;
          name: string;
          score?: number;
          correctCount?: number;
          incorrectCount?: number;
          isEliminated?: boolean;
          hasWon?: boolean;
          suspendedUntilQuestion?: number;
        }
      >;
      buzzPlayerIds?: string[];
    },
  ) {
    const ctx = makeContext({ hostId: "p1", ...overrides });
    if (opts?.players) {
      for (const [id, p] of Object.entries(opts.players)) {
        ctx.players[id] = {
          id: p.id,
          name: p.name,
          score: p.score ?? 0,
          role: p.id === ctx.hostId ? "host" : "player",
          correctCount: p.correctCount ?? 0,
          incorrectCount: p.incorrectCount ?? 0,
          isEliminated: p.isEliminated ?? false,
          hasWon: p.hasWon ?? false,
          suspendedUntilQuestion: p.suspendedUntilQuestion ?? 0,
        };
      }
    }
    const actor = createAndStartActor(ctx);
    actor.send({ type: "JOIN", playerId: "p1", name: "Alice" });
    actor.send({ type: "START_GAME", playerId: "p1" });
    actor.send({ type: "START_QUESTION", playerId: "p1" });
    for (const pid of opts?.buzzPlayerIds ?? ["p1"]) {
      actor.send({ type: "BUZZ", playerId: pid });
    }
    return actor;
  }

  it("all_order incorrect with remaining buzzes stays buzzed", () => {
    const actor = setupForJudge(
      { answerTransition: "all_order" },
      {
        players: {
          p1: { id: "p1", name: "A" },
          p2: { id: "p2", name: "B" },
        },
        buzzPlayerIds: ["p2", "p1"],
      },
    );
    actor.send({ type: "JUDGE", playerId: "p1", correct: false });
    const snap = actor.getSnapshot();
    expect(snap.value).toBe("buzzed");
    expect(snap.context.buzzes.length).toBe(1);
    expect(snap.context.buzzes[0].playerId).toBe("p1");
  });

  it("all_order incorrect with no remaining buzzes goes to question", () => {
    const actor = setupForJudge(
      { answerTransition: "all_order" },
      { buzzPlayerIds: ["p1"] },
    );
    actor.send({ type: "JUDGE", playerId: "p1", correct: false });
    expect(actor.getSnapshot().value).toBe("question");
  });

  it("single_chance incorrect goes to waiting", () => {
    const actor = setupForJudge(
      { answerTransition: "single_chance" },
      { buzzPlayerIds: ["p1"] },
    );
    actor.send({ type: "JUDGE", playerId: "p1", correct: false });
    expect(actor.getSnapshot().value).toBe("waiting");
  });

  it("endless_chance incorrect goes to question", () => {
    const actor = setupForJudge(
      { answerTransition: "endless_chance" },
      { buzzPlayerIds: ["p1"] },
    );
    actor.send({ type: "JUDGE", playerId: "p1", correct: false });
    expect(actor.getSnapshot().value).toBe("question");
  });

  it("second_chance incorrect with remaining buzzes stays buzzed", () => {
    const actor = setupForJudge(
      { answerTransition: "second_chance" },
      {
        players: {
          p1: { id: "p1", name: "A" },
          p2: { id: "p2", name: "B" },
        },
        buzzPlayerIds: ["p2", "p1"],
      },
    );
    actor.send({ type: "JUDGE", playerId: "p1", correct: false });
    expect(actor.getSnapshot().value).toBe("buzzed");
    expect(actor.getSnapshot().context.buzzes.length).toBe(1);
  });

  it("second_chance incorrect with no remaining buzzes goes to waiting", () => {
    const actor = setupForJudge(
      { answerTransition: "second_chance" },
      { buzzPlayerIds: ["p1"] },
    );
    actor.send({ type: "JUDGE", playerId: "p1", correct: false });
    expect(actor.getSnapshot().value).toBe("waiting");
  });

  it("mon_batsu winCount sets hasWon", () => {
    const actor = setupForJudge(
      { ruleType: "mon_batsu", winCount: 2 },
      {
        players: {
          p1: { id: "p1", name: "A", correctCount: 1 },
        },
        buzzPlayerIds: ["p1"],
      },
    );
    actor.send({ type: "JUDGE", playerId: "p1", correct: true });
    expect(actor.getSnapshot().context.players.p1?.hasWon).toBe(true);
  });

  it("nbn incorrect eliminates at nbyN and removes from buzzes", () => {
    const actor = setupForJudge(
      { ruleType: "nbn", nbyN: 2 },
      {
        players: {
          p1: { id: "p1", name: "A", incorrectCount: 1 },
          p2: { id: "p2", name: "B" },
        },
        buzzPlayerIds: ["p1", "p2"],
      },
    );
    actor.send({ type: "JUDGE", playerId: "p1", correct: false });
    const ctx = actor.getSnapshot().context;
    expect(ctx.players.p1?.isEliminated).toBe(true);
    expect(ctx.buzzes.some((b) => b.playerId === "p1")).toBe(false);
  });

  it("points nonBuzzerPoints adds to others", () => {
    const actor = setupForJudge(
      { ruleType: "points", addPoints: 1, nonBuzzerPoints: 2 },
      {
        players: {
          p1: { id: "p1", name: "A" },
          p2: { id: "p2", name: "B" },
        },
        buzzPlayerIds: ["p1"],
      },
    );
    actor.send({ type: "JUDGE", playerId: "p1", correct: true });
    const ctx = actor.getSnapshot().context;
    expect(ctx.players.p1?.score).toBe(1);
    expect(ctx.players.p2?.score).toBe(2);
  });

  it("canChangeHost guard rejects LEAVE_HOST in question", () => {
    const actor = createAndStartActor(makeContext());
    actor.send({ type: "JOIN", playerId: "p1", name: "A" });
    actor.send({ type: "START_GAME", playerId: "p1" });
    actor.send({ type: "START_QUESTION", playerId: "p1" });

    const emitted = collectEmits(actor);
    actor.send({ type: "LEAVE_HOST", playerId: "p1" });
    expect(actor.getSnapshot().context.hostId).toBe("p1");
    expect(
      emitted.some((e) => (e as { type: string }).type === "errorOccurred"),
    ).toBe(true);
  });

  it("snapshot round-trip preserves state", () => {
    const actor1 = createAndStartActor();
    actor1.send({ type: "JOIN", playerId: "p1", name: "Alice" });
    actor1.send({ type: "START_GAME", playerId: "p1" });
    actor1.send({ type: "START_QUESTION", playerId: "p1" });
    actor1.send({ type: "BUZZ", playerId: "p1" });

    const snapshot = actor1.getPersistedSnapshot();
    const actor2 = createActor(quizRoomMachine, {
      snapshot,
      input: makeContext(),
    });
    actor2.start();
    expect(actor2.getSnapshot().value).toBe("buzzed");
    expect(actor2.getSnapshot().context.players.p1?.name).toBe("Alice");
  });

  it("FINISH_GAME transitions to finished and emits gameFinished", () => {
    const actor = setupForJudge(undefined, {
      players: { p1: { id: "p1", name: "A", score: 5 } },
      buzzPlayerIds: ["p1"],
    });
    const emitted = collectEmits(actor);
    actor.send({ type: "JUDGE", playerId: "p1", correct: true });
    expect(actor.getSnapshot().value).toBe("result");
    actor.send({ type: "FINISH_GAME", playerId: "p1" });
    expect(actor.getSnapshot().value).toBe("finished");
    expect(
      emitted.some((e) => (e as { type: string }).type === "gameFinished"),
    ).toBe(true);
  });

  it("RESTART_GAME resets scores and goes to lobby", () => {
    const actor = setupForJudge(undefined, {
      players: {
        p1: {
          id: "p1",
          name: "A",
          score: 5,
          correctCount: 3,
          incorrectCount: 1,
        },
      },
      buzzPlayerIds: ["p1"],
    });
    actor.send({ type: "JUDGE", playerId: "p1", correct: true });
    actor.send({ type: "FINISH_GAME", playerId: "p1" });
    expect(actor.getSnapshot().value).toBe("finished");
    actor.send({ type: "RESTART_GAME", playerId: "p1" });
    const ctx = actor.getSnapshot().context;
    expect(actor.getSnapshot().value).toBe("lobby");
    expect(ctx.players.p1?.score).toBe(0);
    expect(ctx.players.p1?.hasWon).toBe(false);
    expect(ctx.currentQuestionIndex).toBe(0);
  });

  it("RESUME_GAME preserves scores and transitions to waiting", () => {
    const ctx = makeContext({
      hostId: "p1",
      players: {
        p1: {
          id: "p1",
          name: "A",
          score: 5,
          role: "host",
          correctCount: 3,
          incorrectCount: 1,
          isEliminated: false,
          hasWon: false,
          suspendedUntilQuestion: 0,
        },
      },
    });
    const actor = createAndStartActor(ctx);
    actor.send({ type: "START_GAME", playerId: "p1" });
    expect(actor.getSnapshot().value).toBe("waiting");
    actor.send({ type: "FINISH_GAME", playerId: "p1" });
    expect(actor.getSnapshot().value).toBe("finished");
    const questionIndexBefore =
      actor.getSnapshot().context.currentQuestionIndex;
    actor.send({ type: "RESUME_GAME", playerId: "p1" });
    const snap = actor.getSnapshot();
    expect(snap.value).toBe("waiting");
    expect(snap.context.players.p1?.score).toBe(5);
    expect(snap.context.players.p1?.correctCount).toBe(3);
    expect(snap.context.players.p1?.incorrectCount).toBe(1);
    expect(snap.context.currentQuestionIndex).toBe(questionIndexBefore);
  });

  it("RESUME_GAME by non-host is ignored", () => {
    const ctx = makeContext({
      hostId: "p1",
      players: {
        p1: {
          id: "p1",
          name: "A",
          score: 5,
          role: "host",
          correctCount: 0,
          incorrectCount: 0,
          isEliminated: false,
          hasWon: false,
          suspendedUntilQuestion: 0,
        },
        p2: {
          id: "p2",
          name: "B",
          score: 0,
          role: "player",
          correctCount: 0,
          incorrectCount: 0,
          isEliminated: false,
          hasWon: false,
          suspendedUntilQuestion: 0,
        },
      },
    });
    const actor = createAndStartActor(ctx);
    actor.send({ type: "START_GAME", playerId: "p1" });
    actor.send({ type: "FINISH_GAME", playerId: "p1" });
    actor.send({ type: "RESUME_GAME", playerId: "p2" });
    expect(actor.getSnapshot().value).toBe("finished");
  });

  it("duplicate name emits error and does not join", () => {
    const actor = createAndStartActor();
    const emitted = collectEmits(actor);
    actor.send({ type: "JOIN", playerId: "p1", name: "Alice" });
    actor.send({ type: "JOIN", playerId: "p2", name: "Alice" });
    expect(Object.keys(actor.getSnapshot().context.players)).toEqual(["p1"]);
    expect(
      emitted.some((e) => (e as { type: string }).type === "errorOccurred"),
    ).toBe(true);
  });
});

describe("getRoomState", () => {
  it("adds empty chatMessages and board", () => {
    const state = getRoomState(makeContext());
    expect(state.chatMessages).toEqual([]);
    expect(state.board).toEqual({
      status: "closed",
      sessionId: "",
      answers: {},
    });
  });
});

describe("APPLY_BOARD_SCORES", () => {
  function makeContextWithPlayers() {
    return makeContext({
      hostId: "p1",
      players: {
        p1: {
          id: "p1",
          name: "Host",
          score: 0,
          role: "host",
          correctCount: 0,
          incorrectCount: 0,
          isEliminated: false,
          hasWon: false,
          suspendedUntilQuestion: 0,
        },
        p2: {
          id: "p2",
          name: "Player2",
          score: 0,
          role: "player",
          correctCount: 0,
          incorrectCount: 0,
          isEliminated: false,
          hasWon: false,
          suspendedUntilQuestion: 0,
        },
        p3: {
          id: "p3",
          name: "Player3",
          score: 0,
          role: "player",
          correctCount: 0,
          incorrectCount: 0,
          isEliminated: false,
          hasWon: false,
          suspendedUntilQuestion: 0,
        },
      },
    });
  }

  it("applies correct and incorrect judgements to player scores", () => {
    const actor = createAndStartActor(
      makeContext({
        hostId: "p1",
        ruleType: "mon_batsu",
        winCount: 7,
        eliminateCount: 3,
        players: {
          p1: {
            id: "p1",
            name: "Host",
            score: 0,
            role: "host",
            correctCount: 0,
            incorrectCount: 0,
            isEliminated: false,
            hasWon: false,
            suspendedUntilQuestion: 0,
          },
          p2: {
            id: "p2",
            name: "Player2",
            score: 0,
            role: "player",
            correctCount: 0,
            incorrectCount: 0,
            isEliminated: false,
            hasWon: false,
            suspendedUntilQuestion: 0,
          },
          p3: {
            id: "p3",
            name: "Player3",
            score: 0,
            role: "player",
            correctCount: 0,
            incorrectCount: 0,
            isEliminated: false,
            hasWon: false,
            suspendedUntilQuestion: 0,
          },
        },
      }),
    );
    actor.send({ type: "START_GAME", playerId: "p1" });
    actor.send({
      type: "APPLY_BOARD_SCORES",
      playerId: "p1",
      judgements: { p2: "correct", p3: "incorrect" },
    });
    const { context } = actor.getSnapshot();
    expect(context.players.p2?.score).toBe(1);
    expect(context.players.p2?.correctCount).toBe(1);
    expect(context.players.p3?.incorrectCount).toBe(1);
  });

  it("non-host APPLY_BOARD_SCORES is ignored", () => {
    const actor = createAndStartActor(makeContextWithPlayers());
    actor.send({ type: "START_GAME", playerId: "p1" });
    actor.send({
      type: "APPLY_BOARD_SCORES",
      playerId: "p2",
      judgements: { p3: "correct" },
    });
    const { context } = actor.getSnapshot();
    expect(context.players.p3?.score).toBe(0);
  });

  it("works in question phase without changing phase", () => {
    const actor = createAndStartActor(makeContextWithPlayers());
    actor.send({ type: "START_GAME", playerId: "p1" });
    actor.send({ type: "START_QUESTION", playerId: "p1" });
    expect(actor.getSnapshot().value).toBe("question");
    actor.send({
      type: "APPLY_BOARD_SCORES",
      playerId: "p1",
      judgements: { p2: "correct" },
    });
    expect(actor.getSnapshot().value).toBe("question");
    expect(actor.getSnapshot().context.players.p2?.score).toBe(1);
  });

  it("unknown targetPlayerId in judgements is skipped", () => {
    const actor = createAndStartActor(makeContextWithPlayers());
    actor.send({ type: "START_GAME", playerId: "p1" });
    actor.send({
      type: "APPLY_BOARD_SCORES",
      playerId: "p1",
      judgements: { unknown_player: "correct", p2: "correct" },
    });
    const { context } = actor.getSnapshot();
    expect(context.players.p2?.score).toBe(1);
  });

  it("sets hasWon when winPoints reached", () => {
    const ctx = makeContext({
      hostId: "p1",
      ruleType: "points",
      addPoints: 3,
      subtractPoints: 1,
      winPoints: 3,
      eliminatePoints: null,
      nonBuzzerPoints: 0,
      players: {
        p1: {
          id: "p1",
          name: "Host",
          score: 0,
          role: "host",
          correctCount: 0,
          incorrectCount: 0,
          isEliminated: false,
          hasWon: false,
          suspendedUntilQuestion: 0,
        },
        p2: {
          id: "p2",
          name: "Player2",
          score: 0,
          role: "player",
          correctCount: 0,
          incorrectCount: 0,
          isEliminated: false,
          hasWon: false,
          suspendedUntilQuestion: 0,
        },
      },
    });
    const actor = createAndStartActor(ctx);
    actor.send({ type: "START_GAME", playerId: "p1" });
    actor.send({
      type: "APPLY_BOARD_SCORES",
      playerId: "p1",
      judgements: { p2: "correct" },
    });
    expect(actor.getSnapshot().context.players.p2?.hasWon).toBe(true);
  });
});
