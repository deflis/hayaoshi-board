import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserSettings {
  soundEnabled: boolean;
  enterBuzzEnabled: boolean;
  spaceBuzzEnabled: boolean;
  numpadEnterBuzzEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setEnterBuzzEnabled: (enabled: boolean) => void;
  setSpaceBuzzEnabled: (enabled: boolean) => void;
  setNumpadEnterBuzzEnabled: (enabled: boolean) => void;
}

export const useUserSettings = create<UserSettings>()(
  persist(
    (set) => ({
      soundEnabled: true,
      enterBuzzEnabled: false,
      spaceBuzzEnabled: false,
      numpadEnterBuzzEnabled: false,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setEnterBuzzEnabled: (enabled) => set({ enterBuzzEnabled: enabled }),
      setSpaceBuzzEnabled: (enabled) => set({ spaceBuzzEnabled: enabled }),
      setNumpadEnterBuzzEnabled: (enabled) =>
        set({ numpadEnterBuzzEnabled: enabled }),
    }),
    {
      name: "hayaoshi-board:user-settings",
    },
  ),
);
