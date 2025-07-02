// Quality and smoothness analysis tests
import { generateUnifiedTaperPhases } from '../../lib/generateTaperPhases';

describe('Quality and Smoothness Analysis', () => {
  function analyzeStepSizes(phases: any[], startDose: number) {
    let prevDose = startDose;
    const stepSizes: number[] = [];
    
    phases.forEach(phase => {
      const stepSize = prevDose - phase.avgDailyDose;
      if (stepSize > 0) stepSizes.push(stepSize);
      prevDose = phase.avgDailyDose;
    });
    
    const avgStepSize = stepSizes.reduce((a, b) => a + b, 0) / stepSizes.length;
    const stepVariance = stepSizes.reduce((sum, step) => 
      sum + Math.pow(step - avgStepSize, 2), 0) / stepSizes.length;
    
    return { stepSizes, avgStepSize, stepVariance };
  }

  describe('Step size consistency', () => {
    test('should produce smooth step sizes for simple taper', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.0,
        goalAvgDose: 0.5,
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      const analysis = analyzeStepSizes(result.phases, 1.0);
      
      // Step variance should be low for smooth tapers
      expect(analysis.stepVariance).toBeLessThan(0.01);
      
      // No step should be more than 50% larger than average
      const maxDeviation = Math.max(
        ...analysis.stepSizes.map((s) => Math.abs(s - analysis.avgStepSize))
      );
      expect(maxDeviation).toBeLessThan(analysis.avgStepSize * 0.5);
    });

    test('should maintain consistent step sizes across different dose ranges', () => {
      const testCases = [
        { currentAvgDose: 0.75, goalAvgDose: 0.5 },
        { currentAvgDose: 1.5, goalAvgDose: 1.0 },
        { currentAvgDose: 2.0, goalAvgDose: 1.5 }
      ];

      testCases.forEach(testCase => {
        const result = generateUnifiedTaperPhases(testCase);
        expect(result.phases.length).toBeGreaterThan(0);
        
        const analysis = analyzeStepSizes(result.phases, testCase.currentAvgDose);
        
        // All step sizes should be reasonably similar
        const coefficientOfVariation = Math.sqrt(analysis.stepVariance) / analysis.avgStepSize;
        expect(coefficientOfVariation).toBeLessThan(0.5); // Less than 50% variation
      });
    });
  });

  describe('Dose progression validation', () => {
    test('should never increase doses', () => {
      const testCases = [
        { currentAvgDose: 1.0, goalAvgDose: 0.5 },
        { currentAvgDose: 2.0, goalAvgDose: 0.25 },
        { currentAvgDose: 0.75, goalAvgDose: 0.5 }
      ];

      testCases.forEach(testCase => {
        const result = generateUnifiedTaperPhases(testCase);
        expect(result.phases.length).toBeGreaterThan(0);
        
        let prevDose = testCase.currentAvgDose;
        result.phases.forEach(phase => {
          expect(phase.avgDailyDose).toBeLessThanOrEqual(prevDose + 0.001); // Allow tiny rounding
          prevDose = phase.avgDailyDose;
        });
      });
    });

    test('should maintain monotonic decrease', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.5,
        goalAvgDose: 0.5
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      
      // Each phase should have a lower dose than the previous
      for (let i = 1; i < result.phases.length; i++) {
        expect(result.phases[i].avgDailyDose).toBeLessThan(result.phases[i-1].avgDailyDose);
      }
    });

    test('should reach the goal dose accurately', () => {
      const testCases = [
        { currentAvgDose: 1.0, goalAvgDose: 0.5 },
        { currentAvgDose: 2.0, goalAvgDose: 0.0 },
        { currentAvgDose: 0.75, goalAvgDose: 0.25 }
      ];

      testCases.forEach(testCase => {
        const result = generateUnifiedTaperPhases(testCase);
        expect(result.phases.length).toBeGreaterThan(0);
        
        const finalDose = result.phases[result.phases.length - 1].avgDailyDose;
        expect(Math.abs(finalDose - testCase.goalAvgDose)).toBeLessThan(0.1); // Within 0.1 pills
      });
    });
  });

  describe('Cycle length consistency', () => {
    test('should maintain reasonable cycle length consistency', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.5,
        goalAvgDose: 0.5,
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      const cycleLengths = result.phases.map(p => p.cycleLength);
      const uniqueCycles = [...new Set(cycleLengths)];
      
      // Should not have too many different cycle lengths
      expect(uniqueCycles.length).toBeLessThanOrEqual(3);
    });

    test('should prefer consistent cycle lengths when possible', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.0,
        goalAvgDose: 0.5,
        cycleLengthRange: { min: 14, max: 14 } // Force consistent cycles
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      
      // All cycles should be the same length
      const cycleLengths = result.phases.map(p => p.cycleLength);
      const uniqueCycles = [...new Set(cycleLengths)];
      expect(uniqueCycles).toHaveLength(1);
      expect(uniqueCycles[0]).toBe(14);
    });

    test('should handle mixed cycle lengths gracefully', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.5,
        goalAvgDose: 0.25,
        cycleLengthRange: { min: 7, max: 21 } // Allow variation
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      
      // All cycle lengths should be within the specified range
      result.phases.forEach(phase => {
        expect(phase.cycleLength).toBeGreaterThanOrEqual(7);
        expect(phase.cycleLength).toBeLessThanOrEqual(21);
      });
      
      // Should not have excessive variation
      const cycleLengths = result.phases.map(p => p.cycleLength);
      const uniqueCycles = [...new Set(cycleLengths)];
      expect(uniqueCycles.length).toBeLessThanOrEqual(4); // Reasonable variety
    });
  });

  describe('Overall taper quality', () => {
    test('should produce reasonable total duration', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.0,
        goalAvgDose: 0.5
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      
      const totalDuration = result.phases.reduce((sum, p) => sum + p.cycleLength, 0);
      
      // Should be reasonable duration (not too short or too long)
      expect(totalDuration).toBeGreaterThan(20); // At least 3 weeks
      expect(totalDuration).toBeLessThan(365); // Less than a year
    });

    test('should balance number of steps with step size', () => {
      const result = generateUnifiedTaperPhases({
        currentAvgDose: 1.5,
        goalAvgDose: 0.5 // 1.0 pill reduction
      });
      
      expect(result.phases.length).toBeGreaterThan(0);
      
      const analysis = analyzeStepSizes(result.phases, 1.5);
      
      // Should have reasonable number of steps (not too few, not too many)
      expect(result.phases.length).toBeGreaterThan(2);
      expect(result.phases.length).toBeLessThan(20);
      
      // Average step size should be reasonable
      expect(analysis.avgStepSize).toBeGreaterThan(0.02); // Not too tiny
      expect(analysis.avgStepSize).toBeLessThan(0.5);     // Not too large
    });

    test('should handle edge case dose ranges appropriately', () => {
      // Test minimum valid reduction
      const minResult = generateUnifiedTaperPhases({
        currentAvgDose: 0.75,
        goalAvgDose: 0.5 // Exactly 0.25 reduction
      });
      
      expect(minResult.phases.length).toBeGreaterThan(0);
      expect(minResult.phases.length).toBeLessThan(10); // Should be relatively few steps
      
      // Test maximum dose
      const maxResult = generateUnifiedTaperPhases({
        currentAvgDose: 2.0,
        goalAvgDose: 0.0 // Complete taper
      });
      
      expect(maxResult.phases.length).toBeGreaterThan(0);
      expect(maxResult.phases.length).toBeGreaterThan(5); // Should have more steps for large reduction
    });
  });
});
