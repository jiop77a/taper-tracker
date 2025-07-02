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

// Information about constraint violations and algorithm decisions
export interface ConstraintStatus {
  respected: string[];
  violated: string[];
  warnings: string[];
  reasoning: string[];
}

// Result from unified taper generation including constraint status
export interface TaperResult {
  phases: TaperPhase[];
  constraintStatus: ConstraintStatus;
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

// New unified interface for the redesigned algorithm
interface UnifiedTaperInput {
  currentAvgDose: number; // Always in pill units
  goalAvgDose: number; // Always in pill units

  // Optional constraints - if not provided, algorithm will optimize
  stepSizeRange?: { min?: number; max?: number };
  cycleLengthRange?: { min?: number; max?: number };
  stepsRange?: { min?: number; max?: number };
  durationRange?: { min?: number; max?: number };
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

// New unified algorithm that handles optional constraints
export function generateUnifiedTaperPhases({
  currentAvgDose,
  goalAvgDose,
  stepSizeRange,
  cycleLengthRange,
  stepsRange,
  durationRange,
}: UnifiedTaperInput): TaperResult {
  // Algorithm always works in pill units
  const currentPillUnits = currentAvgDose;
  const goalPillUnits = goalAvgDose;

  // Validate practical bounds
  const totalReductionPills = currentPillUnits - goalPillUnits;

  if (currentPillUnits > 2.0) {
    return {
      phases: [],
      constraintStatus: {
        respected: [],
        violated: [
          `Starting dose too high: ${currentPillUnits.toFixed(
            2
          )} pills (maximum: 2.0 pills)`,
        ],
        warnings: [],
        reasoning: [
          "Tapers starting above 2 pills per day are not supported for safety reasons.",
        ],
      },
    };
  }

  if (goalPillUnits < 0) {
    return {
      phases: [],
      constraintStatus: {
        respected: [],
        violated: [
          `Goal dose cannot be negative: ${goalPillUnits.toFixed(2)} pills`,
        ],
        warnings: [],
        reasoning: ["Goal dose must be 0 or positive."],
      },
    };
  }

  if (totalReductionPills < 0.25) {
    return {
      phases: [],
      constraintStatus: {
        respected: [],
        violated: [
          `Reduction too small: ${totalReductionPills.toFixed(
            2
          )} pills (minimum: 0.25 pills)`,
        ],
        warnings: [],
        reasoning: [
          "Reductions smaller than 1/4 pill are not practical for tapering.",
        ],
      },
    };
  }

  if (totalReductionPills <= 0) {
    return {
      phases: [],
      constraintStatus: {
        respected: [],
        violated: [
          `Invalid reduction: current dose (${currentPillUnits.toFixed(
            2
          )}) must be greater than goal dose (${goalPillUnits.toFixed(2)})`,
        ],
        warnings: [],
        reasoning: ["Current dose must be higher than goal dose for tapering."],
      },
    };
  }
  // Set default constraints if not provided (work in pill units internally)
  const totalReduction = currentPillUnits - goalPillUnits;

  // Smart constraint calculation to handle edge cases
  const defaultMinStepSize = Math.max(0.005, totalReduction / 20); // Adaptive minimum
  const defaultMaxStepSize = Math.min(
    totalReduction, // Can't exceed total reduction
    Math.max(totalReduction / 3, 0.02) // At least 0.02mg or 1/3 of total
  );

  const baseConstraints = {
    minStepSize: stepSizeRange?.min || defaultMinStepSize,
    maxStepSize: stepSizeRange?.max || defaultMaxStepSize,
    minCycleLength: cycleLengthRange?.min || 7,
    maxCycleLength: cycleLengthRange?.max || 28,
    minSteps: stepsRange?.min || 3,
    maxSteps: stepsRange?.max || 15,
    minDuration: durationRange?.min || 0,
    maxDuration: durationRange?.max || 365,
  };

  // Validate constraints make sense
  if (baseConstraints.minStepSize > baseConstraints.maxStepSize) {
    // Fix impossible step size constraints
    const avgStepSize =
      (baseConstraints.minStepSize + baseConstraints.maxStepSize) / 2;
    baseConstraints.minStepSize = Math.min(avgStepSize, totalReduction / 10);
    baseConstraints.maxStepSize = Math.max(avgStepSize, totalReduction / 2);
  }

  // Smart cycle length adjustment based on duration requirements
  let constraints = { ...baseConstraints };

  // If we have a minimum duration requirement and no explicit cycle length constraints,
  // bias toward longer cycles to help meet the duration target
  if (durationRange?.min && !cycleLengthRange) {
    const totalDoseReduction = currentAvgDose - goalAvgDose;
    // Use a more conservative estimate for steps (fewer, larger steps)
    const estimatedSteps = Math.max(
      6,
      Math.ceil(totalDoseReduction / (constraints.maxStepSize * 1.5))
    );
    const targetCycleLength = Math.ceil(durationRange.min / estimatedSteps);

    // Adjust cycle length range to favor the calculated target, but keep some flexibility
    if (targetCycleLength > 14) {
      // Cap the target at our maximum possible cycle length
      const cappedTarget = Math.min(
        targetCycleLength,
        baseConstraints.maxCycleLength
      );
      const minTarget = Math.max(
        baseConstraints.minCycleLength,
        cappedTarget - 4
      );
      const maxTarget = Math.min(
        baseConstraints.maxCycleLength,
        cappedTarget + 2
      );

      // Only adjust if we're actually changing something meaningful
      if (
        minTarget > baseConstraints.minCycleLength ||
        maxTarget < baseConstraints.maxCycleLength
      ) {
        constraints.minCycleLength = minTarget;
        constraints.maxCycleLength = maxTarget;
      }
    }
  }

  // Generate all valid combinations within constraints
  const combinations: Omit<TaperPhase, "phase" | "isCurrent">[] = [];

  // Calculate maximum pills needed to support the current dose (in pill units)
  const maxPillsNeeded = Math.ceil(
    currentPillUnits * constraints.maxCycleLength
  );

  for (
    let cycle = constraints.minCycleLength;
    cycle <= constraints.maxCycleLength;
    cycle++
  ) {
    // Allow enough pills to reach the current dose, but cap at reasonable limits
    const maxFullPillsForCycle = Math.min(maxPillsNeeded, cycle * 3); // Up to 3 pills per day

    for (let full = 0; full <= maxFullPillsForCycle; full++) {
      for (
        let half = 0;
        half <= Math.min(maxPillsNeeded - full, cycle);
        half++
      ) {
        const totalPills = full + 0.5 * half;
        const avgDailyDose = parseFloat((totalPills / cycle).toFixed(3));

        // Only include combinations within our dose range (in pill units)
        if (avgDailyDose <= currentPillUnits && avgDailyDose >= goalPillUnits) {
          combinations.push({
            fullPills: full,
            halfPills: half,
            totalPills,
            avgDailyDose: avgDailyDose, // Always in pill units
            cycleLength: cycle,
          });
        }
      }
    }
  }

  // Sort by dose descending
  combinations.sort((a, b) => b.avgDailyDose - a.avgDailyDose);

  // Find optimal path using constrained optimization (pass pill units internally)
  const result = findConstrainedOptimalPath(
    combinations,
    currentPillUnits,
    goalPillUnits,
    constraints,
    { stepSizeRange, cycleLengthRange, stepsRange, durationRange }
  );

  // Algorithm always returns results in pill units
  return result;
}

// Convenience function for auto-optimize mode (backward compatibility)
export function generateOptimalTaperPhases({
  currentAvgDose,
  goalAvgDose,
  maxStepSize,
  minPhaseLength = 7,
  maxTotalDuration = 365,
}: OptimalTaperInput): TaperPhase[] {
  // Use the new unified algorithm and extract just the phases
  const result = generateUnifiedTaperPhases({
    currentAvgDose,
    goalAvgDose,
    stepSizeRange: maxStepSize ? { max: maxStepSize } : undefined,
    cycleLengthRange: { min: minPhaseLength },
    durationRange: { max: maxTotalDuration },
  });
  return result.phases;
}

// Legacy function for backward compatibility - now uses unified algorithm
export function generateTaperPhasesLegacy({
  currentAvgDose,
  goalAvgDose,
  numberOfSteps,
  minCycleLength,
  maxCycleLength,
}: GenerateTaperPhasesInput): TaperPhase[] {
  // Use the new unified algorithm with legacy parameters and extract just the phases
  const result = generateUnifiedTaperPhases({
    currentAvgDose,
    goalAvgDose,
    cycleLengthRange: { min: minCycleLength, max: maxCycleLength },
    stepsRange: { min: numberOfSteps, max: numberOfSteps },
  });
  return result.phases;
}

// New constrained optimization algorithm
function findConstrainedOptimalPath(
  combinations: Omit<TaperPhase, "phase" | "isCurrent">[],
  startDose: number,
  goalDose: number,
  constraints: {
    minStepSize: number;
    maxStepSize: number;
    minCycleLength: number;
    maxCycleLength: number;
    minSteps: number;
    maxSteps: number;
    minDuration: number;
    maxDuration: number;
  },
  originalConstraints: {
    stepSizeRange?: { min?: number; max?: number };
    cycleLengthRange?: { min?: number; max?: number };
    stepsRange?: { min?: number; max?: number };
    durationRange?: { min?: number; max?: number };
  }
): TaperResult {
  const path: Omit<TaperPhase, "phase" | "isCurrent">[] = [];
  let currentDose = startDose;
  let totalDuration = 0;
  let stepCount = 0;

  // Track constraint status
  const constraintStatus: ConstraintStatus = {
    respected: [],
    violated: [],
    warnings: [],
    reasoning: [],
  };

  // Calculate ideal step size for guidance
  const totalDoseReduction = startDose - goalDose;
  const idealStepSize =
    totalDoseReduction / ((constraints.minSteps + constraints.maxSteps) / 2);

  // Greedily find the best path within all constraints
  while (
    currentDose > goalDose + constraints.minStepSize &&
    totalDuration < constraints.maxDuration &&
    stepCount < constraints.maxSteps
  ) {
    let bestNext: (typeof combinations)[0] | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const combo of combinations) {
      // Calculate step size for this combination
      const stepSize = currentDose - combo.avgDailyDose;

      // Skip if step size is outside constraints
      if (
        stepSize <= 0 ||
        stepSize < constraints.minStepSize ||
        stepSize > constraints.maxStepSize
      ) {
        continue;
      }

      // Skip if cycle length is outside constraints
      if (
        combo.cycleLength < constraints.minCycleLength ||
        combo.cycleLength > constraints.maxCycleLength
      ) {
        continue;
      }

      // Skip if this would exceed duration constraints
      if (totalDuration + combo.cycleLength > constraints.maxDuration) {
        continue;
      }

      // Skip if we've already used this exact combination
      if (
        path.some(
          (p) =>
            p.avgDailyDose === combo.avgDailyDose &&
            p.cycleLength === combo.cycleLength &&
            p.fullPills === combo.fullPills &&
            p.halfPills === combo.halfPills
        )
      ) {
        continue;
      }

      // Calculate score based on SMOOTHNESS priority

      // #1 PRIORITY: Step size consistency (smoothness)
      const stepSizeScore = Math.abs(stepSize - idealStepSize);

      // Calculate step size consistency with previous steps
      let stepConsistencyScore = 0;
      if (path.length > 0) {
        const prevStepSize =
          path.length > 1
            ? path[path.length - 2].avgDailyDose -
              path[path.length - 1].avgDailyDose
            : startDose - path[path.length - 1].avgDailyDose;
        stepConsistencyScore = Math.abs(stepSize - prevStepSize);
      }

      // #2 PRIORITY: Cycle length consistency
      let cycleLengthConsistencyScore = 0;
      if (path.length > 0) {
        const prevCycleLength = path[path.length - 1].cycleLength;
        cycleLengthConsistencyScore = Math.abs(
          combo.cycleLength - prevCycleLength
        );
      }

      // #3 PRIORITY: Duration constraint feasibility
      const remainingDose = combo.avgDailyDose - goalDose;
      const remainingSteps = constraints.maxSteps - stepCount - 1;
      const remainingDuration =
        constraints.maxDuration - totalDuration - combo.cycleLength;

      let feasibilityScore = 0;
      if (remainingSteps > 0 && remainingDuration > 0) {
        const projectedStepSize = remainingDose / remainingSteps;
        feasibilityScore = Math.abs(projectedStepSize - idealStepSize);
      } else if (remainingDose > constraints.minStepSize) {
        feasibilityScore = 1000; // Heavy penalty if can't complete
      }

      // Smart cycle length adjustment for duration constraints
      let cycleLengthScore = 0;
      const remainingDurationNeeded =
        constraints.minDuration - totalDuration - combo.cycleLength;
      const remainingStepsAvailable = constraints.maxSteps - stepCount - 1;

      if (remainingDurationNeeded > 0 && remainingStepsAvailable > 0) {
        // We need more duration - prefer longer cycles
        const idealCycleForDuration = Math.min(
          remainingDurationNeeded / remainingStepsAvailable,
          constraints.maxCycleLength
        );
        cycleLengthScore = Math.abs(combo.cycleLength - idealCycleForDuration);
      } else {
        // Prefer consistent cycle lengths, defaulting to 14 days
        const targetCycle =
          path.length > 0 ? path[path.length - 1].cycleLength : 14;
        cycleLengthScore = Math.abs(combo.cycleLength - targetCycle);
      }

      // WEIGHTED SCORING: Smoothness is #1 priority
      const totalScore =
        stepSizeScore * 1.0 + // Base step size quality
        stepConsistencyScore * 2.0 + // #1 PRIORITY: Step consistency (smoothness)
        cycleLengthConsistencyScore * 1.5 + // #2 PRIORITY: Cycle consistency
        feasibilityScore * 0.8 + // Constraint feasibility
        cycleLengthScore * 0.5; // Duration-aware cycle adjustment

      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestNext = combo;
      }
    }

    if (!bestNext) break; // No valid next step found

    path.push(bestNext);
    currentDose = bestNext.avgDailyDose;
    totalDuration += bestNext.cycleLength;
    stepCount++;
  }

  // Check if we need to enforce minimum duration constraint
  if (totalDuration < constraints.minDuration && path.length > 0) {
    // Strategy: Rebuild the taper with a slower, more gradual approach
    // Instead of inserting phases after the fact, create a naturally slower taper

    const targetDuration = constraints.minDuration;
    const extraTimeNeeded = targetDuration - totalDuration;

    // Calculate how many extra phases we can add
    const maxExtraPhases = Math.min(
      Math.floor(extraTimeNeeded / 14), // Assume 14-day cycles
      constraints.maxSteps - stepCount
    );

    if (maxExtraPhases > 0) {
      // Strategy: Extend time at intermediate dose levels by repeating them
      // Work backwards from higher doses to create natural stabilization periods

      const newPath: Omit<TaperPhase, "phase" | "isCurrent">[] = [];
      let newTotalDuration = 0;
      let newStepCount = 0;
      let extraPhasesUsed = 0;

      for (
        let i = 0;
        i < path.length && newStepCount < constraints.maxSteps;
        i++
      ) {
        const currentPhase = path[i];

        // Add the original phase
        newPath.push(currentPhase);
        newTotalDuration += currentPhase.cycleLength;
        newStepCount++;

        // Decide whether to add a repeat of this phase for stabilization
        // SMOOTHNESS PRIORITY: Add repeats to maintain consistent progression
        // Prefer adding repeats at intermediate levels to create smooth transitions
        const shouldRepeat =
          extraPhasesUsed < maxExtraPhases &&
          i < path.length - 1 && // Not the last phase
          newStepCount < constraints.maxSteps &&
          newTotalDuration + currentPhase.cycleLength <=
            constraints.maxDuration;

        if (shouldRepeat) {
          // Find a matching combination for this dose
          const matchingCombos = combinations.filter(
            (combo) =>
              Math.abs(combo.avgDailyDose - currentPhase.avgDailyDose) <= 0.001
          );

          if (matchingCombos.length > 0) {
            // SMOOTHNESS PRIORITY: Choose cycle length that maintains consistency
            const prevCycleLength = currentPhase.cycleLength;
            const bestCombo = matchingCombos.reduce((best, current) => {
              const currentConsistency = Math.abs(
                current.cycleLength - prevCycleLength
              );
              const bestConsistency = Math.abs(
                best.cycleLength - prevCycleLength
              );
              return currentConsistency < bestConsistency ? current : best;
            });

            newPath.push(bestCombo);
            newTotalDuration += bestCombo.cycleLength;
            newStepCount++;
            extraPhasesUsed++;
          }
        }

        // Stop if we've reached our target duration
        if (newTotalDuration >= targetDuration) {
          break;
        }
      }

      // If we haven't used all the original phases, add the remaining ones
      const remainingPhases = path.slice(newPath.length - extraPhasesUsed);
      for (const phase of remainingPhases) {
        if (
          newStepCount >= constraints.maxSteps ||
          newTotalDuration + phase.cycleLength > constraints.maxDuration
        ) {
          break;
        }
        newPath.push(phase);
        newTotalDuration += phase.cycleLength;
        newStepCount++;
      }

      // Replace the original path with the new gradual path
      path.length = 0; // Clear original path
      path.push(...newPath);
      totalDuration = newTotalDuration;
      stepCount = newStepCount;
    }
  }

  // Check if we need to enforce minimum steps constraint
  if (stepCount < constraints.minSteps && path.length > 0) {
    const targetSteps = Math.min(constraints.minSteps, constraints.maxSteps);

    // Strategy: Add smaller intermediate steps to increase step count
    while (
      stepCount < targetSteps &&
      totalDuration < constraints.maxDuration &&
      stepCount < constraints.maxSteps
    ) {
      // Find the largest step in the current path that we can split
      let largestStepIndex = -1;
      let largestStepSize = 0;
      let prevDose = startDose;

      for (let i = 0; i < path.length; i++) {
        const stepSize = prevDose - path[i].avgDailyDose;
        if (
          stepSize > largestStepSize &&
          stepSize > constraints.minStepSize * 2
        ) {
          largestStepSize = stepSize;
          largestStepIndex = i;
        }
        prevDose = path[i].avgDailyDose;
      }

      if (largestStepIndex === -1) break; // No step can be split

      // Calculate intermediate dose
      const prevDose_split =
        largestStepIndex === 0
          ? startDose
          : path[largestStepIndex - 1].avgDailyDose;
      const currentDose_split = path[largestStepIndex].avgDailyDose;
      const intermediateDose = (prevDose_split + currentDose_split) / 2;

      // Find a combination close to the intermediate dose
      let bestIntermediate = null;
      let bestDiff = Number.POSITIVE_INFINITY;

      for (const combo of combinations) {
        const diff = Math.abs(combo.avgDailyDose - intermediateDose);
        const stepSize1 = prevDose_split - combo.avgDailyDose;
        const stepSize2 = combo.avgDailyDose - currentDose_split;

        // Check if this split creates valid step sizes
        if (
          stepSize1 >= constraints.minStepSize &&
          stepSize1 <= constraints.maxStepSize &&
          stepSize2 >= constraints.minStepSize &&
          stepSize2 <= constraints.maxStepSize &&
          combo.cycleLength >= constraints.minCycleLength &&
          combo.cycleLength <= constraints.maxCycleLength &&
          diff < bestDiff
        ) {
          bestDiff = diff;
          bestIntermediate = combo;
        }
      }

      if (
        bestIntermediate &&
        totalDuration + bestIntermediate.cycleLength <= constraints.maxDuration
      ) {
        // Insert the intermediate step
        path.splice(largestStepIndex, 0, bestIntermediate);
        totalDuration += bestIntermediate.cycleLength;
        stepCount++;
      } else {
        break; // Can't add more steps
      }
    }
  }

  // Convert to TaperPhase format
  const phases = path.map((combo, index) => ({
    ...combo,
    phase: index + 1,
    isCurrent: false,
  }));

  // Analyze final constraint status
  analyzeConstraintStatus(
    phases,
    startDose,
    originalConstraints,
    constraintStatus
  );

  return {
    phases,
    constraintStatus,
  };
}

// Helper function to analyze constraint compliance and provide user feedback
function analyzeConstraintStatus(
  phases: TaperPhase[],
  startDose: number,
  originalConstraints: {
    stepSizeRange?: { min?: number; max?: number };
    cycleLengthRange?: { min?: number; max?: number };
    stepsRange?: { min?: number; max?: number };
    durationRange?: { min?: number; max?: number };
  },
  status: ConstraintStatus
): void {
  if (phases.length === 0) return;

  // Calculate actual values
  const totalDuration = phases.reduce((sum, p) => sum + p.cycleLength, 0);
  const stepSizes: number[] = [];
  const cycleLengths = phases.map((p) => p.cycleLength);

  // Calculate step sizes using the actual starting dose
  let prevDose = startDose;
  for (const phase of phases) {
    const stepSize = prevDose - phase.avgDailyDose;
    if (stepSize > 0) stepSizes.push(stepSize);
    prevDose = phase.avgDailyDose;
  }

  const minActualStepSize = stepSizes.length > 0 ? Math.min(...stepSizes) : 0;
  const maxActualStepSize = stepSizes.length > 0 ? Math.max(...stepSizes) : 0;
  const minActualCycleLength = Math.min(...cycleLengths);
  const maxActualCycleLength = Math.max(...cycleLengths);

  // Check each constraint type
  if (originalConstraints.stepSizeRange) {
    if (
      originalConstraints.stepSizeRange.min &&
      minActualStepSize >= originalConstraints.stepSizeRange.min - 0.001
    ) {
      status.respected.push(
        `Minimum step size: ${minActualStepSize.toFixed(3)}mg ≥ ${
          originalConstraints.stepSizeRange.min
        }mg`
      );
    } else if (originalConstraints.stepSizeRange.min) {
      status.violated.push(
        `Minimum step size: ${minActualStepSize.toFixed(3)}mg < ${
          originalConstraints.stepSizeRange.min
        }mg`
      );
    }

    if (
      originalConstraints.stepSizeRange.max &&
      maxActualStepSize <= originalConstraints.stepSizeRange.max + 0.001
    ) {
      status.respected.push(
        `Maximum step size: ${maxActualStepSize.toFixed(3)}mg ≤ ${
          originalConstraints.stepSizeRange.max
        }mg`
      );
    } else if (originalConstraints.stepSizeRange.max) {
      status.violated.push(
        `Maximum step size: ${maxActualStepSize.toFixed(3)}mg > ${
          originalConstraints.stepSizeRange.max
        }mg`
      );
    }
  }

  if (originalConstraints.cycleLengthRange) {
    if (
      originalConstraints.cycleLengthRange.min &&
      minActualCycleLength >= originalConstraints.cycleLengthRange.min
    ) {
      status.respected.push(
        `Minimum cycle length: ${minActualCycleLength} days ≥ ${originalConstraints.cycleLengthRange.min} days`
      );
    } else if (originalConstraints.cycleLengthRange.min) {
      status.violated.push(
        `Minimum cycle length: ${minActualCycleLength} days < ${originalConstraints.cycleLengthRange.min} days`
      );
    }

    if (
      originalConstraints.cycleLengthRange.max &&
      maxActualCycleLength <= originalConstraints.cycleLengthRange.max
    ) {
      status.respected.push(
        `Maximum cycle length: ${maxActualCycleLength} days ≤ ${originalConstraints.cycleLengthRange.max} days`
      );
    } else if (originalConstraints.cycleLengthRange.max) {
      status.violated.push(
        `Maximum cycle length: ${maxActualCycleLength} days > ${originalConstraints.cycleLengthRange.max} days`
      );
    }
  }

  if (originalConstraints.stepsRange) {
    if (
      originalConstraints.stepsRange.min &&
      phases.length >= originalConstraints.stepsRange.min
    ) {
      status.respected.push(
        `Minimum steps: ${phases.length} ≥ ${originalConstraints.stepsRange.min}`
      );
    } else if (originalConstraints.stepsRange.min) {
      status.violated.push(
        `Minimum steps: ${phases.length} < ${originalConstraints.stepsRange.min}`
      );
      status.reasoning.push(
        `Could not create ${originalConstraints.stepsRange.min} steps while respecting other constraints`
      );
    }

    if (
      originalConstraints.stepsRange.max &&
      phases.length <= originalConstraints.stepsRange.max
    ) {
      status.respected.push(
        `Maximum steps: ${phases.length} ≤ ${originalConstraints.stepsRange.max}`
      );
    } else if (originalConstraints.stepsRange.max) {
      status.violated.push(
        `Maximum steps: ${phases.length} > ${originalConstraints.stepsRange.max}`
      );
      status.reasoning.push(
        `Exceeded maximum steps to meet minimum duration requirement`
      );
    }
  }

  if (originalConstraints.durationRange) {
    if (
      originalConstraints.durationRange.min &&
      totalDuration >= originalConstraints.durationRange.min
    ) {
      status.respected.push(
        `Minimum duration: ${totalDuration} days ≥ ${originalConstraints.durationRange.min} days`
      );
    } else if (originalConstraints.durationRange.min) {
      status.violated.push(
        `Minimum duration: ${totalDuration} days < ${originalConstraints.durationRange.min} days`
      );
      if (
        originalConstraints.stepsRange?.max &&
        phases.length >= originalConstraints.stepsRange.max
      ) {
        status.reasoning.push(
          `Could not meet minimum duration due to maximum steps constraint (${originalConstraints.stepsRange.max} steps)`
        );
      } else {
        status.reasoning.push(
          `Could not meet minimum duration with available pill combinations`
        );
      }
    }

    if (
      originalConstraints.durationRange.max &&
      totalDuration <= originalConstraints.durationRange.max
    ) {
      status.respected.push(
        `Maximum duration: ${totalDuration} days ≤ ${originalConstraints.durationRange.max} days`
      );
    } else if (originalConstraints.durationRange.max) {
      status.violated.push(
        `Maximum duration: ${totalDuration} days > ${originalConstraints.durationRange.max} days`
      );
    }
  }

  // Add general reasoning for constraint conflicts
  if (status.violated.length > 0) {
    status.warnings.push(
      "Some constraints could not be satisfied due to mathematical limitations or conflicts between constraints."
    );
    status.reasoning.push(
      "The algorithm prioritizes maximum constraints (hard limits) over minimum constraints when conflicts occur."
    );
  }
}
