// Test for manual constraint handling fix
import { generateUnifiedTaperPhases } from "../../lib/generateTaperPhases";

describe("Manual Constraint Handling", () => {
  describe("Empty manual constraints should behave like auto mode", () => {
    test("should handle empty cycle length constraints without errors", () => {
      // This simulates the scenario: user switches cycle length to manual but doesn't enter values
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.5,
        cycleLengthRange: { min: undefined, max: undefined }, // Empty manual constraint
      });

      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });

    test("should handle empty step size constraints without errors", () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.5,
        stepSizeRange: { min: undefined, max: undefined }, // Empty manual constraint
      });

      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });

    test("should handle empty steps range constraints without errors", () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.5,
        stepsRange: { min: undefined, max: undefined }, // Empty manual constraint
      });

      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });

    test("should handle empty duration range constraints without errors", () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.5,
        durationRange: { min: undefined, max: undefined }, // Empty manual constraint
      });

      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });

    test("should handle all empty manual constraints without errors", () => {
      // This is the exact scenario that was causing the error
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.5,
        stepSizeRange: { min: undefined, max: undefined },
        cycleLengthRange: { min: undefined, max: undefined },
        stepsRange: { min: undefined, max: undefined },
        durationRange: { min: undefined, max: undefined },
      });

      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });
  });

  describe("Partial manual constraints should work correctly", () => {
    test("should handle only min cycle length specified", () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.5,
        cycleLengthRange: { min: 14, max: undefined },
      });

      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
      // All phases should have cycle length >= 14
      result.phases.forEach((phase) => {
        expect(phase.cycleLength).toBeGreaterThanOrEqual(14);
      });
    });

    test("should handle only max cycle length specified", () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.5,
        cycleLengthRange: { min: undefined, max: 10 },
      });

      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
      // All phases should have cycle length <= 10
      result.phases.forEach((phase) => {
        expect(phase.cycleLength).toBeLessThanOrEqual(10);
      });
    });
  });

  describe("UI constraint building logic", () => {
    // Helper function that mimics the UI logic after our fix
    function buildConstraints(
      cycleLengthManual: boolean,
      minCycleLength: string,
      maxCycleLength: string
    ) {
      return cycleLengthManual
        ? minCycleLength || maxCycleLength
          ? {
              min: minCycleLength ? parseInt(minCycleLength, 10) : undefined,
              max: maxCycleLength ? parseInt(maxCycleLength, 10) : undefined,
            }
          : undefined
        : undefined;
    }

    test("should return undefined when manual mode but no values entered", () => {
      const constraint = buildConstraints(true, "", "");
      expect(constraint).toBeUndefined();
    });

    test("should return undefined when in auto mode", () => {
      const constraint = buildConstraints(false, "7", "14");
      expect(constraint).toBeUndefined();
    });

    test("should return constraint object when manual mode with values", () => {
      const constraint = buildConstraints(true, "7", "14");
      expect(constraint).toEqual({ min: 7, max: 14 });
    });

    test("should return constraint object when manual mode with only min value", () => {
      const constraint = buildConstraints(true, "7", "");
      expect(constraint).toEqual({ min: 7, max: undefined });
    });

    test("should return constraint object when manual mode with only max value", () => {
      const constraint = buildConstraints(true, "", "14");
      expect(constraint).toEqual({ min: undefined, max: 14 });
    });
  });

  describe("Duration constraint optimization", () => {
    test("should meet minimum duration by adding more phases when cycle length is constrained", () => {
      // This tests the specific scenario: 2.0 -> 0.5 with max cycle length 6 and min duration 180
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.5,
        cycleLengthRange: { max: 6 },
        durationRange: { min: 180 },
      });

      expect(result.phases.length).toBeGreaterThan(15); // Should exceed default max steps
      const totalDuration = result.phases.reduce(
        (sum, p) => sum + p.cycleLength,
        0
      );
      expect(totalDuration).toBeGreaterThanOrEqual(180); // Should meet duration requirement
      expect(result.constraintStatus.violated).toHaveLength(0); // Should not have violations

      // All phases should respect the cycle length constraint
      result.phases.forEach((phase) => {
        expect(phase.cycleLength).toBeLessThanOrEqual(6);
      });
    });

    test("should add stabilization phases to meet duration requirements", () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.5,
        goalAvgDose: 0.5,
        cycleLengthRange: { max: 7 },
        durationRange: { min: 150 },
      });

      const totalDuration = result.phases.reduce(
        (sum, p) => sum + p.cycleLength,
        0
      );
      expect(totalDuration).toBeGreaterThanOrEqual(150);
      expect(result.constraintStatus.violated).toHaveLength(0);

      // Should mention adding phases in reasoning
      const hasStabilizationReasoning = result.constraintStatus.reasoning.some(
        (reason) =>
          reason.includes("stabilization phases") ||
          reason.includes("additional phases")
      );
      expect(hasStabilizationReasoning).toBe(true);
    });

    test("should never allow dose increases in taper progression", () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.5,
        cycleLengthRange: { max: 6 },
        durationRange: { min: 180 },
      });

      // Check that doses only decrease or stay the same
      let prevDose = 2.0; // Starting dose
      result.phases.forEach((phase) => {
        expect(phase.avgDailyDose).toBeLessThanOrEqual(prevDose);
        prevDose = phase.avgDailyDose;
      });

      // Should meet duration requirement without violations
      const totalDuration = result.phases.reduce(
        (sum, p) => sum + p.cycleLength,
        0
      );
      expect(totalDuration).toBeGreaterThanOrEqual(180);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });
  });
});
