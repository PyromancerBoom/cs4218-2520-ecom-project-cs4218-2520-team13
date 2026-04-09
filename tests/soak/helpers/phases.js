// Priyansh Bimbisariye, A0265903B

// Soak test phases. We tag every metric with the current phase so we can set
// time-dependent thresholds (e.g. catch degradation that only appears after many iterations, which
// rate-based thresholds can miss)

import exec from "k6/execution";

export function getPhase() {
  const elapsedMin = (Date.now() - exec.scenario.startTime) / 60000;
  if (elapsedMin < 5) return "early";
  if (elapsedMin < 15) return "middle";
  return "late";
}
