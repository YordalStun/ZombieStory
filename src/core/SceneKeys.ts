export const SceneKeys = {
  BOOT: "Boot",
  PRELOAD: "Preload",
  MAIN_MENU: "MainMenu",
  APARTMENT: "Apartment",
  MOTORWAY: "Motorway",
  OFFICE: "Office",
  LEAVE_BUILDING: "LeaveBuilding",
  RETURN_DRIVE: "ReturnDrive",
  DAD_DRIVE: "DadDrive",
  COMBAT_TUTORIAL: "CombatTutorial",
  HOME_ARRIVAL: "HomeArrival",
  HOUSE_DEFENSE: "HouseDefense",
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
