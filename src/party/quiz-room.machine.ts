import { and, assign, emit, not, setup } from "xstate";
import {
  applyCorrectByRule,
  applyIncorrectByRule,
  refreshOutcomeByRule,
} from "./rules";
import { applyTransitionOnIncorrect } from "./rules/transitions";
import type {
  Player,
  QuizContext,
  QuizEmit,
  QuizEvent,
  RoomState,
} from "./types";

export function getRoomState(ctx: QuizContext): RoomState {
  return {
    ...ctx,
    chatMessages: [],
    board: { status: "closed", sessionId: "", answers: {} },
  };
}

function newPlayer(id: string, name: string, role: Player["role"]): Player {
  return {
    id,
    name,
    score: 0,
    role,
    correctCount: 0,
    incorrectCount: 0,
    isEliminated: false,
    hasWon: false,
    suspendedUntilQuestion: 0,
  };
}

function syncPlayerRoles(ctx: QuizContext): void {
  for (const p of Object.values(ctx.players)) {
    p.role = p.id === ctx.hostId ? "host" : "player";
  }
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function isSuspended(player: Player, questionIndex: number): boolean {
  return (
    player.suspendedUntilQuestion > 0 &&
    questionIndex <= player.suspendedUntilQuestion
  );
}

function getFirstBuzzPlayerId(ctx: QuizContext): string | null {
  const first = ctx.buzzes[0];
  return first?.playerId ?? null;
}

export const quizRoomMachine = setup({
  types: {
    context: {} as QuizContext,
    events: {} as QuizEvent,
    emitted: {} as QuizEmit,
    input: {} as QuizContext,
  },
  guards: {
    isHost: ({ context, event }) => {
      return event.playerId === context.hostId;
    },
    canBuzz: ({ context, event }) => {
      if (context.phase !== "question" && context.phase !== "buzzed")
        return false;
      const player = context.players[event.playerId];
      if (!player || player.isEliminated || player.hasWon) return false;
      if (isSuspended(player, context.currentQuestionIndex)) return false;
      if (context.buzzes.some((b) => b.playerId === event.playerId))
        return false;
      return true;
    },
    canChangeHost: ({ context }) => {
      return (
        context.phase === "lobby" ||
        context.phase === "waiting" ||
        context.phase === "result" ||
        context.phase === "finished"
      );
    },
    isExistingPlayer: ({ context, event }) => {
      return event.type === "CLAIM_HOST" && !!context.players[event.playerId];
    },
    isPhaseLobby: ({ context }) => context.phase === "lobby",
    isPhaseFinished: ({ context }) => context.phase === "finished",
    isPhaseBuzzed: ({ context }) => context.phase === "buzzed",
    isCorrect: ({ event }) => event.type === "JUDGE" && event.correct,
    isSingleChance: ({ context }) =>
      context.answerTransition === "single_chance",
    isEndlessChance: ({ context }) =>
      context.answerTransition === "endless_chance",
    isSecondChanceWithRemainingBuzzes: ({ context }) =>
      context.answerTransition === "second_chance" && context.buzzes.length > 1,
    isSecondChanceNoRemaining: ({ context }) =>
      context.answerTransition === "second_chance" &&
      context.buzzes.length <= 1,
    isAllOrderWithRemainingBuzzes: ({ context }) =>
      context.answerTransition === "all_order" && context.buzzes.length > 1,
    hasDuplicateName: ({ context, event }) => {
      if (event.type !== "JOIN") return false;
      return Object.entries(context.players).some(
        ([id, p]) => id !== event.playerId && p.name === event.name,
      );
    },
    hasHost: ({ context }) => !!context.hostId,
    hasActivePlayer: ({ context }) => {
      const winners = Object.values(context.players).filter((p) => p.hasWon);
      if (context.maxWinners > 0 && winners.length >= context.maxWinners)
        return false;
      return Object.values(context.players).some(
        (p) => !p.hasWon && !p.isEliminated,
      );
    },
    isHostDisconnected: ({ context, event }) => {
      return (
        event.type === "HOST_DISCONNECTED" && event.playerId === context.hostId
      );
    },
  },
  actions: {
    joinPlayer: assign(({ context, event }) => {
      if (event.type !== "JOIN") return context;
      const next = structuredClone(context);
      const existing = next.players[event.playerId];
      if (existing) {
        existing.name = event.name;
      } else {
        const isFirst = Object.keys(next.players).length === 0;
        next.players[event.playerId] = newPlayer(
          event.playerId,
          event.name,
          isFirst ? "host" : "player",
        );
        if (isFirst) next.hostId = event.playerId;
      }
      syncPlayerRoles(next);
      return next;
    }),
    leaveHost: assign(({ context, event }) => {
      if (event.type !== "LEAVE_HOST") return context;
      const next = structuredClone(context);
      next.hostId = null;
      syncPlayerRoles(next);
      return next;
    }),
    claimHost: assign(({ context, event }) => {
      if (event.type !== "CLAIM_HOST") return context;
      const next = structuredClone(context);
      if (!next.players[event.playerId]) return context;
      if (next.hostId) return context;
      next.hostId = event.playerId;
      syncPlayerRoles(next);
      return next;
    }),
    appendBuzz: assign(({ context, event }) => {
      if (event.type !== "BUZZ") return context;
      const next = structuredClone(context);
      next.buzzes.push({ playerId: event.playerId, buzzedAt: Date.now() });
      if (next.phase === "question") next.phase = "buzzed";
      return next;
    }),
    applyCorrect: assign(({ context, event }) => {
      if (event.type !== "JUDGE") return context;
      const next = structuredClone(context);
      const firstId = getFirstBuzzPlayerId(next);
      if (!firstId) return context;
      const answerer = next.players[firstId];
      if (!answerer) return context;
      applyCorrectByRule(next, answerer);
      next.lastBuzzes = [...next.buzzes];
      next.phase = "result";
      return next;
    }),
    applyIncorrect: assign(({ context, event }) => {
      if (event.type !== "JUDGE") return context;
      const next = structuredClone(context);
      const firstId = getFirstBuzzPlayerId(next);
      if (!firstId) return context;
      const answerer = next.players[firstId];
      if (!answerer) return context;
      applyIncorrectByRule(next, answerer);
      applyTransitionOnIncorrect(next);
      return next;
    }),
    startQuestion: assign(({ context }) => {
      const next = structuredClone(context);
      next.lastBuzzes = [...next.buzzes];
      next.buzzes = [];
      next.phase = "question";
      next.currentQuestionIndex += 1;
      return next;
    }),
    startGame: assign(({ context }) => {
      const next = structuredClone(context);
      next.phase = "waiting";
      next.currentQuestionIndex = 0;
      return next;
    }),
    nextQuestion: assign(({ context }) => {
      const next = structuredClone(context);
      next.lastBuzzes = [...next.buzzes];
      next.buzzes = [];
      next.phase = "waiting";
      return next;
    }),
    throughBuzzed: assign(({ context }) => {
      const next = structuredClone(context);
      next.buzzes = next.buzzes.slice(1);
      if (next.buzzes.length > 0) {
        next.phase = "buzzed";
      } else {
        next.phase = "waiting";
      }
      return next;
    }),
    throughQuestion: assign(({ context }) => {
      const next = structuredClone(context);
      next.lastBuzzes = [...next.buzzes];
      next.buzzes = [];
      next.phase = "waiting";
      return next;
    }),
    finishGame: assign(({ context }) => {
      const next = structuredClone(context);
      next.phase = "finished";
      return next;
    }),
    restartGame: assign(({ context }) => {
      const next = structuredClone(context);
      for (const p of Object.values(next.players)) {
        p.score = 0;
        p.correctCount = 0;
        p.incorrectCount = 0;
        p.isEliminated = false;
        p.hasWon = false;
        p.suspendedUntilQuestion = 0;
      }
      next.phase = "lobby";
      next.currentQuestionIndex = 0;
      next.buzzes = [];
      next.lastBuzzes = [];
      return next;
    }),
    resumeGame: assign(({ context }) => {
      const next = structuredClone(context);
      next.phase = "waiting";
      next.buzzes = [];
      return next;
    }),
    setTotalQuestions: assign(({ context, event }) => {
      if (event.type !== "SET_TOTAL_QUESTIONS") return context;
      const next = structuredClone(context);
      next.totalQuestions = clampInteger(event.total, 0, 999);
      return next;
    }),
    setRule: assign(({ context, event }) => {
      if (event.type !== "SET_RULE") return context;
      const next = structuredClone(context);
      if (event.ruleType != null) next.ruleType = event.ruleType;
      if (event.answerTransition != null)
        next.answerTransition = event.answerTransition;
      if (event.winCount != null) next.winCount = event.winCount;
      if (event.eliminateCount != null)
        next.eliminateCount = event.eliminateCount;
      if (event.nbyN != null) next.nbyN = event.nbyN;
      if (event.addPoints != null) next.addPoints = event.addPoints;
      if (event.subtractPoints != null)
        next.subtractPoints = event.subtractPoints;
      if (event.winPoints != null) next.winPoints = event.winPoints;
      if ("eliminatePoints" in event)
        next.eliminatePoints = event.eliminatePoints ?? null;
      if (event.nonBuzzerPoints != null)
        next.nonBuzzerPoints = event.nonBuzzerPoints;
      if (event.maxWinners != null)
        next.maxWinners = clampInteger(event.maxWinners, 0, 99);
      return next;
    }),
    setPlayerStats: assign(({ context, event }) => {
      if (event.type !== "SET_PLAYER_STATS") return context;
      const next = structuredClone(context);
      const target = next.players[event.targetPlayerId];
      if (!target) return context;
      if (event.score != null)
        target.score = clampInteger(event.score, -9999, 9999);
      if (event.correctCount != null)
        target.correctCount = clampInteger(event.correctCount, 0, 999);
      if (event.incorrectCount != null)
        target.incorrectCount = clampInteger(event.incorrectCount, 0, 999);
      refreshOutcomeByRule(next, target);
      return next;
    }),
    applyBoardScores: assign(({ context, event }) => {
      if (event.type !== "APPLY_BOARD_SCORES") return context;
      const next = structuredClone(context);
      for (const [pid, j] of Object.entries(event.judgements)) {
        const target = next.players[pid];
        if (!target) continue;
        if (j === "correct") applyCorrectByRule(next, target);
        else if (j === "incorrect") applyIncorrectByRule(next, target);
      }
      return next;
    }),
    releaseHostOnDisconnect: assign(({ context, event }) => {
      if (event.type !== "HOST_DISCONNECTED") return context;
      const next = structuredClone(context);
      if (next.hostId !== event.playerId) return context;
      next.hostId = null;
      syncPlayerRoles(next);
      return next;
    }),
    emitBroadcast: emit(({ context }) => ({
      type: "broadcastRoomState" as const,
      state: getRoomState(context),
    })),
    emitBuzzAccepted: emit(({ context, event }) => {
      const _event = event as Extract<QuizEvent, { type: "BUZZ" }>;
      const entry = context.buzzes[context.buzzes.length - 1];
      const playerName = context.players[_event.playerId]?.name ?? "";
      return {
        type: "buzzAccepted" as const,
        entry,
        playerName,
      };
    }),
    emitJudgeResult: emit(({ context, event }) => {
      const _event = event as Extract<QuizEvent, { type: "JUDGE" }>;
      const firstId = getFirstBuzzPlayerId(context);
      const answererId = firstId ?? _event.playerId;
      return {
        type: "judgeResult" as const,
        correct: _event.correct,
        playerId: answererId,
        scores: Object.fromEntries(
          Object.entries(context.players).map(([id, p]) => [id, p.score]),
        ),
      };
    }),
    emitGameFinished: emit(({ context }) => ({
      type: "gameFinished" as const,
      scores: Object.fromEntries(
        Object.entries(context.players).map(([id, p]) => [id, p.score]),
      ),
    })),
    emitDuplicateNameError: emit(({ event }) => {
      return {
        type: "errorOccurred" as const,
        playerId: event.playerId,
        message: "同じ名前のプレイヤーがすでに参加しています。",
      };
    }),
    emitCanNotLeaveHostError: emit(({ event }) => {
      return {
        type: "errorOccurred" as const,
        playerId: event.playerId,
        message: "問題中はホストを抜けられません。",
      };
    }),
  },
}).createMachine({
  id: "quizRoom",
  initial: "lobby",
  context: ({ input }) => input,
  states: {
    lobby: {
      entry: assign({ phase: "lobby" }),
      on: {
        START_GAME: {
          guard: "isHost",
          target: "waiting",
          actions: ["startGame", "emitBroadcast"],
        },
        SET_RULE: {
          guard: "isHost",
          actions: ["setRule", "emitBroadcast"],
        },
        SET_TOTAL_QUESTIONS: {
          guard: "isHost",
          actions: ["setTotalQuestions", "emitBroadcast"],
        },
      },
    },
    waiting: {
      entry: assign({ phase: "waiting" }),
      on: {
        START_QUESTION: {
          guard: "isHost",
          target: "question",
          actions: ["startQuestion", "emitBroadcast"],
        },
        NEXT_QUESTION: {
          guard: "isHost",
          target: "waiting",
          actions: ["nextQuestion", "emitBroadcast"],
        },
        FINISH_GAME: {
          guard: "isHost",
          target: "finished",
          actions: ["finishGame", "emitGameFinished", "emitBroadcast"],
        },
      },
    },
    question: {
      entry: assign({ phase: "question" }),
      on: {
        BUZZ: {
          guard: "canBuzz",
          target: "buzzed",
          actions: ["appendBuzz", "emitBuzzAccepted", "emitBroadcast"],
        },
        THROUGH: {
          guard: "isHost",
          target: "waiting",
          actions: ["throughQuestion", "emitBroadcast"],
        },
      },
    },
    buzzed: {
      entry: assign({ phase: "buzzed" }),
      on: {
        BUZZ: {
          guard: "canBuzz",
          actions: ["appendBuzz", "emitBuzzAccepted", "emitBroadcast"],
        },
        JUDGE: [
          {
            guard: and(["isHost", "isCorrect"]),
            target: "result",
            actions: ["applyCorrect", "emitJudgeResult", "emitBroadcast"],
          },
          {
            guard: and(["isHost", "isSingleChance"]),
            target: "waiting",
            actions: ["applyIncorrect", "emitJudgeResult", "emitBroadcast"],
          },
          {
            guard: and(["isHost", "isEndlessChance"]),
            target: "question",
            actions: ["applyIncorrect", "emitJudgeResult", "emitBroadcast"],
          },
          {
            guard: and(["isHost", "isSecondChanceWithRemainingBuzzes"]),
            target: "buzzed",
            actions: ["applyIncorrect", "emitJudgeResult", "emitBroadcast"],
          },
          {
            guard: and(["isHost", "isSecondChanceNoRemaining"]),
            target: "waiting",
            actions: ["applyIncorrect", "emitJudgeResult", "emitBroadcast"],
          },
          {
            guard: and(["isHost", "isAllOrderWithRemainingBuzzes"]),
            target: "buzzed",
            actions: ["applyIncorrect", "emitJudgeResult", "emitBroadcast"],
          },
          {
            guard: "isHost",
            target: "question",
            actions: ["applyIncorrect", "emitJudgeResult", "emitBroadcast"],
          },
        ],
        THROUGH: {
          guard: "isHost",
          target: "waiting",
          actions: ["throughBuzzed", "emitBroadcast"],
        },
      },
    },
    result: {
      entry: assign({ phase: "result" }),
      on: {
        NEXT_QUESTION: {
          guard: "isHost",
          target: "waiting",
          actions: ["nextQuestion", "emitBroadcast"],
        },
        START_QUESTION: {
          guard: "isHost",
          target: "question",
          actions: ["startQuestion", "emitBroadcast"],
        },
        FINISH_GAME: {
          guard: "isHost",
          target: "finished",
          actions: ["finishGame", "emitGameFinished", "emitBroadcast"],
        },
      },
    },
    finished: {
      entry: assign({ phase: "finished" }),
      on: {
        RESTART_GAME: {
          guard: "isHost",
          target: "lobby",
          actions: ["restartGame", "emitBroadcast"],
        },
        RESUME_GAME: {
          guard: and(["isHost", "hasActivePlayer"]),
          target: "waiting",
          actions: ["resumeGame", "emitBroadcast"],
        },
      },
    },
  },
  on: {
    JOIN: [
      {
        guard: "hasDuplicateName",
        actions: ["emitDuplicateNameError", "emitBroadcast"],
      },
      { actions: ["joinPlayer", "emitBroadcast"] },
    ],
    LEAVE_HOST: [
      {
        guard: and(["isHost", "canChangeHost"]),
        actions: ["leaveHost", "emitBroadcast"],
      },
      {
        guard: "isHost",
        actions: "emitCanNotLeaveHostError",
      },
    ],
    CLAIM_HOST: [
      {
        guard: and(["isExistingPlayer", not("hasHost")]),
        actions: ["claimHost", "emitBroadcast"],
      },
    ],
    SET_PLAYER_STATS: {
      guard: "isHost",
      actions: ["setPlayerStats", "emitBroadcast"],
    },
    HOST_DISCONNECTED: {
      guard: "isHostDisconnected",
      actions: ["releaseHostOnDisconnect", "emitBroadcast"],
    },
    APPLY_BOARD_SCORES: {
      guard: "isHost",
      actions: ["applyBoardScores", "emitBroadcast"],
    },
  },
});
