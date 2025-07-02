// Comprehensive test suite for the taper algorithm
const { generateUnifiedTaperPhases } = require('./lib/generateTaperPhases.ts');

console.log('=== COMPREHENSIVE TAPER ALGORITHM TEST SUITE ===\n');

function analyzeTaperQuality(phases, startDose, testName) {
  if (phases.length === 0) {
    return { 
      grade: 'F', 
      issues: ['No phases generated'], 
      stepVariance: Infinity,
      cycleConsistency: 'N/A'
    };
  }
  
  // Calculate step sizes
  let prevDose = startDose;
  const stepSizes = [];
  phases.forEach(phase => {
    const stepSize = prevDose - phase.avgDailyDose;
    if (stepSize > 0) stepSizes.push(stepSize);
    prevDose = phase.avgDailyDose;
  });
  
  // Step size analysis
  const avgStepSize = stepSizes.reduce((a, b) => a + b, 0) / stepSizes.length;
  const stepVariance = stepSizes.reduce((sum, step) => sum + Math.pow(step - avgStepSize, 2), 0) / stepSizes.length;
  const maxStepDeviation = Math.max(...stepSizes.map(s => Math.abs(s - avgStepSize)));
  
  // Cycle length analysis
  const cycleLengths = phases.map(p => p.cycleLength);
  const uniqueCycles = [...new Set(cycleLengths)];
  const cycleVariance = cycleLengths.reduce((sum, cycle) => {
    const avgCycle = cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length;
    return sum + Math.pow(cycle - avgCycle, 2);
  }, 0) / cycleLengths.length;
  
  // Quality grading
  const issues = [];
  let grade = 'A';
  
  // Step size consistency grading
  if (stepVariance > 0.001) {
    issues.push(`High step variance: ${stepVariance.toFixed(6)} (target: <0.001)`);
    grade = 'C';
  } else if (stepVariance > 0.0001) {
    issues.push(`Moderate step variance: ${stepVariance.toFixed(6)} (target: <0.0001)`);
    grade = 'B';
  }
  
  if (maxStepDeviation > avgStepSize * 0.2) {
    issues.push(`Large step deviation: ${maxStepDeviation.toFixed(3)} pills (>${(avgStepSize * 0.2).toFixed(3)} pills)`);
    grade = 'C';
  }
  
  // Cycle length consistency grading
  if (uniqueCycles.length > 2) {
    issues.push(`Too many cycle lengths: ${uniqueCycles.length} different (target: ≤2)`);
    grade = 'C';
  } else if (uniqueCycles.length > 1 && cycleVariance > 4) {
    issues.push(`High cycle variance: ${cycleVariance.toFixed(1)} (target: <4 when mixed)`);
    grade = 'B';
  }
  
  // Check for dose increases (should never happen)
  let prevDoseCheck = startDose;
  for (const phase of phases) {
    if (phase.avgDailyDose > prevDoseCheck + 0.001) {
      issues.push(`Dose increase detected: ${prevDoseCheck.toFixed(3)} → ${phase.avgDailyDose.toFixed(3)} pills`);
      grade = 'F';
      break;
    }
    prevDoseCheck = phase.avgDailyDose;
  }
  
  return {
    grade,
    issues,
    stepSizes,
    stepVariance,
    maxStepDeviation,
    avgStepSize,
    cycleLengths,
    uniqueCycles,
    cycleVariance,
    cycleConsistency: uniqueCycles.length === 1 ? 'Perfect' : 
                     uniqueCycles.length === 2 ? 'Good' : 'Poor'
  };
}

function runTest(testName, params, expectedGrade = 'A') {
  console.log(`${testName}:`);
  const result = generateUnifiedTaperPhases(params);
  const analysis = analyzeTaperQuality(result.phases, params.currentAvgDose, testName);
  const totalDuration = result.phases.reduce((sum, p) => sum + p.cycleLength, 0);
  
  // Display results
  console.log(`  Duration: ${totalDuration} days, Phases: ${result.phases.length}`);
  console.log(`  Grade: ${analysis.grade} (expected: ${expectedGrade})`);
  
  if (analysis.grade === 'A') {
    console.log(`  ✅ EXCELLENT: Step variance ${analysis.stepVariance.toFixed(6)}, ${analysis.cycleConsistency} cycles`);
  } else if (analysis.grade === 'B') {
    console.log(`  ⚠️ GOOD: Some minor inconsistencies`);
  } else {
    console.log(`  ❌ NEEDS WORK: Significant issues detected`);
  }
  
  if (analysis.issues.length > 0) {
    console.log(`  Issues:`);
    analysis.issues.forEach(issue => console.log(`    - ${issue}`));
  }
  
  if (analysis.stepSizes && analysis.stepSizes.length > 0) {
    console.log(`  Step sizes: ${analysis.stepSizes.map(s => s.toFixed(3)).join(', ')} pills`);
  }
  if (analysis.cycleLengths && analysis.cycleLengths.length > 0) {
    console.log(`  Cycle lengths: ${analysis.cycleLengths.join(', ')} days`);
  }
  
  // Constraint violations
  if (result.constraintStatus.violated.length > 0) {
    console.log(`  ⚠️ Constraint violations:`);
    result.constraintStatus.violated.forEach(v => console.log(`    ${v}`));
  }
  
  console.log('');
  return analysis.grade;
}

// Test Suite
let passCount = 0;
let totalTests = 0;

function expectGrade(testName, params, expectedGrade) {
  totalTests++;
  const actualGrade = runTest(testName, params, expectedGrade);
  if (actualGrade === expectedGrade || (expectedGrade === 'A' && actualGrade === 'B')) {
    passCount++;
  }
}

console.log('=== BASIC SMOOTHNESS TESTS ===');
expectGrade('Test 1: Simple taper', { currentAvgDose: 1.0, goalAvgDose: 0.5 }, 'A');
expectGrade('Test 2: Your example', { currentAvgDose: 0.75, goalAvgDose: 0.5 }, 'A');
expectGrade('Test 3: Larger reduction', { currentAvgDose: 2.0, goalAvgDose: 0.5 }, 'A');

console.log('=== DURATION CONSTRAINT TESTS ===');
expectGrade('Test 4: Short duration', { currentAvgDose: 1.5, goalAvgDose: 0.5, durationRange: { min: 60, max: 90 } }, 'A');
expectGrade('Test 5: Long duration', { currentAvgDose: 1.5, goalAvgDose: 0.25, durationRange: { min: 150, max: 200 } }, 'A');
expectGrade('Test 6: Very long duration', { currentAvgDose: 2.0, goalAvgDose: 0.0, durationRange: { min: 250, max: 350 } }, 'A');

console.log('=== STEP CONSTRAINT TESTS ===');
expectGrade('Test 7: Few steps', { currentAvgDose: 1.5, goalAvgDose: 0.5, stepsRange: { max: 5 } }, 'B'); // Might need flexibility
expectGrade('Test 8: Many steps', { currentAvgDose: 1.0, goalAvgDose: 0.3, stepsRange: { min: 8, max: 12 } }, 'A');

console.log('=== CYCLE LENGTH CONSTRAINT TESTS ===');
expectGrade('Test 9: Short cycles', { currentAvgDose: 1.0, goalAvgDose: 0.25, cycleLengthRange: { min: 7, max: 10 } }, 'A');
expectGrade('Test 10: Long cycles', { currentAvgDose: 1.5, goalAvgDose: 0.5, cycleLengthRange: { min: 21, max: 28 } }, 'A');

console.log('=== COMPLEX CONSTRAINT TESTS ===');
expectGrade('Test 11: Multiple constraints', { 
  currentAvgDose: 1.5, goalAvgDose: 0.75, 
  stepsRange: { min: 4, max: 6 }, 
  durationRange: { min: 100, max: 140 },
  cycleLengthRange: { min: 14, max: 21 }
}, 'A');

expectGrade('Test 12: Tight constraints', { 
  currentAvgDose: 1.0, goalAvgDose: 0.3, 
  stepsRange: { max: 4 }, 
  durationRange: { min: 80, max: 100 }
}, 'B'); // Might need flexibility

console.log('=== EDGE CASES WITHIN BOUNDS ===');
expectGrade('Test 13: Minimum reduction', { currentAvgDose: 1.0, goalAvgDose: 0.75 }, 'A');
expectGrade('Test 14: Maximum dose', { currentAvgDose: 2.0, goalAvgDose: 1.0 }, 'A');
expectGrade('Test 15: Small fractions', { currentAvgDose: 0.5, goalAvgDose: 0.25 }, 'A');

console.log('=== PRACTICAL BOUNDS VALIDATION ===');
console.log('Testing invalid inputs (should be rejected):');

const invalidTests = [
  { name: 'Too small reduction', params: { currentAvgDose: 1.0, goalAvgDose: 0.9 } },
  { name: 'Too high starting dose', params: { currentAvgDose: 2.5, goalAvgDose: 1.0 } },
  { name: 'Negative goal', params: { currentAvgDose: 1.0, goalAvgDose: -0.5 } },
  { name: 'No reduction', params: { currentAvgDose: 1.0, goalAvgDose: 1.0 } },
  { name: 'Reverse taper', params: { currentAvgDose: 0.5, goalAvgDose: 1.0 } }
];

invalidTests.forEach(test => {
  const result = generateUnifiedTaperPhases(test.params);
  if (result.phases.length === 0) {
    console.log(`  ✅ ${test.name}: Correctly rejected`);
    passCount++;
  } else {
    console.log(`  ❌ ${test.name}: Should have been rejected but got ${result.phases.length} phases`);
  }
  totalTests++;
});

console.log('\n=== RESULTS SUMMARY ===');
console.log(`Passed: ${passCount}/${totalTests} tests`);
console.log(`Success rate: ${((passCount/totalTests)*100).toFixed(1)}%`);

if (passCount === totalTests) {
  console.log('🎯 EXCELLENT: All tests passed! Algorithm consistently delivers smooth, consistent tapers.');
} else if (passCount >= totalTests * 0.8) {
  console.log('✅ GOOD: Most tests passed. Algorithm is working well for practical use cases.');
} else {
  console.log('⚠️ NEEDS WORK: Several tests failed. Algorithm needs improvement.');
}

console.log('\n💡 To run this test suite: node test-algorithm-comprehensive.js');
