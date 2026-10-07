/** Presentation identity only. HBI database, backup and storage identifiers remain stable. */
export const brand = {
  name: "SESEN",
  descriptor: "Sports Intelligence",
  product: "Handball Intelligence",
  mark: "/brand/sesen-mark.png",
  lockup: "/brand/sesen-lockup.webp",
  playerPlaceholder: "/brand/placeholders/player-neutral.svg",
  court: "/brand/courts/handball-court-full.svg",
  colors: {
    cyan: "#11D3D7",
    gold: "#D8B57B",
    ivory: "#F4F1E8",
    goal: "#77DB4B",
    save: "#459EFF",
    attack: "#FF851B",
    turnover: "#FF606B",
  },
} as const;
