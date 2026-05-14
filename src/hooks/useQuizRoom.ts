import usePartySocket from "partysocket/react";
import { useCallback, useRef, useState } from "react";
import type { ClientMessage, RoomState, ServerMessage } from "../party/types";

function createSessionId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getOrCreateSessionId(roomId: string): string {
	if (typeof window === "undefined") return "server";

	const key = `hayaoshi-board:session:${roomId}`;
	const sessionId = createSessionId();

	try {
		const existing = window.localStorage.getItem(key);
		if (existing) return existing;
		window.localStorage.setItem(key, sessionId);
	} catch {
		return sessionId;
	}

	return sessionId;
}

export function useQuizRoom(roomId: string, playerName: string) {
	const [roomState, setRoomState] = useState<RoomState | null>(null);
	const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [sessionId] = useState(() => getOrCreateSessionId(roomId));
	// ref 経由で最新の playerName を onOpen クロージャに渡す
	const playerNameRef = useRef(playerName);
	playerNameRef.current = playerName;

	const socket = usePartySocket({
		host:
			typeof window !== "undefined" ? window.location.host : "localhost:3000",
		party: "quiz-room",
		room: roomId,
		onOpen(event) {
			// 再接続時も含め毎回 join を送り直す。myPlayerId は room_state で再特定する
			setErrorMessage(null);
			setMyPlayerId(null);
			(event.target as WebSocket).send(
				JSON.stringify({
					type: "join",
					name: playerNameRef.current,
					sessionId,
				} satisfies ClientMessage),
			);
		},
		onMessage(event: MessageEvent) {
			const msg = JSON.parse(event.data as string) as ServerMessage;
			if (msg.type === "room_state") {
				const state = msg.state;
				setRoomState(state);
				// 永続セッションIDで自分のエントリーを復元する。旧データのみ名前で補完する。
				setMyPlayerId((prev) => {
					if (prev && state.players[prev]) return prev;
					if (state.players[sessionId]) return sessionId;
					return null;
				});
				if (state.players[sessionId]) {
					setErrorMessage(null);
				}
			} else if (msg.type === "error") {
				setErrorMessage(msg.message);
			}
		},
	});

	const sendMessage = useCallback(
		(msg: ClientMessage) => {
			socket.send(
				JSON.stringify({ ...msg, sessionId } satisfies ClientMessage),
			);
		},
		[socket, sessionId],
	);

	const isHost = myPlayerId !== null && roomState?.hostId === myPlayerId;

	return { roomState, sendMessage, myPlayerId, isHost, errorMessage };
}
