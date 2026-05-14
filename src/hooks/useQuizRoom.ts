import usePartySocket from "partysocket/react";
import { useCallback, useRef, useState } from "react";
import type { ClientMessage, RoomState, ServerMessage } from "../party/types";

export function useQuizRoom(roomId: string, playerName: string) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  // ref 経由で最新の playerName を onOpen クロージャに渡す
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;

  const socket = usePartySocket({
    host: typeof window !== "undefined" ? window.location.host : "localhost:3000",
    party: "quiz-room",
    room: roomId,
    onOpen(event) {
      // 再接続時も含め毎回 join を送り直す。myPlayerId は room_state で再特定する
      setMyPlayerId(null);
      (event.target as WebSocket).send(
        JSON.stringify({ type: "join", name: playerNameRef.current } satisfies ClientMessage),
      );
    },
    onMessage(event: MessageEvent) {
      const msg = JSON.parse(event.data as string) as ServerMessage;
      if (msg.type === "room_state") {
        const state = msg.state;
        setRoomState(state);
        // 自分のエントリーを名前で特定して myPlayerId をセット
        setMyPlayerId((prev) => {
          if (prev && state.players[prev]) return prev;
          const found = Object.values(state.players).find(
            (p) => p.name === playerNameRef.current,
          );
          return found?.id ?? null;
        });
      }
    },
  });

  const sendMessage = useCallback(
    (msg: ClientMessage) => {
      socket.send(JSON.stringify(msg));
    },
    [socket],
  );

  const isHost = myPlayerId !== null && roomState?.hostId === myPlayerId;

  return { roomState, sendMessage, myPlayerId, isHost };
}
