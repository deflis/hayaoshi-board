import { Server } from "partyserver";
import type { Connection, WSMessage } from "partyserver";
import type {
  BuzzEntry,
  ClientMessage,
  Player,
  RoomState,
  ServerMessage,
} from "./types";

export class QuizRoom extends Server<Env> {
  static options = { hibernate: true };

  async onStart() {
    const stored = await this.ctx.storage.get<RoomState>("state");
    if (!stored) {
      await this.ctx.storage.put("state", this.initialState());
    }
  }

  async onConnect(connection: Connection) {
    const state = await this.getState();
    this.send(connection, { type: "room_state", state });
  }

  async onMessage(connection: Connection, message: WSMessage) {
    const msg = JSON.parse(message as string) as ClientMessage;
    const state = await this.getState();
    await this.handleMessage(connection, msg, state);
  }

  async onClose(connection: Connection) {
    const state = await this.getState();
    if (!state.players[connection.id]) return;

    delete state.players[connection.id];
    state.buzzes = state.buzzes.filter((b) => b.playerId !== connection.id);

    if (state.hostId === connection.id) {
      const remaining = Object.keys(state.players);
      state.hostId = remaining[0] ?? null;
      if (state.hostId) {
        state.players[state.hostId].role = "host";
      }
    }

    await this.saveState(state);
    this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
  }

  private initialState(): RoomState {
    return {
      roomId: this.name,
      phase: "waiting",
      hostId: null,
      players: {},
      currentQuestionIndex: 0,
      totalQuestions: 10,
      buzzes: [],
      ruleType: "simple",
      winCount: 7,
      eliminateCount: 3,
      answerTransition: "all_order",
    };
  }

  private async getState(): Promise<RoomState> {
    const stored = await this.ctx.storage.get<RoomState>("state");
    if (!stored) return this.initialState();
    // 旧フォーマットからの移行
    if (!stored.buzzes) stored.buzzes = [];
    if (!stored.ruleType) stored.ruleType = "simple";
    if (stored.winCount == null) stored.winCount = 7;
    if (stored.eliminateCount == null) stored.eliminateCount = 3;
    if (!stored.answerTransition) stored.answerTransition = "all_order";
    // Player フィールド移行
    for (const p of Object.values(stored.players)) {
      if (p.correctCount == null) p.correctCount = p.score ?? 0;
      if (p.incorrectCount == null) p.incorrectCount = 0;
      if (p.isEliminated == null) p.isEliminated = false;
      if (p.hasWon == null) p.hasWon = false;
    }
    return stored;
  }

  private async saveState(state: RoomState) {
    await this.ctx.storage.put("state", state);
  }

  private send(connection: Connection, msg: ServerMessage) {
    connection.send(JSON.stringify(msg));
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
    };
  }

  private applyTransitionOnIncorrect(state: RoomState): void {
    switch (state.answerTransition) {
      case "single_chance":
        state.buzzes = [];
        state.phase = "waiting";
        break;
      case "endless_chance":
        state.buzzes = [];
        state.phase = "question";
        break;
      case "second_chance":
        state.buzzes = state.buzzes.slice(1);
        state.phase = state.buzzes.length > 0 ? "buzzed" : "waiting";
        break;
      case "all_order":
      default:
        state.buzzes = state.buzzes.slice(1);
        state.phase = state.buzzes.length > 0 ? "buzzed" : "question";
        break;
    }
  }

  private async handleMessage(
    connection: Connection,
    msg: ClientMessage,
    state: RoomState,
  ) {
    switch (msg.type) {
      case "join": {
        if (state.players[connection.id]) {
          this.send(connection, { type: "room_state", state });
          return;
        }
        const oldEntry = Object.entries(state.players).find(
          ([, p]) => p.name === msg.name,
        );
        if (oldEntry) {
          const [oldId, oldPlayer] = oldEntry;
          delete state.players[oldId];
          state.buzzes = state.buzzes.map((b) =>
            b.playerId === oldId ? { ...b, playerId: connection.id } : b,
          );
          state.players[connection.id] = { ...oldPlayer, id: connection.id };
          if (state.hostId === oldId) state.hostId = connection.id;
        } else {
          const isFirst = Object.keys(state.players).length === 0;
          const player = this.newPlayer(
            connection.id,
            msg.name,
            isFirst ? "host" : "player",
          );
          if (isFirst) state.hostId = connection.id;
          state.players[connection.id] = player;
        }
        await this.saveState(state);
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }

      case "buzz": {
        if (state.phase !== "question" && state.phase !== "buzzed") return;
        const player = state.players[connection.id];
        if (!player || player.isEliminated || player.hasWon) return;
        if (state.buzzes.some((b) => b.playerId === connection.id)) return;
        const entry: BuzzEntry = { playerId: connection.id, buzzedAt: Date.now() };
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
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }

      case "start_question": {
        if (connection.id !== state.hostId) return;
        state.phase = "question";
        state.buzzes = [];
        state.currentQuestionIndex += 1;
        await this.saveState(state);
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }

      case "judge": {
        if (connection.id !== state.hostId || state.phase !== "buzzed") return;
        const first = state.buzzes[0];
        if (!first) return;
        const answerer = first.playerId;
        const answererPlayer = state.players[answerer];
        if (!answererPlayer) return;

        if (msg.correct) {
          answererPlayer.correctCount += 1;
          answererPlayer.score = answererPlayer.correctCount;

          if (
            state.ruleType === "mon_batsu" &&
            answererPlayer.correctCount >= state.winCount
          ) {
            answererPlayer.hasWon = true;
          }
          state.phase = "result";
        } else {
          answererPlayer.incorrectCount += 1;

          if (
            state.ruleType === "mon_batsu" &&
            answererPlayer.incorrectCount >= state.eliminateCount
          ) {
            answererPlayer.isEliminated = true;
            // 失格者のバズをリストから除去
            state.buzzes = state.buzzes.filter((b) => b.playerId !== answerer);
          }

          this.applyTransitionOnIncorrect(state);
        }

        await this.saveState(state);
        this.broadcast(
          JSON.stringify({
            type: "judge_result",
            correct: msg.correct,
            playerId: answerer,
            scores: Object.fromEntries(
              Object.entries(state.players).map(([id, p]) => [id, p.correctCount]),
            ),
          } satisfies ServerMessage),
        );
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }

      case "next_question": {
        if (connection.id !== state.hostId) return;
        state.phase = "waiting";
        state.buzzes = [];
        await this.saveState(state);
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }

      case "finish_game": {
        if (connection.id !== state.hostId) return;
        state.phase = "finished";
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({
            type: "game_finished",
            scores: Object.fromEntries(
              Object.entries(state.players).map(([id, p]) => [id, p.correctCount]),
            ),
          } satisfies ServerMessage),
        );
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }

      case "set_total_questions": {
        if (connection.id !== state.hostId) return;
        state.totalQuestions = msg.total;
        await this.saveState(state);
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }

      case "set_rule": {
        if (connection.id !== state.hostId) return;
        if (msg.ruleType != null) state.ruleType = msg.ruleType;
        if (msg.winCount != null) state.winCount = msg.winCount;
        if (msg.eliminateCount != null) state.eliminateCount = msg.eliminateCount;
        if (msg.answerTransition != null) state.answerTransition = msg.answerTransition;
        await this.saveState(state);
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }
    }
  }
}
