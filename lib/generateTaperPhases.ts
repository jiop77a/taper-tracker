// generateTaperPhases.ts

// Represents a single taper step option for display in a taper table
export interface TaperPhase {
  phase: number;
  fullPills: number;
  halfPills: number;
  totalPills: number;
  avgDailyDose: number;
  cycleLength: number;
  isCurrent?: boolean;
}

interface GenerateTaperPhasesInput {
  currentAvgDose: number;
  goalAvgDose: number;
  numberOfSteps: number;
  minCycleLength: number;
  maxCycleLength: number;
}

export function generateTaperPhases({
  currentAvgDose,
  goalAvgDose,
  numberOfSteps,
  minCycleLength,
  maxCycleLength,
}: GenerateTaperPhasesInput): TaperPhase[] {
  const phases: TaperPhase[] = [];

  // Step 1: Generate all valid pill combinations across cycle length range
  const combinations: Omit<TaperPhase, "phase" | "isCurrent">[] = [];
  for (let cycle = minCycleLength; cycle <= maxCycleLength; cycle++) {
    for (let full = 0; full <= cycle; full++) {
      for (let half = 0; half <= cycle - full; half++) {
        const totalPills = full + 0.5 * half;
        const avgDailyDose = parseFloat((totalPills / cycle).toFixed(3));
        combinations.push({
          fullPills: full,
          halfPills: half,
          totalPills,
          avgDailyDose,
          cycleLength: cycle,
        });
      }
    }
  }

  // Step 2: Sort combinations by avgDailyDose descending
  combinations.sort((a, b) => b.avgDailyDose - a.avgDailyDose);

  // Step 3: Define desired target doses
  const targets: number[] = [];
  const minimalIncrement = (currentAvgDose - goalAvgDose) / numberOfSteps;
  for (let i = 0; i <= numberOfSteps; i++) {
    const target = parseFloat(
      (currentAvgDose - i * minimalIncrement).toFixed(3)
    );
    if (target >= goalAvgDose - 0.001) targets.push(target);
  }

  // Step 4: For each target, find the closest combo (allowing repeats)
  let phaseNum = 1;
  for (const target of targets) {
    let bestMatch: (typeof combinations)[number] | null = null;
    let minDiff = Number.POSITIVE_INFINITY;

    for (const combo of combinations) {
      const diff = Math.abs(combo.avgDailyDose - target);
      if (diff < minDiff) {
        minDiff = diff;
        bestMatch = combo;
      }
    }

    if (bestMatch) {
      phases.push({
        ...bestMatch,
        phase: phaseNum,
        isCurrent: phaseNum === 1,
      });
      phaseNum++;
    }
  }

  return phases;
}
