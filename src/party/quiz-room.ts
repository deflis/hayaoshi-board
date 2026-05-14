import type { Connection, WSMessage } from "partyserver";
import { Server } from "partyserver";
import * as Y from "yjs";
import type {
  BuzzEntry,
  ChatMessage,
  ClientMessage,
  Player,
  PlayerId,
  RoomState,
  ServerMessage,
} from "./types";

const YJS_STATE_UPDATE_KEY = "yjs-state-update";
const LEGACY_STATE_KEY = "state";
const ROOM_STATE_MAP_KEY = "state";
const CHAT_MESSAGES_ARRAY_KEY = "chatMessages";
const MAX_CHAT_MESSAGES = 100;
const MAX_CHAT_TEXT_LENGTH = 300;
const EMPTY_ROOM_CLEANUP_DELAY_MS = 5 * 60 * 1000;

interface ConnectionSession {
  playerId: PlayerId;
}

export class QuizRoom extends Server<Env> {
  static options = { hibernate: true };

  async onStart() {
    await this.getState();
  }

  async onConnect(connection: Connection<ConnectionSession>) {
    await this.ctx.storage.deleteAlarm();
    const state = await this.getState();
    this.send(connection, { type: "room_state", state });
  }

  async onMessage(
    connection: Connection<ConnectionSession>,
    message: WSMessage,
  ) {
    const msg = JSON.parse(message as string) as ClientMessage;
    const state = await this.getState();
    await this.handleMessage(connection, msg, state);
  }

  async onClose(connection: Connection<ConnectionSession>) {
    await this.releaseHostForDisconnectedConnection(connection);
    await this.scheduleCleanupIfEmpty();
  }

  async onAlarm() {
    if (this.hasActiveConnections()) return;
    await this.ctx.storage.deleteAll();
  }

  private initialState(): RoomState {
    return {
      roomId: this.name,
      phase: "lobby",
      hostId: null,
      players: {},
      currentQuestionIndex: 0,
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
    };
  }

  private normalizeState(stored?: Partial<RoomState>): RoomState {
    const init = this.initialState();
    // 旧フォーマットからの移行（存在しないフィールドをデフォルト値で補完）
    const s: RoomState = {
      ...init,
      ...stored,
      players: { ...(stored?.players ?? init.players) },
      buzzes: [...(stored?.buzzes ?? init.buzzes)],
      lastBuzzes: [...(stored?.lastBuzzes ?? init.lastBuzzes)],
      chatMessages: [...(stored?.chatMessages ?? init.chatMessages)],
    };
    if (!s.lastBuzzes) s.lastBuzzes = [];
    if (!s.chatMessages) s.chatMessages = [];
    for (const p of Object.values(s.players)) {
      if (p.correctCount == null) p.correctCount = p.score ?? 0;
      if (p.incorrectCount == null) p.incorrectCount = 0;
      if (p.isEliminated == null) p.isEliminated = false;
      if (p.hasWon == null) p.hasWon = false;
      if (p.suspendedUntilQuestion == null) p.suspendedUntilQuestion = 0;
    }
    return s;
  }

  private async loadYDoc(): Promise<Y.Doc> {
    const doc = new Y.Doc();
    const storedUpdate =
      await this.ctx.storage.get<number[]>(YJS_STATE_UPDATE_KEY);

    if (storedUpdate) {
      Y.applyUpdate(doc, Uint8Array.from(storedUpdate));
      return doc;
    }

    const legacyState = await this.ctx.storage.get<RoomState>(LEGACY_STATE_KEY);
    doc
      .getMap(ROOM_STATE_MAP_KEY)
      .set(ROOM_STATE_MAP_KEY, this.normalizeState(legacyState));
    if (legacyState?.chatMessages?.length) {
      doc
        .getArray<ChatMessage>(CHAT_MESSAGES_ARRAY_KEY)
        .push(legacyState.chatMessages.slice(-MAX_CHAT_MESSAGES));
    }
    await this.saveYDoc(doc);
    return doc;
  }

  private getChatMessages(doc: Y.Doc): ChatMessage[] {
    return doc
      .getArray<ChatMessage>(CHAT_MESSAGES_ARRAY_KEY)
      .toArray()
      .slice(-MAX_CHAT_MESSAGES);
  }

  private async saveYDoc(doc: Y.Doc) {
    await this.ctx.storage.put(
      YJS_STATE_UPDATE_KEY,
      Array.from(Y.encodeStateAsUpdate(doc)),
    );
  }

  private async getState(): Promise<RoomState> {
    const doc = await this.loadYDoc();
    const state = doc.getMap(ROOM_STATE_MAP_KEY).get(ROOM_STATE_MAP_KEY) as
      | Partial<RoomState>
      | undefined;
    const normalized = this.normalizeState(state);
    normalized.chatMessages = this.getChatMessages(doc);
    return normalized;
  }

  private async saveState(state: RoomState) {
    const doc = await this.loadYDoc();
    const { chatMessages: _chatMessages, ...stateWithoutChatMessages } =
      this.normalizeState(state);
    doc
      .getMap(ROOM_STATE_MAP_KEY)
      .set(ROOM_STATE_MAP_KEY, stateWithoutChatMessages);
    await this.saveYDoc(doc);
  }

  private async appendChatMessage(
    chatMessage: ChatMessage,
  ): Promise<RoomState> {
    const doc = await this.loadYDoc();
    const messages = doc.getArray<ChatMessage>(CHAT_MESSAGES_ARRAY_KEY);
    messages.push([chatMessage]);
    const overflow = messages.length - MAX_CHAT_MESSAGES;
    if (overflow > 0) {
      messages.delete(0, overflow);
    }
    await this.saveYDoc(doc);

    const state = doc.getMap(ROOM_STATE_MAP_KEY).get(ROOM_STATE_MAP_KEY) as
      | Partial<RoomState>
      | undefined;
    const normalized = this.normalizeState(state);
    normalized.chatMessages = this.getChatMessages(doc);
    return normalized;
  }

  private send(connection: Connection, msg: ServerMessage) {
    connection.send(JSON.stringify(msg));
  }

  private getPlayerId(
    connection: Connection<ConnectionSession>,
  ): PlayerId | null {
    return connection.state?.playerId ?? null;
  }

  private newPlayer(id: string, name: string, role: Player["role"]): Player {
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

  private isSuspended(player: Player, questionIndex: number): boolean {
    return (
      player.suspendedUntilQuestion > 0 &&
      questionIndex <= player.suspendedUntilQuestion
    );
  }

  private canChangeHost(state: RoomState): boolean {
    return (
      state.phase === "lobby" ||
      state.phase === "waiting" ||
      state.phase === "result" ||
      state.phase === "finished"
    );
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

  private async releaseHostForDisconnectedConnection(
    connection: Connection<ConnectionSession>,
  ): Promise<void> {
    const playerId = this.getPlayerId(connection);
    if (!playerId) return;
    if (this.hasOtherConnectionForPlayer(connection, playerId)) return;

    const state = await this.getState();
    if (state.hostId !== playerId) return;

    state.hostId = null;
    this.syncPlayerRoles(state);
    await this.saveState(state);
    this.broadcast(
      JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
    );
  }

  private syncPlayerRoles(state: RoomState): void {
    for (const player of Object.values(state.players)) {
      player.role = player.id === state.hostId ? "host" : "player";
    }
  }

  private clampInteger(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.trunc(value)));
  }

  private refreshPlayerOutcome(state: RoomState, player: Player): void {
    player.hasWon = false;
    player.isEliminated = false;

    switch (state.ruleType) {
      case "mon_batsu":
        player.score = player.correctCount;
        player.hasWon = player.correctCount >= state.winCount;
        player.isEliminated = player.incorrectCount >= state.eliminateCount;
        break;
      case "mon_kyu":
        player.score = player.correctCount;
        player.hasWon = player.correctCount >= state.winCount;
        break;
      case "nbn":
        player.score = player.correctCount;
        player.hasWon =
          player.correctCount >= state.nbyN &&
          player.incorrectCount < state.nbyN;
        player.isEliminated = player.incorrectCount >= state.nbyN;
        break;
      case "points":
        player.hasWon = player.score >= state.winPoints;
        player.isEliminated =
          state.eliminatePoints !== null &&
          player.score <= state.eliminatePoints;
        break;
    }
  }

  // 誤答後の遷移。buzzes を保存してから遷移する
  private applyTransitionOnIncorrect(state: RoomState): void {
    switch (state.answerTransition) {
      case "single_chance":
        state.lastBuzzes = [...state.buzzes];
        state.buzzes = [];
        state.phase = "waiting";
        break;
      case "endless_chance":
        state.lastBuzzes = [...state.buzzes];
        state.buzzes = [];
        state.phase = "question";
        break;
      case "second_chance":
        state.buzzes = state.buzzes.slice(1);
        if (state.buzzes.length > 0) {
          state.phase = "buzzed";
        } else {
          state.lastBuzzes = [];
          state.phase = "waiting";
        }
        break;
      default:
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

  private applyCorrectJudge(state: RoomState, answerer: Player): void {
    answerer.correctCount += 1;

    switch (state.ruleType) {
      case "simple":
        answerer.score += 1;
        break;
      case "mon_batsu":
      case "mon_kyu":
        answerer.score = answerer.correctCount;
        if (answerer.correctCount >= state.winCount) answerer.hasWon = true;
        break;
      case "nbn":
        answerer.score = answerer.correctCount;
        if (
          answerer.correctCount >= state.nbyN &&
          answerer.incorrectCount < state.nbyN
        ) {
          answerer.hasWon = true;
        }
        break;
      case "points":
        answerer.score += state.addPoints;
        if (state.nonBuzzerPoints > 0) {
          const buzzedIds = new Set(state.buzzes.map((b) => b.playerId));
          for (const p of Object.values(state.players)) {
            if (!buzzedIds.has(p.id) && !p.isEliminated && !p.hasWon) {
              p.score += state.nonBuzzerPoints;
            }
          }
        }
        if (answerer.score >= state.winPoints) answerer.hasWon = true;
        break;
    }

    state.lastBuzzes = [...state.buzzes];
    state.phase = "result";
  }

  private applyIncorrectJudge(state: RoomState, answerer: Player): void {
    answerer.incorrectCount += 1;

    switch (state.ruleType) {
      case "mon_batsu":
        if (answerer.incorrectCount >= state.eliminateCount) {
          answerer.isEliminated = true;
          state.buzzes = state.buzzes.filter((b) => b.playerId !== answerer.id);
        }
        break;
      case "mon_kyu":
        answerer.suspendedUntilQuestion =
          state.currentQuestionIndex + state.eliminateCount;
        break;
      case "nbn":
        if (answerer.incorrectCount >= state.nbyN) {
          answerer.isEliminated = true;
          state.buzzes = state.buzzes.filter((b) => b.playerId !== answerer.id);
        }
        break;
      case "points":
        answerer.score -= state.subtractPoints;
        if (
          state.eliminatePoints !== null &&
          answerer.score <= state.eliminatePoints
        ) {
          answerer.isEliminated = true;
          state.buzzes = state.buzzes.filter((b) => b.playerId !== answerer.id);
        }
        break;
    }

    this.applyTransitionOnIncorrect(state);
  }

  private async handleMessage(
    connection: Connection<ConnectionSession>,
    msg: ClientMessage,
    state: RoomState,
  ) {
    switch (msg.type) {
      case "join": {
        const playerId = msg.sessionId?.trim() || connection.id;
        const playerName = msg.name.trim() || "名無し";

        const duplicateNameEntry = Object.entries(state.players).find(
          ([id, p]) => id !== playerId && p.name === playerName,
        );
        if (duplicateNameEntry) {
          this.send(connection, {
            type: "error",
            message: "同じ名前のプレイヤーがすでに参加しています。",
          });
          this.send(connection, { type: "room_state", state });
          return;
        }

        const existing = state.players[playerId];
        connection.setState({ playerId });

        if (existing) {
          existing.name = playerName;
        } else if (!state.players[playerId]) {
          const isFirst = Object.keys(state.players).length === 0;

          const player = this.newPlayer(
            playerId,
            playerName,
            isFirst ? "host" : "player",
          );
          if (isFirst) state.hostId = playerId;
          state.players[playerId] = player;
        }

        this.syncPlayerRoles(state);
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "leave_host": {
        const playerId = this.getPlayerId(connection);
        if (!playerId || playerId !== state.hostId) return;
        if (!this.canChangeHost(state)) {
          this.send(connection, {
            type: "error",
            message: "問題中はホストを抜けられません。",
          });
          return;
        }

        state.hostId = null;
        this.syncPlayerRoles(state);
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "claim_host": {
        const playerId = this.getPlayerId(connection);
        if (!playerId || !state.players[playerId]) return;
        if (state.hostId) return;
        if (!this.canChangeHost(state)) {
          this.send(connection, {
            type: "error",
            message: "問題中はホストになれません。",
          });
          return;
        }

        state.hostId = playerId;
        this.syncPlayerRoles(state);
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "send_chat": {
        const playerId = this.getPlayerId(connection);
        if (!playerId) return;
        const player = state.players[playerId];
        if (!player) return;

        const text = msg.text.trim().slice(0, MAX_CHAT_TEXT_LENGTH);
        if (!text) return;

        const sentAt = Date.now();
        const chatMessage: ChatMessage = {
          id: `${sentAt}-${playerId}-${state.chatMessages.length}`,
          playerId,
          playerName: player.name,
          text,
          sentAt,
        };

        const nextState = await this.appendChatMessage(chatMessage);
        this.broadcast(
          JSON.stringify({
            type: "room_state",
            state: nextState,
          } satisfies ServerMessage),
        );
        break;
      }

      case "buzz": {
        if (state.phase !== "question" && state.phase !== "buzzed") return;
        const playerId = this.getPlayerId(connection);
        if (!playerId) return;
        const player = state.players[playerId];
        if (!player || player.isEliminated || player.hasWon) return;
        if (this.isSuspended(player, state.currentQuestionIndex)) return;
        if (state.buzzes.some((b) => b.playerId === playerId)) return;

        const entry: BuzzEntry = {
          playerId,
          buzzedAt: Date.now(),
        };
        state.buzzes.push(entry);
        if (state.phase === "question") state.phase = "buzzed";
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({
            type: "buzz_accepted",
            entry,
            playerName: player.name,
          } satisfies ServerMessage),
        );
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "start_question": {
        const playerId = this.getPlayerId(connection);
        if (playerId !== state.hostId) return;
        state.lastBuzzes = [...state.buzzes];
        state.buzzes = [];
        state.phase = "question";
        state.currentQuestionIndex += 1;
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "judge": {
        const playerId = this.getPlayerId(connection);
        if (playerId !== state.hostId || state.phase !== "buzzed") return;
        const first = state.buzzes[0];
        if (!first) return;
        const answerer = state.players[first.playerId];
        if (!answerer) return;

        if (msg.correct) {
          this.applyCorrectJudge(state, answerer);
        } else {
          this.applyIncorrectJudge(state, answerer);
        }

        await this.saveState(state);
        this.broadcast(
          JSON.stringify({
            type: "judge_result",
            correct: msg.correct,
            playerId: answerer.id,
            scores: Object.fromEntries(
              Object.entries(state.players).map(([id, p]) => [id, p.score]),
            ),
          } satisfies ServerMessage),
        );
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "through": {
        const playerId = this.getPlayerId(connection);
        if (playerId !== state.hostId) return;
        if (state.phase !== "question" && state.phase !== "buzzed") return;

        if (state.phase === "buzzed") {
          state.buzzes = state.buzzes.slice(1);
          if (state.buzzes.length > 0) {
            state.phase = "buzzed";
          } else {
            state.phase = "waiting";
          }
        } else {
          state.lastBuzzes = [...state.buzzes];
          state.buzzes = [];
          state.phase = "question";
          state.currentQuestionIndex += 1;
        }

        await this.saveState(state);
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "next_question": {
        const playerId = this.getPlayerId(connection);
        if (playerId !== state.hostId) return;
        state.lastBuzzes = [...state.buzzes];
        state.buzzes = [];
        state.phase = "waiting";
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "finish_game": {
        const playerId = this.getPlayerId(connection);
        if (playerId !== state.hostId) return;
        state.phase = "finished";
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({
            type: "game_finished",
            scores: Object.fromEntries(
              Object.entries(state.players).map(([id, p]) => [id, p.score]),
            ),
          } satisfies ServerMessage),
        );
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "set_total_questions": {
        const playerId = this.getPlayerId(connection);
        if (playerId !== state.hostId) return;
        state.totalQuestions = msg.total;
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "set_player_stats": {
        const playerId = this.getPlayerId(connection);
        if (playerId !== state.hostId) return;
        const target = state.players[msg.playerId];
        if (!target) return;

        if (msg.score != null) {
          target.score = this.clampInteger(msg.score, -9999, 9999);
        }
        if (msg.correctCount != null) {
          target.correctCount = this.clampInteger(msg.correctCount, 0, 999);
        }
        if (msg.incorrectCount != null) {
          target.incorrectCount = this.clampInteger(msg.incorrectCount, 0, 999);
        }

        this.refreshPlayerOutcome(state, target);
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "start_game": {
        const playerId = this.getPlayerId(connection);
        if (playerId !== state.hostId || state.phase !== "lobby") return;
        state.phase = "waiting";
        state.currentQuestionIndex = 0;
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "restart_game": {
        const playerId = this.getPlayerId(connection);
        if (playerId !== state.hostId || state.phase !== "finished") return;
        // プレイヤーのスコアをリセットしてロビーへ
        for (const p of Object.values(state.players)) {
          p.score = 0;
          p.correctCount = 0;
          p.incorrectCount = 0;
          p.isEliminated = false;
          p.hasWon = false;
          p.suspendedUntilQuestion = 0;
        }
        state.phase = "lobby";
        state.currentQuestionIndex = 0;
        state.buzzes = [];
        state.lastBuzzes = [];
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }

      case "set_rule": {
        // ゲーム開始後はルール変更不可
        const playerId = this.getPlayerId(connection);
        if (playerId !== state.hostId || state.phase !== "lobby") return;
        if (msg.ruleType != null) state.ruleType = msg.ruleType;
        if (msg.answerTransition != null)
          state.answerTransition = msg.answerTransition;
        if (msg.winCount != null) state.winCount = msg.winCount;
        if (msg.eliminateCount != null)
          state.eliminateCount = msg.eliminateCount;
        if (msg.nbyN != null) state.nbyN = msg.nbyN;
        if (msg.addPoints != null) state.addPoints = msg.addPoints;
        if (msg.subtractPoints != null)
          state.subtractPoints = msg.subtractPoints;
        if (msg.winPoints != null) state.winPoints = msg.winPoints;
        if ("eliminatePoints" in msg)
          state.eliminatePoints = msg.eliminatePoints ?? null;
        if (msg.nonBuzzerPoints != null)
          state.nonBuzzerPoints = msg.nonBuzzerPoints;
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
        );
        break;
      }
    }
  }
}
