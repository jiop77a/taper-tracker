// Core taper generation algorithm tests
import { generateUnifiedTaperPhases } from '../../lib/generateTaperPhases';

describe('Taper Generation Algorithm', () => {
  describe('Valid dosing scenarios', () => {
    test('should accept valid dose range', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 0.75,
        goalAvgDose: 0.5, // 0.25 reduction
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });

    test('should accept maximum starting dose', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0, // Exactly at maximum
        goalAvgDose: 1.0,
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });

    test('should accept minimum reduction', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 0.75,
        goalAvgDose: 0.5, // Exactly 0.25 reduction
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });

    test('should accept goal dose of zero', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 0.5,
        goalAvgDose: 0.0, // Complete discontinuation
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });
  });

  describe('Edge cases and cycle length limits', () => {
    test('should handle very small valid reductions', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 0.5,
        goalAvgDose: 0.25, // Exactly 0.25 reduction
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });

    test('should handle large valid reductions', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.0, // Complete taper from maximum
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });

    test('should work with reasonable short cycle lengths', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.5,
        cycleLengthRange: { max: 6 } // Should work after our fixes
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
    });

    test('should find minimum working cycle length is around 4 days', () => {
      // Test that 4+ day cycles work for typical dose ranges
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.0,
        goalAvgDose: 0.5,
        cycleLengthRange: { max: 4 }
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
    });
  });

  describe('Duration constraint tests', () => {
    test('should handle short duration constraints', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.5,
        goalAvgDose: 0.5,
        durationRange: { min: 60, max: 90 },
      });

      expect(result.phases.length).toBeGreaterThan(0);
      const totalDuration = result.phases.reduce(
        (sum, p) => sum + p.cycleLength,
        0
      );

      // If the algorithm couldn't meet the duration constraint, it should warn us
      if (totalDuration < 60) {
        expect(
          result.constraintStatus.violated.length +
            result.constraintStatus.warnings.length
        ).toBeGreaterThan(0);
      } else {
        expect(totalDuration).toBeGreaterThanOrEqual(60);
        expect(totalDuration).toBeLessThanOrEqual(90);
      }
    });

    test('should handle long duration constraints', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.5,
        goalAvgDose: 0.25,
        durationRange: { min: 150, max: 200 },
      });

      expect(result.phases.length).toBeGreaterThan(0);
      const totalDuration = result.phases.reduce(
        (sum, p) => sum + p.cycleLength,
        0
      );
      expect(totalDuration).toBeGreaterThanOrEqual(150);
      expect(totalDuration).toBeLessThanOrEqual(200);
    });

    test('should handle very long duration constraints', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.0,
        durationRange: { min: 250, max: 350 },
      });

      expect(result.phases.length).toBeGreaterThan(0);
      const totalDuration = result.phases.reduce(
        (sum, p) => sum + p.cycleLength,
        0
      );
      expect(totalDuration).toBeGreaterThanOrEqual(250);
      expect(totalDuration).toBeLessThanOrEqual(350);
    });
  });

  describe('Step constraint tests', () => {
    test('should handle few steps constraint', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.5,
        goalAvgDose: 0.5,
        stepsRange: { max: 5 },
      });

      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.phases.length).toBeLessThanOrEqual(5);
    });

    test('should handle many steps constraint', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.0,
        goalAvgDose: 0.3,
        stepsRange: { min: 8, max: 12 },
      });

      expect(result.phases.length).toBeGreaterThanOrEqual(8);
      expect(result.phases.length).toBeLessThanOrEqual(12);
    });
  });

  describe('Cycle length constraint tests', () => {
    test('should handle short cycles', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.0,
        goalAvgDose: 0.25,
        cycleLengthRange: { min: 7, max: 10 },
      });

      expect(result.phases.length).toBeGreaterThan(0);
      result.phases.forEach((phase) => {
        expect(phase.cycleLength).toBeGreaterThanOrEqual(7);
        expect(phase.cycleLength).toBeLessThanOrEqual(10);
      });
    });

    test('should handle long cycles', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.5,
        goalAvgDose: 0.5,
        cycleLengthRange: { min: 21, max: 28 },
      });

      expect(result.phases.length).toBeGreaterThan(0);
      result.phases.forEach((phase) => {
        expect(phase.cycleLength).toBeGreaterThanOrEqual(21);
        expect(phase.cycleLength).toBeLessThanOrEqual(28);
      });
    });
  });

  describe('Complex multi-constraint tests', () => {
    test('should handle multiple constraints together', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.5,
        goalAvgDose: 0.75,
        stepsRange: { min: 4, max: 6 },
        durationRange: { min: 100, max: 140 },
        cycleLengthRange: { min: 14, max: 21 },
      });

      expect(result.phases.length).toBeGreaterThanOrEqual(4);
      expect(result.phases.length).toBeLessThanOrEqual(6);

      const totalDuration = result.phases.reduce(
        (sum, p) => sum + p.cycleLength,
        0
      );
      expect(totalDuration).toBeGreaterThanOrEqual(100);
      expect(totalDuration).toBeLessThanOrEqual(140);

      result.phases.forEach((phase) => {
        expect(phase.cycleLength).toBeGreaterThanOrEqual(14);
        expect(phase.cycleLength).toBeLessThanOrEqual(21);
      });
    });

    test('should handle tight constraints with flexibility', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.0,
        goalAvgDose: 0.3,
        stepsRange: { max: 4 },
        durationRange: { min: 80, max: 100 },
      });

      // Should either succeed with constraints or provide helpful error messages
      if (result.phases.length > 0) {
        expect(result.phases.length).toBeLessThanOrEqual(4);
        const totalDuration = result.phases.reduce(
          (sum, p) => sum + p.cycleLength,
          0
        );
        expect(totalDuration).toBeGreaterThanOrEqual(80);
        expect(totalDuration).toBeLessThanOrEqual(100);
      } else {
        expect(
          result.constraintStatus.violated.length +
            result.constraintStatus.warnings.length
        ).toBeGreaterThan(0);
      }
    });
  });
});
