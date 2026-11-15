// One-line plain-language explanations shown in hover tooltips.
export const GLOSSARY = {
  sunlight: "The Sun's center is above the local terrain horizon, so solar panels can make power.",
  earthContact:
    "Earth's center is above the local terrain horizon, so the lander can talk to Earth directly (no relay satellite).",
  both: "Share of the mission with sunlight and Earth contact at the same time.",
  longestDark: "The longest stretch without sunlight during the mission. Batteries have to last this long.",
  longestBlackout: "The longest stretch without Earth contact during the mission.",
  sunHeight:
    "How high the Sun's center is above level ground (0°). At the south pole it never gets higher than about 1.5°.",
  verticalPanel:
    "Average sunlight hitting a solar panel standing upright and turned to face the Sun. At the poles this beats a flat panel by far.",
  flatPanel: "Average sunlight hitting a solar panel lying flat. Useless when the Sun skims the horizon.",
  terrainHorizon: "The skyline of hills and crater rims around the lander, from NASA LOLA laser elevation maps.",
  earthPhase:
    "How much of Earth's disk is lit by the Sun, as seen from the Moon (like Moon phases, but for Earth).",
} as const;
