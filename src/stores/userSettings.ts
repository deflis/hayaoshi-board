import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserSettings {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export const useUserSettings = create<UserSettings>()(
  persist(
    (set) => ({
      soundEnabled: true,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
    }),
    {
      name: "hayaoshi-board:user-settings",
    },
  ),
);
