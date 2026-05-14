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

  private async getState(): Promise<RoomState> {
    const stored = await this.ctx.storage.get<RoomState>("state");
    if (!stored) return this.initialState();
    const init = this.initialState();
    // 旧フォーマットからの移行（存在しないフィールドをデフォルト値で補完）
    const s = { ...init, ...stored };
    if (!s.lastBuzzes) s.lastBuzzes = [];
    for (const p of Object.values(s.players)) {
      if (p.correctCount == null) p.correctCount = p.score ?? 0;
      if (p.incorrectCount == null) p.incorrectCount = 0;
      if (p.isEliminated == null) p.isEliminated = false;
      if (p.hasWon == null) p.hasWon = false;
      if (p.suspendedUntilQuestion == null) p.suspendedUntilQuestion = 0;
    }
    return s;
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
      suspendedUntilQuestion: 0,
    };
  }

  private isSuspended(player: Player, questionIndex: number): boolean {
    return player.suspendedUntilQuestion > 0 && questionIndex <= player.suspendedUntilQuestion;
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
      case "all_order":
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
        if (answerer.correctCount >= state.nbyN && answerer.incorrectCount < state.nbyN) {
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
          state.lastBuzzes = state.lastBuzzes.map((b) =>
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
        if (this.isSuspended(player, state.currentQuestionIndex)) return;
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
        state.lastBuzzes = [...state.buzzes];
        state.buzzes = [];
        state.phase = "question";
        state.currentQuestionIndex += 1;
        await this.saveState(state);
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }

      case "judge": {
        if (connection.id !== state.hostId || state.phase !== "buzzed") return;
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
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }

      case "next_question": {
        if (connection.id !== state.hostId) return;
        state.lastBuzzes = [...state.buzzes];
        state.buzzes = [];
        state.phase = "waiting";
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
              Object.entries(state.players).map(([id, p]) => [id, p.score]),
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

      case "start_game": {
        if (connection.id !== state.hostId || state.phase !== "lobby") return;
        state.phase = "waiting";
        state.currentQuestionIndex = 0;
        await this.saveState(state);
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }

      case "restart_game": {
        if (connection.id !== state.hostId || state.phase !== "finished") return;
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
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }

      case "set_rule": {
        // ゲーム開始後はルール変更不可
        if (connection.id !== state.hostId || state.phase !== "lobby") return;
        if (msg.ruleType != null) state.ruleType = msg.ruleType;
        if (msg.answerTransition != null) state.answerTransition = msg.answerTransition;
        if (msg.winCount != null) state.winCount = msg.winCount;
        if (msg.eliminateCount != null) state.eliminateCount = msg.eliminateCount;
        if (msg.nbyN != null) state.nbyN = msg.nbyN;
        if (msg.addPoints != null) state.addPoints = msg.addPoints;
        if (msg.subtractPoints != null) state.subtractPoints = msg.subtractPoints;
        if (msg.winPoints != null) state.winPoints = msg.winPoints;
        if ("eliminatePoints" in msg) state.eliminatePoints = msg.eliminatePoints ?? null;
        if (msg.nonBuzzerPoints != null) state.nonBuzzerPoints = msg.nonBuzzerPoints;
        await this.saveState(state);
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }
    }
  }
}
