# hayaoshi-board

早押しボード — オンライン早押しクイズプラットフォーム。

## 技術スタック

- **Runtime**: Bun
- **Framework**: TanStack Start (React 19, SSR)
- **Routing**: TanStack Router (file-based)
- **Styling**: Tailwind CSS v4
- **Backend**: Cloudflare Workers + Hono API
- **リアルタイム通信**: PartyServer / PartySocket (WebSocket + Durable Objects)
- **データ同期**: Yjs (CRDT) — ルーム状態の永続化に使用
- **Lint/Format**: Biome
- **Deploy**: Cloudflare Workers (Wrangler)

## アーキテクチャの要点

- `worker.ts` が Cloudflare Workers のエントリーポイント。`hono-party` の `partyserverMiddleware` → Hono API → TanStack Start SSR の順でフォールバック。
- `src/party/quiz-room.ts` が各クイズルームの Durable Object (`QuizRoom extends Server`)。ゲームロジック全担当。Yjs で状態を永続化し、チャットは別途 Yjs Array に保存。
- `src/party/types.ts` が WebSocket メッセージ型 (`ClientMessage` / `ServerMessage`) とゲーム状態型 (`RoomState`, `Player` など) を定義。

## セッション管理

- クライアントは `localStorage` にルームごとの `sessionId` (UUID) を保持。
- 再接続時も同じ `sessionId` で `join` を送ることで、プレイヤーエントリーが復元される。
- WebSocket は `usePartySocket` (partysocket/react) を使用。
