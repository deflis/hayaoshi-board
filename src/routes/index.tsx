import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const navigate = useNavigate();
	const [roomId, setRoomId] = useState("");
	const [name, setName] = useState("");

	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault();
		const id = roomId.trim() || crypto.randomUUID().slice(0, 8);
		const playerName = name.trim();
		if (!playerName) return;
		navigate({
			to: "/room/$roomId",
			params: { roomId: id },
			search: { name: playerName },
		});
	};

	return (
		<div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
			<div className="w-full max-w-sm">
				<h1 className="text-4xl font-black text-white text-center mb-2">
					早押しボード
				</h1>
				<p className="text-gray-400 text-center mb-8 text-sm">
					リアルタイム早押しクイズプラットフォーム
				</p>

				<form onSubmit={handleCreate} className="space-y-4">
					<div>
						<label className="block text-sm text-gray-400 mb-1">
							プレイヤー名
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="名前を入力"
							required
							className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label className="block text-sm text-gray-400 mb-1">
							ルームID（空欄で自動生成）
						</label>
						<input
							type="text"
							value={roomId}
							onChange={(e) => setRoomId(e.target.value)}
							placeholder="例: abc12345"
							className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
						/>
					</div>

					<button
						type="submit"
						className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors"
					>
						ルームに参加 / 作成
					</button>
				</form>
			</div>
		</div>
	);
}
