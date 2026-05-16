import type { Connection, WSMessage } from "partyserver";
import { Server } from "partyserver";
import { createActor, type SnapshotFrom } from "xstate";
import { quizRoomMachine } from "./quiz-room.machine";
import type {
  BoardAnswer,
  BoardJudgement,
  BoardState,
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
const BOARD_STATE_KEY = "board-state";
const MAX_CHAT_MESSAGES = 100;
const MAX_CHAT_TEXT_LENGTH = 300;
const MAX_BOARD_TEXT_LENGTH = 300;
const EMPTY_ROOM_CLEANUP_DELAY_MS = 5 * 60 * 1000;

function makeInitialBoardState(): BoardState {
  return { status: "closed", sessionId: crypto.randomUUID(), answers: {} };
}

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
    maxWinners: 0,
    boardEnabled: false,
  };
}
function isSnapshot(
  data: unknown,
): data is SnapshotFrom<typeof quizRoomMachine> {
  return (
    typeof data === "object" &&
    data !== null &&
    "status" in data &&
    "value" in data &&
    "context" in data
  );
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
    if (msg.type === "open_board") {
      await this.handleOpenBoard(connection);
      return;
    }
    if (msg.type === "close_board") {
      await this.handleCloseBoard(connection);
      return;
    }
    if (msg.type === "submit_board_answer") {
      await this.handleSubmitBoardAnswer(connection, msg.text);
      return;
    }
    if (msg.type === "reveal_board_answers") {
      await this.handleRevealBoardAnswers(connection);
      return;
    }
    if (msg.type === "hide_board_answers") {
      await this.handleHideBoardAnswers(connection);
      return;
    }
    if (msg.type === "judge_board_answer") {
      await this.handleJudgeBoardAnswer(
        connection,
        msg.playerId,
        msg.judgement,
      );
      return;
    }
    if (msg.type === "clear_board") {
      await this.handleClearBoard(connection);
      return;
    }
    if (msg.type === "apply_board_scores") {
      await this.handleApplyBoardScores(connection);
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
    const [snapshot, chatMessages, board] = await Promise.all([
      this.ctx.storage.get<unknown>(ROOM_STATE_KEY),
      this.ctx.storage.get<ChatMessage[]>(CHAT_MESSAGES_KEY),
      this.ctx.storage.get<BoardState>(BOARD_STATE_KEY),
    ]);

    const context = isSnapshot(snapshot)
      ? snapshot.context
      : makeContext(this.name);

    return {
      ...context,
      chatMessages: chatMessages ?? [],
      board: board ?? makeInitialBoardState(),
    };
  }

  private async broadcastRoomState(
    emit: QuizEmit & { type: "broadcastRoomState" },
  ) {
    const [chatMessages, board] = await Promise.all([
      this.ctx.storage.get<ChatMessage[]>(CHAT_MESSAGES_KEY),
      this.ctx.storage.get<BoardState>(BOARD_STATE_KEY),
    ]);
    this.broadcast(
      JSON.stringify({
        type: "room_state",
        state: {
          ...emit.state,
          chatMessages: chatMessages ?? [],
          board: board ?? makeInitialBoardState(),
        },
      } satisfies ServerMessage),
    );
  }

  private async broadcastCurrentRoomState() {
    const state = await this.getCurrentState();
    this.broadcast(
      JSON.stringify({ type: "room_state", state } satisfies ServerMessage),
    );
  }

  private async processEvent(event: QuizEvent): Promise<QuizEmit[]> {
    const input = makeContext(this.name);
    const stored = await this.ctx.storage.get<unknown>(ROOM_STATE_KEY);

    const actor = isSnapshot(stored)
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
        connection.setState({ playerId: id });
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
      case "resume_game":
        if (!playerId) return null;
        return { type: "RESUME_GAME", playerId };
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
          maxWinners: msg.maxWinners,
          boardEnabled: msg.boardEnabled,
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

    const context = isSnapshot(stored)
      ? stored.context
      : makeContext(this.name);

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
    await this.broadcastCurrentRoomState();
  }

  private async getBoardAndContext(): Promise<{
    board: BoardState;
    context: QuizContext;
  }> {
    const [snapshot, board] = await Promise.all([
      this.ctx.storage.get<unknown>(ROOM_STATE_KEY),
      this.ctx.storage.get<BoardState>(BOARD_STATE_KEY),
    ]);
    const context = isSnapshot(snapshot)
      ? snapshot.context
      : makeContext(this.name);
    return { board: board ?? makeInitialBoardState(), context };
  }

  private async saveBoardAndBroadcast(board: BoardState): Promise<void> {
    await this.ctx.storage.put(BOARD_STATE_KEY, board);
    await this.broadcastCurrentRoomState();
  }

  private async handleOpenBoard(
    connection: Connection<ConnectionSession>,
  ): Promise<void> {
    const playerId = connection.state?.playerId;
    if (!playerId) return;
    const { context } = await this.getBoardAndContext();
    if (context.hostId !== playerId) return;
    await this.saveBoardAndBroadcast({
      status: "answering",
      sessionId: crypto.randomUUID(),
      answers: {},
    });
  }

  private async handleCloseBoard(
    connection: Connection<ConnectionSession>,
  ): Promise<void> {
    const playerId = connection.state?.playerId;
    if (!playerId) return;
    const { board, context } = await this.getBoardAndContext();
    if (context.hostId !== playerId) return;
    await this.saveBoardAndBroadcast({ ...board, status: "closed" });
  }

  private async handleSubmitBoardAnswer(
    connection: Connection<ConnectionSession>,
    text: string,
  ): Promise<void> {
    const playerId = connection.state?.playerId;
    if (!playerId) return;
    const { board, context } = await this.getBoardAndContext();
    if (board.status !== "answering") return;
    if (context.hostId === playerId) return;
    if (board.answers[playerId]) return;
    const player = context.players[playerId];
    if (!player) return;
    const trimmed = text.trim().slice(0, MAX_BOARD_TEXT_LENGTH);
    if (!trimmed) return;
    const next: BoardState = {
      ...board,
      answers: {
        ...board.answers,
        [playerId]: {
          playerId,
          text: trimmed,
          submittedAt: Date.now(),
          judgement: null,
        } satisfies BoardAnswer,
      },
    };
    await this.saveBoardAndBroadcast(next);
  }

  private async handleRevealBoardAnswers(
    connection: Connection<ConnectionSession>,
  ): Promise<void> {
    const playerId = connection.state?.playerId;
    if (!playerId) return;
    const { board, context } = await this.getBoardAndContext();
    if (context.hostId !== playerId) return;
    await this.saveBoardAndBroadcast({ ...board, status: "revealed" });
  }

  private async handleHideBoardAnswers(
    connection: Connection<ConnectionSession>,
  ): Promise<void> {
    const playerId = connection.state?.playerId;
    if (!playerId) return;
    const { board, context } = await this.getBoardAndContext();
    if (context.hostId !== playerId) return;
    await this.saveBoardAndBroadcast({ ...board, status: "answering" });
  }

  private async handleJudgeBoardAnswer(
    connection: Connection<ConnectionSession>,
    targetPlayerId: PlayerId,
    judgement: BoardJudgement,
  ): Promise<void> {
    const playerId = connection.state?.playerId;
    if (!playerId) return;
    const { board, context } = await this.getBoardAndContext();
    if (context.hostId !== playerId) return;
    const answer = board.answers[targetPlayerId];
    if (!answer) return;
    const next: BoardState = {
      ...board,
      answers: {
        ...board.answers,
        [targetPlayerId]: { ...answer, judgement },
      },
    };
    await this.saveBoardAndBroadcast(next);
  }

  private async handleClearBoard(
    connection: Connection<ConnectionSession>,
  ): Promise<void> {
    const playerId = connection.state?.playerId;
    if (!playerId) return;
    const { context } = await this.getBoardAndContext();
    if (context.hostId !== playerId) return;
    await this.saveBoardAndBroadcast(makeInitialBoardState());
  }

  private async handleApplyBoardScores(
    connection: Connection<ConnectionSession>,
  ): Promise<void> {
    const playerId = connection.state?.playerId;
    if (!playerId) return;
    const { board, context } = await this.getBoardAndContext();
    if (context.hostId !== playerId) return;
    const judgements: Record<PlayerId, "correct" | "incorrect"> = {};
    for (const ans of Object.values(board.answers)) {
      if (ans.judgement === "correct" || ans.judgement === "incorrect") {
        judgements[ans.playerId] = ans.judgement;
      }
    }
    // board をクリアしてからスコアを反映（二重反映防止）
    await this.ctx.storage.put(BOARD_STATE_KEY, makeInitialBoardState());
    const emits = await this.processEvent({
      type: "APPLY_BOARD_SCORES",
      playerId,
      judgements,
    });
    await this.handleEmits(emits);
    // emitBroadcast が broadcastRoomState を呼ぶが、そこで最新 board（クリア済み）を合成して送る
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
