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

interface OptimalTaperInput {
  currentAvgDose: number;
  goalAvgDose: number;
  maxStepSize?: number; // Optional: maximum dose reduction per step
  minPhaseLength?: number; // Optional: minimum days per phase
  maxTotalDuration?: number; // Optional: complete taper within X days
}

export function generateTaperPhases({
  currentAvgDose,
  goalAvgDose,
  numberOfSteps,
  minCycleLength,
  maxCycleLength,
}: GenerateTaperPhasesInput): TaperPhase[] {
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

  // Step 4: Find optimal sequence with gradual steps
  const maxStepSize = ((currentAvgDose - goalAvgDose) / numberOfSteps) * 1.5; // Allow 50% variance
  const minMeaningfulStep = 0.005; // Minimum dose reduction to be meaningful

  // Use dynamic programming to find the smoothest path
  const optimalPhases = findOptimalTaperSequence(
    combinations,
    targets,
    maxStepSize,
    minMeaningfulStep
  );

  // Filter out any phases that are too close to the current dose
  const filteredPhases = optimalPhases.filter(
    (phase) =>
      Math.abs(phase.avgDailyDose - currentAvgDose) >= minMeaningfulStep
  );

  // Renumber phases starting from 1
  return filteredPhases.map((phase, index) => ({
    ...phase,
    phase: index + 1,
    isCurrent: false,
  }));
}

// Helper function to find the optimal taper sequence
function findOptimalTaperSequence(
  combinations: Omit<TaperPhase, "phase" | "isCurrent">[],
  targets: number[],
  maxStepSize: number,
  minMeaningfulStep: number
): TaperPhase[] {
  if (targets.length === 0) return [];

  // For each target, find valid combinations (within reasonable range)
  const validCombosPerTarget = targets.map((target) =>
    combinations
      .filter(
        (combo) => Math.abs(combo.avgDailyDose - target) <= maxStepSize * 0.75
      )
      .sort(
        (a, b) =>
          Math.abs(a.avgDailyDose - target) - Math.abs(b.avgDailyDose - target)
      )
  );

  // Use dynamic programming to find the smoothest sequence
  const dp: {
    combo: Omit<TaperPhase, "phase" | "isCurrent">;
    totalCost: number;
    path: Omit<TaperPhase, "phase" | "isCurrent">[];
  }[] = [];

  // Initialize with first target
  for (const combo of validCombosPerTarget[0]) {
    dp.push({
      combo,
      totalCost: Math.abs(combo.avgDailyDose - targets[0]),
      path: [combo],
    });
  }

  // Build optimal path for remaining targets
  for (let targetIndex = 1; targetIndex < targets.length; targetIndex++) {
    const newDp: typeof dp = [];
    const currentTarget = targets[targetIndex];
    const validCombos = validCombosPerTarget[targetIndex];

    for (const prevState of dp) {
      for (const combo of validCombos) {
        const stepSize = Math.abs(
          prevState.combo.avgDailyDose - combo.avgDailyDose
        );

        // Skip if step is too large or too small
        if (stepSize > maxStepSize || stepSize < minMeaningfulStep) continue;

        // Calculate cost: target accuracy + step size smoothness
        const targetAccuracy = Math.abs(combo.avgDailyDose - currentTarget);
        const stepSmoothness = Math.abs(
          stepSize -
            (targets[0] - targets[targets.length - 1]) / (targets.length - 1)
        );
        const cost = targetAccuracy + stepSmoothness * 0.5;

        const totalCost = prevState.totalCost + cost;

        newDp.push({
          combo,
          totalCost,
          path: [...prevState.path, combo],
        });
      }
    }

    // Keep only the best paths (top 10 to avoid exponential growth)
    newDp.sort((a, b) => a.totalCost - b.totalCost);
    dp.length = 0;
    dp.push(...newDp.slice(0, 10));
  }

  // Select the best path
  if (dp.length === 0) {
    // Fallback to original algorithm if no valid path found
    return fallbackTaperSequence(combinations, targets);
  }

  const bestPath = dp.reduce((best, current) =>
    current.totalCost < best.totalCost ? current : best
  );

  // Convert to TaperPhase format
  return bestPath.path.map((combo, index) => ({
    ...combo,
    phase: index + 1,
    isCurrent: index === 0,
  }));
}

// Fallback to original algorithm if optimization fails
function fallbackTaperSequence(
  combinations: Omit<TaperPhase, "phase" | "isCurrent">[],
  targets: number[]
): TaperPhase[] {
  const phases: TaperPhase[] = [];
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

// Helper function to calculate total taper duration
export function calculateTaperDuration(phases: TaperPhase[]): number {
  return phases.reduce((total, phase) => total + phase.cycleLength, 0);
}

// Helper function to get chart data including the starting phase (phase 0)
export function getChartDataWithStartingPhase(
  phases: TaperPhase[],
  currentAvgDose: number
): { phase: number; avgDailyDose: number }[] {
  const chartData = [
    { phase: 0, avgDailyDose: currentAvgDose }, // Starting phase
    ...phases.map((p) => ({ phase: p.phase, avgDailyDose: p.avgDailyDose })),
  ];
  return chartData;
}

// Auto-optimize mode: Find the smoothest possible taper path
export function generateOptimalTaperPhases({
  currentAvgDose,
  goalAvgDose,
  maxStepSize,
  minPhaseLength = 7,
  maxTotalDuration = 365,
}: OptimalTaperInput): TaperPhase[] {
  // Generate all possible combinations across reasonable cycle lengths
  const minCycleLength = minPhaseLength;
  const maxCycleLength = Math.min(28, maxTotalDuration); // Up to 28 days or total duration

  const combinations: Omit<TaperPhase, "phase" | "isCurrent">[] = [];
  for (let cycle = minCycleLength; cycle <= maxCycleLength; cycle++) {
    for (let full = 0; full <= cycle; full++) {
      for (let half = 0; half <= cycle - full; half++) {
        const totalPills = full + 0.5 * half;
        const avgDailyDose = parseFloat((totalPills / cycle).toFixed(3));

        // Only include combinations within our dose range
        if (avgDailyDose <= currentAvgDose && avgDailyDose >= goalAvgDose) {
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
  }

  // Sort by dose descending
  combinations.sort((a, b) => b.avgDailyDose - a.avgDailyDose);

  // Calculate default max step size if not provided
  const defaultMaxStepSize = (currentAvgDose - goalAvgDose) / 5; // Assume ~5 steps by default
  const actualMaxStepSize = maxStepSize || defaultMaxStepSize;
  const minMeaningfulStep = Math.max(0.01, actualMaxStepSize * 0.3); // At least 30% of max step

  // Find the optimal path using greedy approach with look-ahead
  return findOptimalPath(
    combinations,
    currentAvgDose,
    goalAvgDose,
    actualMaxStepSize,
    minMeaningfulStep,
    maxTotalDuration
  );
}

// Find optimal path through combinations using greedy approach with look-ahead
function findOptimalPath(
  combinations: Omit<TaperPhase, "phase" | "isCurrent">[],
  startDose: number,
  goalDose: number,
  maxStepSize: number,
  minMeaningfulStep: number,
  maxTotalDuration: number
): TaperPhase[] {
  const path: Omit<TaperPhase, "phase" | "isCurrent">[] = [];
  let currentDose = startDose;
  let totalDuration = 0;

  // Find starting point (closest to current dose)
  const startCombo =
    combinations.find((c) => Math.abs(c.avgDailyDose - startDose) < 0.001) ||
    combinations.reduce((best, current) =>
      Math.abs(current.avgDailyDose - startDose) <
      Math.abs(best.avgDailyDose - startDose)
        ? current
        : best
    );

  if (startCombo) {
    path.push(startCombo);
    currentDose = startCombo.avgDailyDose;
    totalDuration += startCombo.cycleLength;
  }

  // Greedily find the best next step until we reach the goal
  while (
    currentDose > goalDose + minMeaningfulStep &&
    totalDuration < maxTotalDuration
  ) {
    let bestNext: (typeof combinations)[0] | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const combo of combinations) {
      // Skip if this doesn't reduce dose or reduces too much/little
      const stepSize = currentDose - combo.avgDailyDose;
      if (
        stepSize <= 0 ||
        stepSize > maxStepSize ||
        stepSize < minMeaningfulStep
      )
        continue;

      // Skip if this would exceed total duration
      if (totalDuration + combo.cycleLength > maxTotalDuration) continue;

      // Skip if we've already used this exact combination
      if (
        path.some(
          (p) =>
            p.avgDailyDose === combo.avgDailyDose &&
            p.cycleLength === combo.cycleLength &&
            p.fullPills === combo.fullPills &&
            p.halfPills === combo.halfPills
        )
      )
        continue;

      // Calculate score: prefer moderate, consistent steps
      const idealStepSize = maxStepSize * 0.6; // Prefer steps around 60% of max
      const stepSizeScore = Math.abs(stepSize - idealStepSize); // Prefer steps close to ideal

      const consistencyScore =
        path.length > 0
          ? Math.abs(
              stepSize -
                (path[path.length - 1].avgDailyDose -
                  (path.length > 1
                    ? path[path.length - 2].avgDailyDose
                    : startDose))
            )
          : 0;

      // Look ahead: how well does this position us for future steps?
      const remainingDose = combo.avgDailyDose - goalDose;
      const remainingDuration =
        maxTotalDuration - totalDuration - combo.cycleLength;
      const lookAheadScore =
        remainingDuration > 0
          ? Math.abs(remainingDose / (remainingDuration / 14) - idealStepSize)
          : 0; // Prefer positioning for ideal step size

      const totalScore =
        stepSizeScore + consistencyScore * 0.8 + lookAheadScore * 0.4;

      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestNext = combo;
      }
    }

    if (!bestNext) break; // No valid next step found

    path.push(bestNext);
    currentDose = bestNext.avgDailyDose;
    totalDuration += bestNext.cycleLength;
  }

  // Convert to TaperPhase format, excluding the starting phase
  return path.slice(1).map((combo, index) => ({
    ...combo,
    phase: index + 1,
    isCurrent: false, // No phase is "current" since these are future steps
  }));
}
