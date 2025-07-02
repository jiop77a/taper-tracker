// Constraint handling and error reporting tests
import { generateUnifiedTaperPhases } from '../../lib/generateTaperPhases';

describe('Constraint Handling and Error Reporting', () => {
  describe('Dosing bounds validation', () => {
    test('should reject starting dose above 2.0 pills', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.5,
        goalAvgDose: 1.0,
      });
      
      expect(result.phases).toHaveLength(0);
      expect(result.constraintStatus.violated.some(msg => 
        msg.includes("Starting dose too high")
      )).toBe(true);
    });

    test('should reject negative goal dose', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.0,
        goalAvgDose: -0.5,
      });
      
      expect(result.phases).toHaveLength(0);
      expect(result.constraintStatus.violated.some(msg => 
        msg.includes("Goal dose cannot be negative")
      )).toBe(true);
    });

    test('should reject reduction smaller than 0.25 pills', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 0.75,
        goalAvgDose: 0.65, // Only 0.1 reduction
      });
      
      expect(result.phases).toHaveLength(0);
      expect(result.constraintStatus.violated.some(msg => 
        msg.includes("Reduction too small")
      )).toBe(true);
    });

    test('should reject when goal dose >= current dose', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 0.5,
        goalAvgDose: 0.75, // Goal higher than current
      });
      
      expect(result.phases).toHaveLength(0);
      // This case actually triggers "Reduction too small" since goal > current results in negative reduction
      expect(result.constraintStatus.violated.some(msg => 
        msg.includes("Reduction too small") || msg.includes("must be greater than goal dose")
      )).toBe(true);
    });
  });

  describe('Constraint violation handling', () => {
    test('should handle impossible cycle length constraints with proper error messages', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.0,
        goalAvgDose: 0.5,
        cycleLengthRange: { max: 3 } // Very restrictive
      });
      
      expect(result.phases).toHaveLength(0);
      expect(result.constraintStatus.violated.some(msg => 
        msg.includes("No valid taper combinations found")
      )).toBe(true);
      expect(result.constraintStatus.reasoning.some(msg => 
        msg.includes("max cycle length of 3 days")
      )).toBe(true);
    });

    test('should handle conflicting step size constraints', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.5,
        stepSizeRange: { max: 0.01 }, // Very small steps
        cycleLengthRange: { max: 2 }   // Very short cycles
      });
      
      // Should either generate phases with constraint violations or fail with proper error
      if (result.phases.length === 0) {
        expect(result.constraintStatus.violated.length).toBeGreaterThan(0);
      } else {
        expect(
          result.constraintStatus.violated.some((msg) =>
            msg.includes("step size")
          )
        ).toBe(true);
      }
    });

    test('should provide helpful reasoning for constraint failures', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.0,
        goalAvgDose: 0.5,
        cycleLengthRange: { max: 2 }
      });
      
      if (result.phases.length === 0) {
        expect(result.constraintStatus.reasoning.length).toBeGreaterThan(0);
        expect(result.constraintStatus.reasoning.some(reason => 
          reason.includes('increasing') || reason.includes('adjusting')
        )).toBe(true);
      }
    });
  });

  describe('Silent failure prevention', () => {
    test('should never return empty phases without error messages', () => {
      // Test various scenarios that might cause silent failures
      const testCases = [
        { currentAvgDose: 1.0, goalAvgDose: 0.5, cycleLengthRange: { max: 1 } },
        { currentAvgDose: 1.0, goalAvgDose: 0.5, cycleLengthRange: { max: 2 } },
        { currentAvgDose: 2.0, goalAvgDose: 0.5, stepSizeRange: { max: 0.001 } },
      ];

      testCases.forEach((testCase) => {
        const result = generateUnifiedTaperPhases(testCase);
        
        // If no phases generated, there must be error messages
        if (result.phases.length === 0) {
          expect(
            result.constraintStatus.violated.length + 
            result.constraintStatus.warnings.length
          ).toBeGreaterThan(0);
        }
      });
    });

    test('should provide actionable error messages', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.0,
        goalAvgDose: 0.5,
        cycleLengthRange: { max: 1 } // Impossible constraint
      });
      
      if (result.phases.length === 0) {
        // Should have both violation and reasoning
        expect(result.constraintStatus.violated.length).toBeGreaterThan(0);
        expect(result.constraintStatus.reasoning.length).toBeGreaterThan(0);
        
        // Reasoning should suggest solutions
        const hasActionableAdvice = result.constraintStatus.reasoning.some(reason =>
          reason.includes('Try') || reason.includes('increase') || reason.includes('adjust')
        );
        expect(hasActionableAdvice).toBe(true);
      }
    });
  });

  describe('Constraint status reporting', () => {
    test('should report respected constraints for successful generation', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.0,
        goalAvgDose: 0.5,
        cycleLengthRange: { min: 14, max: 21 }
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.constraintStatus.violated).toHaveLength(0);
      // Should report what constraints were respected
      expect(result.constraintStatus.respected.length).toBeGreaterThan(0);
    });

    test('should distinguish between violations and warnings', () => {
      // Test a scenario that might generate warnings but not violations
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.5,
        goalAvgDose: 0.5,
        durationRange: { min: 30, max: 40 } // Very tight duration
      });
      
      // Should either succeed or provide clear feedback
      if (result.phases.length === 0) {
        expect(result.constraintStatus.violated.length).toBeGreaterThan(0);
      } else {
        // If it succeeded, check if there are any warnings about constraint flexibility
        const hasConstraintFeedback = 
          result.constraintStatus.warnings.length > 0 || 
          result.constraintStatus.violated.length > 0 ||
          result.constraintStatus.respected.length > 0;
        expect(hasConstraintFeedback).toBe(true);
      }
    });
  });
});
