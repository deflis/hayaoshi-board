import type { Connection, WSMessage } from "partyserver";
import { Server } from "partyserver";
import { createActor } from "xstate";
import { quizRoomMachine } from "./quiz-room.machine";
import type {
  ChatMessage,
  ClientMessage,
  PlayerId,
  QuizContext,
  QuizEmit,
  QuizEvent,
  RoomState,
  ServerMessage,
} from "./types";

const ROOM_STATE_KEY = "room-state";
const CHAT_MESSAGES_KEY = "chat-messages";
const MAX_CHAT_MESSAGES = 100;
const MAX_CHAT_TEXT_LENGTH = 300;
const EMPTY_ROOM_CLEANUP_DELAY_MS = 5 * 60 * 1000;

interface ConnectionSession {
  playerId: PlayerId;
}

function makeContext(roomId: string): QuizContext {
  return {
    roomId,
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
  };
}

export class QuizRoom extends Server<Env> {
  static options = { hibernate: true };

  async onStart() {
    await this.ctx.storage.get(ROOM_STATE_KEY);
  }

  async onConnect(connection: Connection<ConnectionSession>) {
    await this.ctx.storage.deleteAlarm();
    const state = await this.getCurrentState();
    this.send(connection, { type: "room_state", state });
  }

  async onMessage(
    connection: Connection<ConnectionSession>,
    message: WSMessage,
  ) {
    const msg = JSON.parse(message as string) as ClientMessage;

    if (msg.type === "send_chat") {
      await this.handleSendChat(connection, msg.text);
      return;
    }

    const event = this.toMachineEvent(connection, msg);
    if (!event) return;

    const emits = await this.processEvent(event);
    await this.handleEmits(emits);
  }

  async onClose(connection: Connection<ConnectionSession>) {
    const playerId = connection.state?.playerId;
    if (playerId && !this.hasOtherConnectionForPlayer(connection, playerId)) {
      const emits = await this.processEvent({
        type: "HOST_DISCONNECTED",
        playerId,
      });
      for (const emit of emits) {
        if (emit.type === "broadcastRoomState") {
          await this.broadcastRoomState(emit);
        }
      }
    }
    await this.scheduleCleanupIfEmpty();
  }

  async onAlarm() {
    if (this.hasActiveConnections()) return;
    await this.ctx.storage.deleteAll();
  }

  private async getCurrentState(): Promise<RoomState> {
    const [snapshot, chatMessages] = await Promise.all([
      this.ctx.storage.get<unknown>(ROOM_STATE_KEY),
      this.ctx.storage.get<ChatMessage[]>(CHAT_MESSAGES_KEY),
    ]);

    let context: QuizContext;
    if (
      snapshot &&
      typeof snapshot === "object" &&
      "context" in snapshot &&
      snapshot.context &&
      typeof snapshot.context === "object"
    ) {
      context = snapshot.context as QuizContext;
    } else {
      context = makeContext(this.name);
    }

    return { ...context, chatMessages: chatMessages ?? [] };
  }

  private async broadcastRoomState(
    emit: QuizEmit & { type: "broadcastRoomState" },
  ) {
    const chatMessages =
      (await this.ctx.storage.get<ChatMessage[]>(CHAT_MESSAGES_KEY)) ?? [];
    this.broadcast(
      JSON.stringify({
        type: "room_state",
        state: { ...emit.state, chatMessages },
      } satisfies ServerMessage),
    );
  }

  private async processEvent(event: QuizEvent): Promise<QuizEmit[]> {
    const input = makeContext(this.name);
    const stored = await this.ctx.storage.get<unknown>(ROOM_STATE_KEY);
    const isStoredSnapshot =
      stored &&
      typeof stored === "object" &&
      "value" in stored &&
      "context" in stored;

    const actor = isStoredSnapshot
      ? createActor(quizRoomMachine, { snapshot: stored, input })
      : createActor(quizRoomMachine, { input });
    actor.start();

    const emits: QuizEmit[] = [];
    actor.on("*", (e) => emits.push(e as QuizEmit));
    actor.send(event);

    await this.ctx.storage.put(ROOM_STATE_KEY, actor.getPersistedSnapshot());
    return emits;
  }

  private async handleEmits(emits: QuizEmit[]) {
    for (const emit of emits) {
      switch (emit.type) {
        case "broadcastRoomState": {
          await this.broadcastRoomState(emit);
          break;
        }
        case "buzzAccepted": {
          this.broadcast(
            JSON.stringify({
              type: "buzz_accepted",
              entry: emit.entry,
              playerName: emit.playerName,
            } satisfies ServerMessage),
          );
          break;
        }
        case "judgeResult": {
          this.broadcast(
            JSON.stringify({
              type: "judge_result",
              correct: emit.correct,
              playerId: emit.playerId,
              scores: emit.scores,
            } satisfies ServerMessage),
          );
          break;
        }
        case "gameFinished": {
          this.broadcast(
            JSON.stringify({
              type: "game_finished",
              scores: emit.scores,
            } satisfies ServerMessage),
          );
          break;
        }
        case "errorOccurred": {
          const target = this.findConnection(emit.playerId);
          if (target) {
            this.send(target, {
              type: "error",
              message: emit.message,
            });
          }
          break;
        }
      }
    }
  }

  private toMachineEvent(
    connection: Connection<ConnectionSession>,
    msg: ClientMessage,
  ): QuizEvent | null {
    const playerId = connection.state?.playerId ?? null;

    switch (msg.type) {
      case "join": {
        const id = msg.sessionId?.trim() || connection.id;
        return {
          type: "JOIN",
          playerId: id,
          name: msg.name,
          sessionId: msg.sessionId,
        };
      }
      case "leave_host":
        if (!playerId) return null;
        return { type: "LEAVE_HOST", playerId };
      case "claim_host":
        if (!playerId) return null;
        return { type: "CLAIM_HOST", playerId };
      case "buzz":
        if (!playerId) return null;
        return { type: "BUZZ", playerId };
      case "judge":
        if (!playerId) return null;
        return { type: "JUDGE", playerId, correct: msg.correct };
      case "through":
        if (!playerId) return null;
        return { type: "THROUGH", playerId };
      case "next_question":
        if (!playerId) return null;
        return { type: "NEXT_QUESTION", playerId };
      case "finish_game":
        if (!playerId) return null;
        return { type: "FINISH_GAME", playerId };
      case "start_game":
        if (!playerId) return null;
        return { type: "START_GAME", playerId };
      case "restart_game":
        if (!playerId) return null;
        return { type: "RESTART_GAME", playerId };
      case "start_question":
        if (!playerId) return null;
        return { type: "START_QUESTION", playerId };
      case "set_total_questions":
        if (!playerId) return null;
        return { type: "SET_TOTAL_QUESTIONS", playerId, total: msg.total };
      case "set_player_stats":
        if (!playerId) return null;
        return {
          type: "SET_PLAYER_STATS",
          playerId,
          targetPlayerId: msg.playerId,
          score: msg.score,
          correctCount: msg.correctCount,
          incorrectCount: msg.incorrectCount,
        };
      case "set_rule":
        if (!playerId) return null;
        return {
          type: "SET_RULE",
          playerId,
          ruleType: msg.ruleType,
          answerTransition: msg.answerTransition,
          winCount: msg.winCount,
          eliminateCount: msg.eliminateCount,
          nbyN: msg.nbyN,
          addPoints: msg.addPoints,
          subtractPoints: msg.subtractPoints,
          winPoints: msg.winPoints,
          eliminatePoints: msg.eliminatePoints,
          nonBuzzerPoints: msg.nonBuzzerPoints,
        };
      default:
        return null;
    }
  }

  private async handleSendChat(
    connection: Connection<ConnectionSession>,
    text: string,
  ) {
    const playerId = connection.state?.playerId;
    if (!playerId) return;

    const [stored, existing] = await Promise.all([
      this.ctx.storage.get<unknown>(ROOM_STATE_KEY),
      this.ctx.storage.get<ChatMessage[]>(CHAT_MESSAGES_KEY),
    ]);

    let context: QuizContext;
    if (
      stored &&
      typeof stored === "object" &&
      "context" in stored &&
      stored.context &&
      typeof stored.context === "object"
    ) {
      context = stored.context as QuizContext;
    } else {
      context = makeContext(this.name);
    }

    const player = context.players[playerId];
    if (!player) return;

    const trimmed = text.trim().slice(0, MAX_CHAT_TEXT_LENGTH);
    if (!trimmed) return;

    const sentAt = Date.now();
    const messages = [
      ...(existing ?? []),
      {
        id: `${sentAt}-${playerId}-${(existing ?? []).length}`,
        playerId,
        playerName: player.name,
        text: trimmed,
        sentAt,
      },
    ].slice(-MAX_CHAT_MESSAGES);

    await this.ctx.storage.put(CHAT_MESSAGES_KEY, messages);

    this.broadcast(
      JSON.stringify({
        type: "room_state",
        state: { ...context, chatMessages: messages },
      } satisfies ServerMessage),
    );
  }

  private send(connection: Connection, msg: ServerMessage) {
    connection.send(JSON.stringify(msg));
  }

  private findConnection(
    playerId: PlayerId,
  ): Connection<ConnectionSession> | null {
    for (const conn of this.getConnections<ConnectionSession>()) {
      if (conn.state?.playerId === playerId) return conn;
    }
    return null;
  }

  private hasOtherConnectionForPlayer(
    closedConnection: Connection<ConnectionSession>,
    playerId: PlayerId,
  ): boolean {
    for (const connection of this.getConnections<ConnectionSession>()) {
      if (connection.id === closedConnection.id) continue;
      if (connection.state?.playerId === playerId) return true;
    }
    return false;
  }

  private hasActiveConnections(): boolean {
    for (const _connection of this.getConnections()) {
      return true;
    }
    return false;
  }

  private async scheduleCleanupIfEmpty(): Promise<void> {
    if (this.hasActiveConnections()) return;
    await this.ctx.storage.setAlarm(Date.now() + EMPTY_ROOM_CLEANUP_DELAY_MS);
  }
}
