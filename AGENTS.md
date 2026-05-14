# hayaoshi-board

早押しボード — オンライン早押しクイズプラットフォーム。

## 技術スタック

- **Runtime**: Bun
- **Framework**: TanStack Start (React 19, SSR)
- **Routing**: TanStack Router (file-based)
- **Styling**: Tailwind CSS v4
- **Backend**: Cloudflare Workers + Hono API
- **リアルタイム通信**: PartyServer / PartySocket (WebSocket + Durable Objects)
- **データ同期**: Yjs (CRDT)
- **Lint/Format**: Biome
- **Deploy**: Cloudflare Workers (Wrangler)

## アーキテクチャの要点

- `worker.ts` が Cloudflare Workers のエントリーポイント。PartyServer の WebSocket ルーティング → Hono API → TanStack Start SSR の順でフォールバック。
- `src/party/quiz-room.ts` が各クイズルームの Durable Object。プレイヤーの参加、バズ、判定、ルール管理などすべてのゲームロジックを担当。
- PartySocket を使ってクライアントと DO が WebSocket で通信。メッセージ型は `ClientMessage` / `ServerMessage` (party/types.ts 参照)。
