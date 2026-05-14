# 早押しボードクイズ機能設計書

## 1. 概要

既存の「早押しボタン競争型」クイズに、**「ボードクイズ」サブモード**を追加する。

ボードクイズでは、誰かがボタンを押した後に**全員が解答入力**できる。回答内容は**ホストが自由に公開/非公開**を切り替え可能であり、**開くタイミングと正誤判定タイミングは独立**している。

既存のルール（simple / m○n× / m○n休 / NbyN / +N/-M）をそのまま流用し、各プレイヤーごとに正解なら加点・不正解なら減点する。

## 2. 用語

| 用語 | 説明 |
|------|------|
| **通常モード** | 既存の「ボタンを押した1人が回答権を得る」モード |
| **ボードモード** | 本設計書で追加する「全員が回答入力する」モード |
| **回答非公開** | 回答内容がホストのみ閲覧可能な状態 |
| **回答公開** | 全員が各プレイヤーの回答内容を閲覧できる状態 |
| **判定** | ホストが各プレイヤーの回答に対して正誤を決定すること |

## 3. 機能要件

### 3.1 基本フロー

1. **ロビー**でモードを選択（通常 / ボード）
2. **問題開始** → 通常通りボタン受付
3. **誰かがボタンを押す** → 問題停止 → **全員が回答入力可能**に
4. **各プレイヤーが回答送信**（ホストも含む）
   - 他プレイヤーには「回答済み / 未回答」のみ表示
   - 回答内容は非公開
5. **ホストが回答を公開/非公開を自由に切り替え**
6. **ホストが各プレイヤー個別に正誤判定**
7. **次の問題へ**（回答リセット）

### 3.2 ホストの操作権限

| 操作 | 説明 |
|------|------|
| 回答公開 | 全員の回答内容を全プレイヤーに表示する |
| 回答非公開 | 再びホストのみ閲覧可能な状態に戻す |
| 正誤判定 | 各プレイヤーごとに正解 / 不正解を決定 |
| 回答締切 | 未回答者を強制的に受付終了（不正解扱い or スキップ） |
| 回答リセット | 次の問題へ進む際に全回答をクリア |

### 3.3 プレイヤー体験

- ボタン押下後、専用の回答入力欄が表示される
- 「送信」ボタンを押して回答を確定する
- 自分の回答は送信後に修正不可
- 他プレイヤーの回答状況（回答済み人数 / 未回答人数）は確認できる
- ホストが公開すると、全員の回答内容が一括で表示される
- 判定後、自分の正誤とポイント変動が通知される

## 4. データ構造

### 4.1 新規型定義

```typescript
// src/party/types.ts

/** プレイヤーの回答データ */
export interface PlayerAnswer {
  playerId: PlayerId;
  text: string;              // 回答内容
  submittedAt: number;       // 送信時刻（unix timestamp ms）
}

/** ボードクイズの回答フェーズ */
export type BoardPhase =
  | "buzzing"     // ボタン受付中（通常モードと同じ）
  | "answering"   // 回答受付中
  | "judging"     // 判定中（回答締切済み）
  | "revealed";   // 回答公開中

/** モード切替 */
export type GameMode = "normal" | "board";
```

### 4.2 RoomState 拡張

```typescript
export interface RoomState {
  // === 既存フィールド ===
  roomId: string;
  phase: RoomPhase;
  hostId: PlayerId | null;
  players: Record<PlayerId, Player>;
  currentQuestionIndex: number;
  totalQuestions: number;
  buzzes: BuzzEntry[];
  lastBuzzes: BuzzEntry[];
  chatMessages: ChatMessage[];
  ruleType: RuleType;
  answerTransition: AnswerTransitionRule;
  winCount: number;
  eliminateCount: number;
  nbyN: number;
  addPoints: number;
  subtractPoints: number;
  winPoints: number;
  eliminatePoints: number | null;
  nonBuzzerPoints: number;

  // === 新規フィールド ===
  gameMode: GameMode;                    // 通常 or ボード
  playerAnswers: Record<PlayerId, PlayerAnswer>; // 各プレイヤーの回答
  answersRevealed: boolean;              // 回答公開状態
  boardPhase: BoardPhase;               // ボードモード専用フェーズ
}
```

### 4.3 初期値

```typescript
private initialState(): RoomState {
  return {
    // ... 既存フィールド
    gameMode: "normal",
    playerAnswers: {},
    answersRevealed: false,
    boardPhase: "buzzing",
  };
}
```

## 5. WebSocket メッセージ定義

### 5.1 Client → Server

```typescript
export type ClientMessage = (
  // === 既存メッセージ ===
  | { type: "join"; name: string; sessionId?: PlayerId }
  | { type: "send_chat"; text: string }
  // ... (その他既存メッセージ)

  // === 新規メッセージ ===
  // プレイヤーが回答を送信
  | { type: "submit_answer"; text: string }

  // ホスト: モード切替（ロビーのみ）
  | { type: "set_game_mode"; mode: GameMode }

  // ホスト: 回答を公開する
  | { type: "reveal_answers" }

  // ホスト: 回答を非公開に戻す
  | { type: "hide_answers" }

  // ホスト: 回答締切（未回答者を強制終了）
  | { type: "close_answering" }

  // ホスト: 各プレイヤーの正誤判定
  | { type: "judge_player"; playerId: PlayerId; correct: boolean }

  // ホスト: 次の問題へ（回答リセット含む）
  | { type: "next_question" }

  // ホスト: 全員分の判定を一括で適用
  | { type: "judge_all"; correctPlayerIds: PlayerId[] }
) & { sessionId?: PlayerId };
```

### 5.2 Server → Client

```typescript
export type ServerMessage =
  // === 既存メッセージ ===
  | { type: "room_state"; state: RoomState }
  | { type: "buzz_accepted"; entry: BuzzEntry; playerName: string }
  | { type: "judge_result"; correct: boolean; playerId: PlayerId; scores: Record<PlayerId, number> }
  | { type: "game_finished"; scores: Record<PlayerId, number> }
  | { type: "error"; message: string }

  // === 新規メッセージ ===
  // 誰かが回答しました（回答内容なし）
  | { type: "answer_submitted"; playerId: PlayerId; playerName: string }

  // 回答が公開された（全プレイヤーに回答内容を送信）
  | { type: "answers_revealed"; answers: Record<PlayerId, PlayerAnswer> }

  // 回答が非公開に戻された
  | { type: "answers_hidden" }

  // 回答受付が締め切られた
  | { type: "answering_closed" }

  // 特定プレイヤーの判定結果
  | { type: "player_judged"; playerId: PlayerId; correct: boolean; score: number };
```

## 6. サーバー側ロジック設計

### 6.1 ハンドラ一覧

#### `submit_answer`

```
1. ボードモードか確認（gameMode !== "board" → 無視）
2. boardPhase が "answering" か確認
3. プレイヤーが存在し、未回答か確認
4. playerAnswers[playerId] = { playerId, text, submittedAt }
5. 保存 & ブロードキャスト
   → 送信者: "room_state"（自分の回答確認用）
   → 全員: "answer_submitted"（誰かが回答済みの通知）
```

#### `reveal_answers`（ホストのみ）

```
1. ホスト権限確認
2. answersRevealed = true
3. boardPhase = "revealed"
4. 全員に "answers_revealed" + 回答内容をブロードキャスト
```

#### `hide_answers`（ホストのみ）

```
1. ホスト権限確認
2. answersRevealed = false
3. boardPhase = "judging"（既に judging ならそのまま）
4. 全員に "answers_hidden" をブロードキャスト
   → プレイヤー側は回答内容を非表示にし、回答済み/未回答の表示に戻す
```

#### `close_answering`（ホストのみ）

```
1. ホスト権限確認
2. boardPhase = "judging"
3. 未回答プレイヤーは不正解扱い（isCorrect = false）としてマーク
4. 全員に "answering_closed" をブロードキャスト
```

#### `judge_player`（ホストのみ）

```
1. ホスト権限確認
2. boardPhase が "judging" or "revealed" か確認
3. 対象プレイヤーの回答が存在するか確認
4. 正誤を記録し、既存の applyCorrectJudge / applyIncorrectJudge を流用してスコア計算
5. "player_judged" を全員にブロードキャスト
6. 全員の判定が終了したら boardPhase = "judging_complete"
```

#### `judge_all`（ホストのみ、一括判定）

```
1. ホスト権限確認
2. correctPlayerIds に含まれるプレイヤー → 正解
3. それ以外の回答済みプレイヤー → 不正解
4. 未回答プレイヤー → 不正解（or スキップ）
5. 各プレイヤーに対して applyCorrectJudge / applyIncorrectJudge を実行
6. "room_state" をブロードキャスト（スコア反映済み）
```

#### `next_question`（既存メッセージ拡張）

```
1. ホスト権限確認
2. playerAnswers = {}（回答リセット）
3. answersRevealed = false
4. boardPhase = "buzzing"
5. 既存の next_question ロジックを実行
```

#### `set_game_mode`（ロビーのみ）

```
1. ホスト権限確認
2. phase === "lobby" か確認（ゲーム開始後は変更不可）
3. gameMode = msg.mode
4. ブロードキャスト
```

### 6.2 モードによる振り分け

通常モード（`gameMode === "normal"`）の場合:
- 既存のフローをそのまま適用
- ボタン押下後、1着目のみが回答権を持つ
- `submit_answer`, `reveal_answers` などのボード専用メッセージは無視

ボードモード（`gameMode === "board"`）の場合:
- ボタン押下後、全員が回答入力可能
- 1着目の権利はなし（ボタンは「回答開始のトリガー」のみ）
- 回答締切後、ホストが判定

## 7. フロントエンド構成

### 7.1 新規コンポーネント

| コンポーネント | パス | 役割 |
|-------------|------|------|
| `BoardAnswerInput` | `src/components/room/BoardAnswerInput.tsx` | プレイヤー用回答入力欄 |
| `BoardAnswerStatus` | `src/components/room/BoardAnswerStatus.tsx` | 全員の回答済み/未回答状況表示 |
| `BoardHostPanel` | `src/components/room/BoardHostPanel.tsx` | ホスト専用パネル（回答一覧・公開/非公開・判定） |
| `BoardAnswerReveal` | `src/components/room/BoardAnswerReveal.tsx` | 回答公開時の全員表示パネル |
| `GameModeSelector` | `src/components/room/GameModeSelector.tsx` | ロビーでの通常/ボードモード選択UI |

### 7.2 既存コンポーネント修正

| コンポーネント | 修正内容 |
|-------------|---------|
| `LobbyPhase.tsx` | `GameModeSelector` を追加（通常/ボード切替） |
| `QuestionPhase.tsx` | ボタン押下後、ボードモードなら `BoardAnswerInput` を表示 |
| `BuzzedPhase.tsx` | ボードモード時は着順ではなく `BoardAnswerStatus` を表示 |
| `HostControls.tsx` | ボードモード時は通常の判定UIを非表示にし、`BoardHostPanel` を表示 |
| `ResultPhase.tsx` | ボードモード時は全員の判定結果をまとめて表示 |

### 7.3 状態遷移とコンポーネント表示

#### QuestionPhase（ボードモード時）

```
[ボタン未押下]
  → 通常通り "早押し受付中！" + 大きなボタン

[ボタン押下後]
  → "ボタンが押されました！回答を入力してください"
  → BoardAnswerInput（自分の回答入力）
  → BoardAnswerStatus（誰が回答済みか）
```

#### BuzzedPhase（ボードモード時）

```
[回答受付中]
  → BoardAnswerStatus（回答済み/未回答の一覧）
  → ホスト: "回答を締め切る" ボタン

[回答締切後]
  → BoardHostPanel（ホスト専用）
  → プレイヤー: "判定中..." 表示
```

#### ホスト専用パネル（BoardHostPanel）

```
┌─────────────────────────────────────┐
│  ボードクイズ ホストパネル             │
├─────────────────────────────────────┤
│ [公開] [非公開に戻す] [回答締切]      │
├─────────────────────────────────────┤
│ プレイヤーA: 「東京」  [正解] [不正解] │
│ プレイヤーB: 「大阪」  [正解] [不正解] │
│ プレイヤーC: 未回答    [-] [-]       │
├─────────────────────────────────────┤
│ [全員正解] [全員不正解] [一括判定適用] │
└─────────────────────────────────────┘
```

## 8. UI/UX 設計詳細

### 8.1 プレイヤー画面（ボードモード）

#### 回答入力時

```
┌────────────────────────────────────────┐
│  問題 3 / 10                           │
│                                        │
│  🔔 ボタンが押されました！              │
│  制限時間内に回答を入力してください      │
│                                        │
│  ┌─────────────────────────────────┐   │
│  │ あなたの回答を入力...            │   │
│  └─────────────────────────────────┘   │
│  [        回答を送信        ]          │
│                                        │
│  ── 回答状況 ──                         │
│  ○ プレイヤーA（回答済み）              │
│  ○ プレイヤーB（回答済み）              │
│  ○ プレイヤーC（あなた）← 入力中        │
│  ○ プレイヤーD（未回答）                │
│                                        │
│  回答内容はホストが公開するまで非表示です  │
└────────────────────────────────────────┘
```

#### 回答公開後

```
┌────────────────────────────────────────┐
│  回答発表！                             │
│                                        │
│  ┌─────────────────────────────────┐   │
│  │ プレイヤーA: 「東京」              │   │
│  │ プレイヤーB: 「大阪」              │   │
│  │ プレイヤーC: 「東京」              │   │
│  │ プレイヤーD: 未回答               │   │
│  └─────────────────────────────────┘   │
│                                        │
│  判定中... ホストが正誤を決定しています   │
└────────────────────────────────────────┘
```

#### 判定結果表示

```
┌────────────────────────────────────────┐
│  判定結果                               │
│                                        │
│  ┌─────────────────────────────────┐   │
│  │ プレイヤーA: 「東京」  ○ 正解 +1pt│   │
│  │ プレイヤーB: 「大阪」  ✗ 不正解    │   │
│  │ プレイヤーC: 「東京」  ○ 正解 +1pt│   │
│  │ プレイヤーD: 未回答    ✗ 不正解    │   │
│  └─────────────────────────────────┘   │
│                                        │
│  [次の問題へ] （ホストのみ表示）        │
└────────────────────────────────────────┘
```

### 8.2 ホスト画面（ボードモード）

#### 判定中（非公開時）

```
┌────────────────────────────────────────┐
│  🎮 ホスト操作パネル（非公開）          │
├────────────────────────────────────────┤
│ [公開する] [締め切る]                  │
├────────────────────────────────────────┤
│ 👤 プレイヤーA: 「東京」                │
│    [正解] [不正解]                     │
│ 👤 プレイヤーB: 「大阪」                │
│    [正解] [不正解]                     │
│ 👤 プレイヤーC: 未回答                  │
│    （締め切り後に判定可能）              │
└────────────────────────────────────────┘
```

#### 判定中（公開時）

```
┌────────────────────────────────────────┐
│  🎮 ホスト操作パネル（公開中）          │
├────────────────────────────────────────┤
│ [非公開に戻す] [締め切る]              │
├────────────────────────────────────────┤
│ 👤 プレイヤーA: 「東京」                │
│    [正解] [不正解]                     │
│ 👤 プレイヤーB: 「大阪」                │
│    [正解] [不正解]                     │
│ 👤 プレイヤーC: 未回答                  │
│    （未回答は自動的に不正解）             │
├────────────────────────────────────────┤
│ [一括判定: 東京 → 正解]               │
└────────────────────────────────────────┘
```

## 9. ゲーム状態遷移図

```
[ロビー] ──start_game──→ [待機]
                            │
                            │ start_question
                            ▼
                      [問題（ボタン受付）]
                            │
                            │ buzz（誰かがボタン押下）
                            ▼
                      ┌─────────────────┐
                      │  gameMode の分岐 │
                      └─────────────────┘
                            │
           ┌────────────────┴────────────────┐
           │ normal（通常モード）             │ board（ボードモード）
           ▼                                 ▼
    [1着が回答権を獲得]              [全員が回答可能]
           │                                 │
           │ judge                           │ submit_answer（各プレイヤー）
           ▼                                 ▼
    [正解/不正解]                    [回答受付中]
           │                                 │
           │                                 │ close_answering（ホスト）
           │                                 ▼
           │                            [判定中]
           │                                 │
           │                                 │ judge_player（各プレイヤー）
           │                                 ▼
           │                            [判定完了]
           │                                 │
           └────────────────┬────────────────┘
                            │
                            │ next_question
                            ▼
                      [待機]（ループ）
                            │
                            │ finish_game
                            ▼
                      [終了]
```

## 10. 実装順序

### Phase 1: 型定義 & サーバー基盤
1. `src/party/types.ts` に新規型を追加
2. `src/party/quiz-room.ts` に新規ハンドラを実装
3. 既存ハンドラにモード分岐を追加

### Phase 2: フロントエンド UI
1. `GameModeSelector` コンポーネント作成
2. `BoardAnswerInput` コンポーネント作成
3. `BoardAnswerStatus` コンポーネント作成
4. `BoardHostPanel` コンポーネント作成
5. `BoardAnswerReveal` コンポーネント作成

### Phase 3: 既存コンポーネント連携
1. `LobbyPhase` にモード選択を追加
2. `QuestionPhase` にボードモード対応を追加
3. `BuzzedPhase` にボードモード対応を追加
4. `HostControls` にボードモード対応を追加
5. `ResultPhase` にボードモード対応を追加

### Phase 4: 動作確認 & ポリッシュ
1. 通常モードへの影響がないか確認
2. ホストの公開/非公開/判定フローを検証
3. 未回答者の扱いを確認
4. 既存ルール（m○n× 等）との連携を確認

## 11. 今後の検討事項

- **制限時間**: 回答入力に制限時間を設けるか（ホストが設定）
- **自動締切**: 全員が回答したら自動的に締切るか
- **回答修正**: 送信後の回答修正を許可するか
- **未回答者の扱い**: 不正解扱い or スキップ（ポイント変動なし）
- **一括判定の正解テキスト**: ホストが正解テキストを入力し、完全一致で自動判定する機能
- **ボードクイズ専用ポイントルール**: ボタン押下者 +3pt、未押下者 +1pt などの特殊ルール
