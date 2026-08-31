export const SceneKeys = {
  BOOT: "Boot",
  PRELOAD: "Preload",
  MAIN_MENU: "MainMenu",
  APARTMENT: "Apartment",
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
