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
    };
  }

  private async getState(): Promise<RoomState> {
    const stored = await this.ctx.storage.get<RoomState>("state");
    if (!stored) return this.initialState();
    // 旧フォーマット（buzzedPlayerId/buzzedAt）からの移行
    if (!stored.buzzes) stored.buzzes = [];
    return stored;
  }

  private async saveState(state: RoomState) {
    await this.ctx.storage.put("state", state);
  }

  private send(connection: Connection, msg: ServerMessage) {
    connection.send(JSON.stringify(msg));
  }

  private async handleMessage(
    connection: Connection,
    msg: ClientMessage,
    state: RoomState,
  ) {
    switch (msg.type) {
      case "join": {
        // 同じ connection で再 join → 現在の状態を返すだけ
        if (state.players[connection.id]) {
          this.send(connection, { type: "room_state", state });
          return;
        }

        // 同じ名前の古いエントリーがあれば引き継ぐ（再接続）
        const oldEntry = Object.entries(state.players).find(
          ([, p]) => p.name === msg.name,
        );
        if (oldEntry) {
          const [oldId, oldPlayer] = oldEntry;
          delete state.players[oldId];
          // buzz リストの古い ID を新しい ID に置き換え
          state.buzzes = state.buzzes.map((b) =>
            b.playerId === oldId ? { ...b, playerId: connection.id } : b,
          );
          state.players[connection.id] = { ...oldPlayer, id: connection.id };
          if (state.hostId === oldId) state.hostId = connection.id;
        } else {
          const isFirst = Object.keys(state.players).length === 0;
          const player: Player = {
            id: connection.id,
            name: msg.name,
            score: 0,
            role: isFirst ? "host" : "player",
          };
          if (isFirst) state.hostId = connection.id;
          state.players[connection.id] = player;
        }

        await this.saveState(state);
        this.broadcast(JSON.stringify({ type: "room_state", state } satisfies ServerMessage));
        break;
      }
      case "buzz": {
        if (state.phase !== "question" && state.phase !== "buzzed") return;
        // 同じプレイヤーが二重に押すのを防ぐ
        if (state.buzzes.some((b) => b.playerId === connection.id)) return;
        const entry: BuzzEntry = {
          playerId: connection.id,
          buzzedAt: Date.now(),
        };
        state.buzzes.push(entry);
        // 最初の押下でフェーズを "buzzed" に遷移
        if (state.phase === "question") {
          state.phase = "buzzed";
        }
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({
            type: "buzz_accepted",
            entry,
            playerName: state.players[connection.id]?.name ?? "Unknown",
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
        if (msg.correct) {
          state.players[answerer].score += 1;
          state.phase = "result";
        } else {
          // 不正解: 先頭を除いて次の人を待つ
          state.buzzes = state.buzzes.slice(1);
          state.phase = state.buzzes.length > 0 ? "buzzed" : "question";
        }
        await this.saveState(state);
        this.broadcast(
          JSON.stringify({
            type: "judge_result",
            correct: msg.correct,
            playerId: answerer,
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
    }
  }
}
