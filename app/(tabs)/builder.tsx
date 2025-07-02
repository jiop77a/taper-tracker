import TaperLineChart from "@/components/TaperLineChart";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Dimensions,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  View,
} from "react-native";
import {
  generateUnifiedTaperPhases,
  calculateTaperDuration,
  getChartDataWithStartingPhase,
  TaperPhase,
  ConstraintStatus,
} from "../../lib/generateTaperPhases";

export default function BuilderScreen() {
  // Unified background color to match TaperLineChart
  const backgroundColor = "#f8f9fa";

  // Track screen dimensions for responsive design
  const [screenData, setScreenData] = useState(() => {
    const { width, height } = Dimensions.get("window");
    return {
      width,
      height,
      isSmallScreen: width < 375, // iPhone SE and smaller
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenData({
        width: window.width,
        height: window.height,
        isSmallScreen: window.width < 375,
      });
    });

    return () => subscription?.remove();
  }, []);

  const [currentAvgDose, setCurrentAvgDose] = useState("0.75");
  const [goalAvgDose, setGoalAvgDose] = useState("0.5");
  const [pillStrength, setPillStrength] = useState(""); // Optional mg per pill

  // Master auto-optimize toggle
  const [isAutoOptimizeAll, setIsAutoOptimizeAll] = useState(false);
  const [maxTotalDuration, setMaxTotalDuration] = useState("180");

  // Individual parameter controls (when not auto-optimizing all)
  const [stepSizeManual, setStepSizeManual] = useState(false);
  const [minStepSize, setMinStepSize] = useState("");
  const [maxStepSize, setMaxStepSize] = useState("");

  const [cycleLengthManual, setCycleLengthManual] = useState(false);
  const [minCycleLength, setMinCycleLength] = useState("");
  const [maxCycleLength, setMaxCycleLength] = useState("");

  const [stepsManual, setStepsManual] = useState(false);
  const [minSteps, setMinSteps] = useState("");
  const [maxSteps, setMaxSteps] = useState("");

  const [durationManual, setDurationManual] = useState(false);
  const [minTotalDuration, setMinTotalDuration] = useState("");

  const [taperPhases, setTaperPhases] = useState<TaperPhase[]>([]);

  const [constraintStatus, setConstraintStatus] =
    useState<ConstraintStatus | null>(null);

  // Input validation state
  const [inputErrors, setInputErrors] = useState<string[]>([]);

  // Create responsive styles
  const styles = createStyles(screenData.isSmallScreen);

  // Determine display units
  const isMilligramMode = pillStrength && pillStrength.trim() !== "";
  const displayUnit = isMilligramMode ? "mg" : " pills";

  // Validate inputs and return errors
  const validateInputs = useCallback((): string[] => {
    const errors: string[] = [];
    const current = parseFloat(currentAvgDose);
    const goal = parseFloat(goalAvgDose);

    // Check if inputs are valid numbers
    if (isNaN(current) || currentAvgDose.trim() === "") {
      errors.push("Current dose must be a valid number");
    } else {
      // Check dosing bounds
      if (current > 2.0) {
        errors.push("Current dose cannot exceed 2.0 pills per day");
      }
      if (current <= 0) {
        errors.push("Current dose must be greater than 0");
      }
    }

    if (isNaN(goal) || goalAvgDose.trim() === "") {
      errors.push("Goal dose must be a valid number");
    } else {
      if (goal < 0) {
        errors.push("Goal dose cannot be negative");
      }
    }

    // Check relationship between current and goal
    if (!isNaN(current) && !isNaN(goal)) {
      if (goal >= current) {
        errors.push("Goal dose must be less than current dose");
      }
      const reduction = current - goal;
      if (reduction < 0.25) {
        errors.push("Reduction must be at least 0.25 pills (quarter pill)");
      }
    }

    // Validate pill strength if provided
    if (pillStrength.trim() !== "") {
      const strength = parseFloat(pillStrength);
      if (isNaN(strength) || strength <= 0) {
        errors.push("Pill strength must be a positive number");
      }
    }

    // Validate manual constraint inputs if not in auto-optimize mode
    if (!isAutoOptimizeAll) {
      // Validate step size inputs
      if (stepSizeManual) {
        if (minStepSize.trim() !== "") {
          const minStep = parseFloat(minStepSize);
          if (isNaN(minStep) || minStep <= 0) {
            errors.push("Minimum step size must be a positive number");
          } else if (minStep > 1) {
            errors.push("Minimum step size seems too large (>1 pill)");
          }
        }
        if (maxStepSize.trim() !== "") {
          const maxStep = parseFloat(maxStepSize);
          if (isNaN(maxStep) || maxStep <= 0) {
            errors.push("Maximum step size must be a positive number");
          } else if (maxStep > 2) {
            errors.push("Maximum step size seems too large (>2 pills)");
          }
        }
        // Check min/max relationship
        if (minStepSize.trim() !== "" && maxStepSize.trim() !== "") {
          const minStep = parseFloat(minStepSize);
          const maxStep = parseFloat(maxStepSize);
          if (!isNaN(minStep) && !isNaN(maxStep) && minStep > maxStep) {
            errors.push(
              "Minimum step size cannot be greater than maximum step size"
            );
          }
        }
      }

      // Validate cycle length inputs
      if (cycleLengthManual) {
        if (minCycleLength.trim() !== "") {
          const minCycle = parseInt(minCycleLength, 10);
          if (isNaN(minCycle) || minCycle < 1) {
            errors.push("Minimum cycle length must be at least 1 day");
          } else if (minCycle > 90) {
            errors.push("Minimum cycle length seems too long (>90 days)");
          }
        }
        if (maxCycleLength.trim() !== "") {
          const maxCycle = parseInt(maxCycleLength, 10);
          if (isNaN(maxCycle) || maxCycle < 1) {
            errors.push("Maximum cycle length must be at least 1 day");
          } else if (maxCycle > 365) {
            errors.push("Maximum cycle length seems too long (>365 days)");
          }
        }
        // Check min/max relationship
        if (minCycleLength.trim() !== "" && maxCycleLength.trim() !== "") {
          const minCycle = parseInt(minCycleLength, 10);
          const maxCycle = parseInt(maxCycleLength, 10);
          if (!isNaN(minCycle) && !isNaN(maxCycle) && minCycle > maxCycle) {
            errors.push(
              "Minimum cycle length cannot be greater than maximum cycle length"
            );
          }
        }
      }

      // Validate steps inputs
      if (stepsManual) {
        if (minSteps.trim() !== "") {
          const minStepsNum = parseInt(minSteps, 10);
          if (isNaN(minStepsNum) || minStepsNum < 1) {
            errors.push("Minimum steps must be at least 1");
          } else if (minStepsNum > 50) {
            errors.push("Minimum steps seems too high (>50)");
          }
        }
        if (maxSteps.trim() !== "") {
          const maxStepsNum = parseInt(maxSteps, 10);
          if (isNaN(maxStepsNum) || maxStepsNum < 1) {
            errors.push("Maximum steps must be at least 1");
          } else if (maxStepsNum > 100) {
            errors.push("Maximum steps seems too high (>100)");
          }
        }
        // Check min/max relationship
        if (minSteps.trim() !== "" && maxSteps.trim() !== "") {
          const minStepsNum = parseInt(minSteps, 10);
          const maxStepsNum = parseInt(maxSteps, 10);
          if (
            !isNaN(minStepsNum) &&
            !isNaN(maxStepsNum) &&
            minStepsNum > maxStepsNum
          ) {
            errors.push("Minimum steps cannot be greater than maximum steps");
          }
        }
      }

      // Validate duration inputs
      if (durationManual) {
        if (minTotalDuration.trim() !== "") {
          const minDuration = parseInt(minTotalDuration, 10);
          if (isNaN(minDuration) || minDuration < 1) {
            errors.push("Minimum duration must be at least 1 day");
          } else if (minDuration > 1095) {
            // 3 years
            errors.push("Minimum duration seems too long (>3 years)");
          }
        }
        if (maxTotalDuration.trim() !== "") {
          const maxDuration = parseInt(maxTotalDuration, 10);
          if (isNaN(maxDuration) || maxDuration < 1) {
            errors.push("Maximum duration must be at least 1 day");
          } else if (maxDuration > 1825) {
            // 5 years
            errors.push("Maximum duration seems too long (>5 years)");
          }
        }
        // Check min/max relationship
        if (minTotalDuration.trim() !== "" && maxTotalDuration.trim() !== "") {
          const minDuration = parseInt(minTotalDuration, 10);
          const maxDuration = parseInt(maxTotalDuration, 10);
          if (
            !isNaN(minDuration) &&
            !isNaN(maxDuration) &&
            minDuration > maxDuration
          ) {
            errors.push(
              "Minimum duration cannot be greater than maximum duration"
            );
          }
        }
      }
    } else {
      // Validate auto-optimize mode inputs
      if (maxTotalDuration.trim() !== "") {
        const maxDuration = parseInt(maxTotalDuration, 10);
        if (isNaN(maxDuration) || maxDuration < 1) {
          errors.push("Maximum duration must be at least 1 day");
        } else if (maxDuration > 1825) {
          // 5 years
          errors.push("Maximum duration seems too long (>5 years)");
        }
      }
    }

    return errors;
  }, [
    currentAvgDose,
    goalAvgDose,
    pillStrength,
    isAutoOptimizeAll,
    stepSizeManual,
    minStepSize,
    maxStepSize,
    cycleLengthManual,
    minCycleLength,
    maxCycleLength,
    stepsManual,
    minSteps,
    maxSteps,
    durationManual,
    minTotalDuration,
    maxTotalDuration,
  ]);

  // Update validation when inputs change
  useEffect(() => {
    const errors = validateInputs();
    setInputErrors(errors);
  }, [validateInputs]);

  const handleGenerate = () => {
    // Don't generate if there are input errors
    if (inputErrors.length > 0) {
      return;
    }

    if (isAutoOptimizeAll) {
      // Use full auto-optimize mode - only max duration constraint
      const durationConstraint = maxTotalDuration
        ? parseInt(maxTotalDuration, 10)
        : undefined;
      const result = generateUnifiedTaperPhases({
        currentAvgDose: parseFloat(currentAvgDose),
        goalAvgDose: parseFloat(goalAvgDose),
        durationRange: durationConstraint
          ? { max: durationConstraint }
          : undefined,
      });
      setTaperPhases(result.phases);
      setConstraintStatus(result.constraintStatus);
    } else {
      // Use guided mode with selective constraints
      const result = generateUnifiedTaperPhases({
        currentAvgDose: parseFloat(currentAvgDose),
        goalAvgDose: parseFloat(goalAvgDose),
        stepSizeRange: stepSizeManual
          ? minStepSize || maxStepSize
            ? {
                min: minStepSize ? parseFloat(minStepSize) : undefined,
                max: maxStepSize ? parseFloat(maxStepSize) : undefined,
              }
            : undefined
          : undefined,
        cycleLengthRange: cycleLengthManual
          ? minCycleLength || maxCycleLength
            ? {
                min: minCycleLength ? parseInt(minCycleLength, 10) : undefined,
                max: maxCycleLength ? parseInt(maxCycleLength, 10) : undefined,
              }
            : undefined
          : undefined,
        stepsRange: stepsManual
          ? minSteps || maxSteps
            ? {
                min: minSteps ? parseInt(minSteps, 10) : undefined,
                max: maxSteps ? parseInt(maxSteps, 10) : undefined,
              }
            : undefined
          : undefined,
        durationRange: durationManual
          ? minTotalDuration || maxTotalDuration
            ? {
                min: minTotalDuration
                  ? parseInt(minTotalDuration, 10)
                  : undefined,
                max: maxTotalDuration
                  ? parseInt(maxTotalDuration, 10)
                  : undefined,
              }
            : undefined
          : undefined,
      });
      setTaperPhases(result.phases);
      setConstraintStatus(result.constraintStatus);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor }]}
      style={{ backgroundColor }}
    >
      <ThemedText type="title" style={styles.heading}>
        Taper Plan Builder
      </ThemedText>

      <ThemedView style={[styles.infoBox, { backgroundColor }]}>
        <ThemedText style={styles.infoText}>
          💊 This tool works in{" "}
          <ThemedText style={styles.infoHighlight}>pill units</ThemedText>.
          Enter doses as number of pills (e.g., 0.75 = three-quarters of a
          pill). Optionally enter pill strength to display results in mg.
        </ThemedText>
      </ThemedView>

      {/* Form */}
      <ThemedView style={[styles.form, { backgroundColor }]}>
        <ThemedText style={styles.label}>
          Current Average Daily Dose (pills)
        </ThemedText>
        <ThemedText style={styles.sublabel}>
          Maximum: 2.0 pills per day
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor }]}
          keyboardType="decimal-pad"
          placeholder="e.g., 0.75 pills (max: 2.0)"
          placeholderTextColor="#666"
          value={currentAvgDose}
          onChangeText={setCurrentAvgDose}
        />

        <ThemedText style={styles.label}>
          Target Average Daily Dose (pills)
        </ThemedText>
        <ThemedText style={styles.sublabel}>
          Must be at least 0.25 pills less than current dose
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor }]}
          keyboardType="decimal-pad"
          placeholder="e.g., 0.5 pills (≥ 0)"
          placeholderTextColor="#666"
          value={goalAvgDose}
          onChangeText={setGoalAvgDose}
        />

        <ThemedText style={styles.label}>
          Pill Strength (mg) - Optional
        </ThemedText>
        <ThemedText style={styles.sublabel}>
          Enter mg per pill to display results in mg. Leave blank for pill
          units.
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor }]}
          keyboardType="decimal-pad"
          placeholder="e.g., 0.125 (optional)"
          placeholderTextColor="#666"
          value={pillStrength}
          onChangeText={setPillStrength}
        />

        {/* Master Auto-Optimize Toggle */}
        <View style={styles.modeSelection}>
          <ThemedText style={styles.modeLabel}>
            Auto-Optimize Everything
          </ThemedText>
          <Switch
            value={isAutoOptimizeAll}
            onValueChange={setIsAutoOptimizeAll}
            trackColor={{ false: "#767577", true: "#0a7ea4" }}
            thumbColor={isAutoOptimizeAll ? "#f8f9fa" : "#f4f3f4"}
          />
        </View>
        <ThemedText style={styles.modeDescription}>
          {isAutoOptimizeAll
            ? "Algorithm finds the optimal taper path with minimal input"
            : "Customize specific parameters or let algorithm optimize others"}
        </ThemedText>

        {/* Conditional inputs based on mode */}
        {isAutoOptimizeAll ? (
          <>
            <ThemedText style={styles.label}>
              Maximum Total Duration (days)
            </ThemedText>
            <ThemedText style={styles.sublabel}>
              Optional time limit - leave blank for no constraint
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor }]}
              keyboardType="number-pad"
              placeholder="e.g., 180 (optional)"
              placeholderTextColor="#666"
              value={maxTotalDuration}
              onChangeText={setMaxTotalDuration}
            />
          </>
        ) : (
          <>
            {/* Step Size Range */}
            <ThemedText style={styles.label}>
              Step Size Range (pills)
            </ThemedText>
            <ThemedText style={styles.sublabel}>
              How much to reduce dose per step (e.g., 0.05-0.25 pills)
            </ThemedText>
            <View style={styles.parameterControl}>
              <View style={styles.toggleContainer}>
                <ThemedText style={styles.toggleLabel}>Auto</ThemedText>
                <Switch
                  value={stepSizeManual}
                  onValueChange={setStepSizeManual}
                  trackColor={{ false: "#767577", true: "#0a7ea4" }}
                  thumbColor={stepSizeManual ? "#f8f9fa" : "#f4f3f4"}
                />
                <ThemedText style={styles.toggleLabel}>Manual</ThemedText>
              </View>
              {stepSizeManual && (
                <View style={styles.rangeInputs}>
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor }]}
                    keyboardType="decimal-pad"
                    placeholder="Min pills"
                    placeholderTextColor="#666"
                    value={minStepSize}
                    onChangeText={setMinStepSize}
                  />
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor }]}
                    keyboardType="decimal-pad"
                    placeholder="Max pills"
                    placeholderTextColor="#666"
                    value={maxStepSize}
                    onChangeText={setMaxStepSize}
                  />
                </View>
              )}
            </View>

            {/* Cycle Length Range */}
            <ThemedText style={styles.label}>
              Cycle Length Range (days)
            </ThemedText>
            <ThemedText style={styles.sublabel}>
              How long to stay at each dose level (e.g., 7-28 days)
            </ThemedText>
            <View style={styles.parameterControl}>
              <View style={styles.toggleContainer}>
                <ThemedText style={styles.toggleLabel}>Auto</ThemedText>
                <Switch
                  value={cycleLengthManual}
                  onValueChange={setCycleLengthManual}
                  trackColor={{ false: "#767577", true: "#0a7ea4" }}
                  thumbColor={cycleLengthManual ? "#f8f9fa" : "#f4f3f4"}
                />
                <ThemedText style={styles.toggleLabel}>Manual</ThemedText>
              </View>
              {cycleLengthManual && (
                <View style={styles.rangeInputs}>
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor }]}
                    keyboardType="number-pad"
                    placeholder="Min"
                    placeholderTextColor="#666"
                    value={minCycleLength}
                    onChangeText={setMinCycleLength}
                  />
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor }]}
                    keyboardType="number-pad"
                    placeholder="Max"
                    placeholderTextColor="#666"
                    value={maxCycleLength}
                    onChangeText={setMaxCycleLength}
                  />
                </View>
              )}
            </View>

            {/* Number of Steps Range */}
            <ThemedText style={styles.label}>Number of Steps Range</ThemedText>
            <ThemedText style={styles.sublabel}>
              Total number of dose reductions (e.g., 3-10 steps)
            </ThemedText>
            <View style={styles.parameterControl}>
              <View style={styles.toggleContainer}>
                <ThemedText style={styles.toggleLabel}>Auto</ThemedText>
                <Switch
                  value={stepsManual}
                  onValueChange={setStepsManual}
                  trackColor={{ false: "#767577", true: "#0a7ea4" }}
                  thumbColor={stepsManual ? "#f8f9fa" : "#f4f3f4"}
                />
                <ThemedText style={styles.toggleLabel}>Manual</ThemedText>
              </View>
              {stepsManual && (
                <View style={styles.rangeInputs}>
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor }]}
                    keyboardType="number-pad"
                    placeholder="Min"
                    placeholderTextColor="#666"
                    value={minSteps}
                    onChangeText={setMinSteps}
                  />
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor }]}
                    keyboardType="number-pad"
                    placeholder="Max"
                    placeholderTextColor="#666"
                    value={maxSteps}
                    onChangeText={setMaxSteps}
                  />
                </View>
              )}
            </View>

            {/* Total Duration Range */}
            <ThemedText style={styles.label}>
              Total Duration Range (days)
            </ThemedText>
            <ThemedText style={styles.sublabel}>
              Total time for complete taper (e.g., 90-365 days)
            </ThemedText>
            <View style={styles.parameterControl}>
              <View style={styles.toggleContainer}>
                <ThemedText style={styles.toggleLabel}>Auto</ThemedText>
                <Switch
                  value={durationManual}
                  onValueChange={setDurationManual}
                  trackColor={{ false: "#767577", true: "#0a7ea4" }}
                  thumbColor={durationManual ? "#f8f9fa" : "#f4f3f4"}
                />
                <ThemedText style={styles.toggleLabel}>Manual</ThemedText>
              </View>
              {durationManual && (
                <View style={styles.rangeInputs}>
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor }]}
                    keyboardType="number-pad"
                    placeholder="Min"
                    placeholderTextColor="#666"
                    value={minTotalDuration}
                    onChangeText={setMinTotalDuration}
                  />
                  <TextInput
                    style={[styles.rangeInput, { backgroundColor }]}
                    keyboardType="number-pad"
                    placeholder="Max"
                    placeholderTextColor="#666"
                    value={maxTotalDuration}
                    onChangeText={setMaxTotalDuration}
                  />
                </View>
              )}
            </View>
          </>
        )}

        {/* Input Validation Errors */}
        {inputErrors.length > 0 && (
          <ThemedView style={[styles.errorBox, { backgroundColor }]}>
            <ThemedText style={styles.errorHeader}>
              ❌ Please fix the following issues:
            </ThemedText>
            {inputErrors.map((error, index) => (
              <ThemedText key={index} style={styles.errorText}>
                • {error}
              </ThemedText>
            ))}
          </ThemedView>
        )}

        <Button
          title="Generate Plan"
          onPress={handleGenerate}
          disabled={inputErrors.length > 0}
        />
      </ThemedView>

      {/* Constraint Status - Show regardless of whether phases were generated */}
      {constraintStatus &&
        (constraintStatus.violated.length > 0 ||
          constraintStatus.warnings.length > 0) && (
          <ThemedView style={[styles.constraintStatus, { backgroundColor }]}>
            {constraintStatus.violated.length > 0 && (
              <>
                <ThemedText style={styles.constraintHeader}>
                  ⚠️ Constraint Issues:
                </ThemedText>
                {constraintStatus.violated.map(
                  (violation: string, index: number) => (
                    <ThemedText key={index} style={styles.violationText}>
                      • {violation}
                    </ThemedText>
                  )
                )}
                {constraintStatus.reasoning.map(
                  (reason: string, index: number) => (
                    <ThemedText key={index} style={styles.reasoningText}>
                      → {reason}
                    </ThemedText>
                  )
                )}
              </>
            )}

            {constraintStatus.warnings.length > 0 && (
              <>
                {constraintStatus.warnings.map(
                  (warning: string, index: number) => (
                    <ThemedText key={index} style={styles.warningText}>
                      💡 {warning}
                    </ThemedText>
                  )
                )}
              </>
            )}
          </ThemedView>
        )}

      {/* Output Table - Only show when phases exist */}
      {taperPhases.length > 0 && (
        <>
          <ThemedView style={[styles.summaryContainer, { backgroundColor }]}>
            <ThemedText style={styles.summaryText}>
              Total Duration: {calculateTaperDuration(taperPhases)} days
            </ThemedText>
            <ThemedText style={styles.summaryText}>
              Number of Phases: {taperPhases.length}
            </ThemedText>
          </ThemedView>

          <ThemedView style={[styles.table, { backgroundColor }]}>
            <ThemedView style={[styles.rowHeader, { backgroundColor }]}>
              <ThemedText style={styles.cellHeader}>Phase</ThemedText>
              <ThemedText style={styles.cellHeader}>Full</ThemedText>
              <ThemedText style={styles.cellHeader}>Half</ThemedText>
              <ThemedText style={styles.cellHeader}>Total</ThemedText>
              <ThemedText style={styles.cellHeader}>
                {isMilligramMode ? "mg/Day" : "Pills/Day"}
              </ThemedText>
              <ThemedText style={styles.cellHeader}>Cycle Length</ThemedText>
            </ThemedView>
            {taperPhases.map((phase) => (
              <ThemedView
                style={[styles.row, { backgroundColor }]}
                key={phase.phase}
              >
                <ThemedText style={styles.cell}>{phase.phase}</ThemedText>
                <ThemedText style={styles.cell}>{phase.fullPills}</ThemedText>
                <ThemedText style={styles.cell}>{phase.halfPills}</ThemedText>
                <ThemedText style={styles.cell}>{phase.totalPills}</ThemedText>
                <ThemedText style={styles.cell}>
                  {isMilligramMode
                    ? (phase.avgDailyDose * parseFloat(pillStrength)).toFixed(3)
                    : phase.avgDailyDose.toString()}
                  {displayUnit}
                </ThemedText>
                <ThemedText style={styles.cell}>{phase.cycleLength}</ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        </>
      )}
      {taperPhases.length > 0 && (
        <TaperLineChart
          data={getChartDataWithStartingPhase(
            taperPhases,
            parseFloat(currentAvgDose)
          )}
        />
      )}
    </ScrollView>
  );
}

// Create responsive styles based on screen size
const createStyles = (isSmallScreen: boolean) =>
  StyleSheet.create({
    container: {
      padding: isSmallScreen ? 12 : 16,
    },
    heading: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 12,
    },
    form: {
      marginBottom: 24,
    },
    input: {
      borderWidth: 1,
      borderColor: "#aaa",
      borderRadius: 6,
      padding: isSmallScreen ? 8 : 10,
      marginBottom: 12,
      color: "#11181C",
      fontSize: isSmallScreen ? 14 : 16,
    },
    table: {
      borderWidth: 1,
      borderColor: "#ccc",
    },
    rowHeader: {
      flexDirection: "row",
      paddingVertical: 4,
      borderColor: "#ccc",
    },
    row: {
      flexDirection: "row",
      paddingVertical: 4,
      borderTopWidth: 1,
      borderTopColor: "#ccc",
    },
    cellHeader: {
      flex: 1,
      fontWeight: "bold",
      textAlign: "center",
    },
    cell: {
      flex: 1,
      textAlign: "center",
    },
    modeSelection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      paddingVertical: 8,
    },
    modeLabel: {
      fontSize: 16,
      fontWeight: "600",
    },
    modeDescription: {
      fontSize: 14,
      fontStyle: "italic",
      marginBottom: 16,
      color: "#666",
    },
    summaryContainer: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#ccc",
    },
    summaryText: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
      textAlign: "center",
    },
    label: {
      fontSize: isSmallScreen ? 15 : 16,
      fontWeight: "600",
      marginBottom: 4,
      marginTop: 8,
      color: "#11181C",
    },
    sublabel: {
      fontSize: isSmallScreen ? 13 : 14,
      color: "#666",
      marginBottom: 8,
      fontStyle: "italic",
    },
    sliderValues: {
      marginTop: 8,
      fontSize: 14,
      color: "#666",
      textAlign: "center",
    },
    parameterControl: {
      marginBottom: 16,
      padding: isSmallScreen ? 8 : 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#ddd",
    },
    toggleContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    toggleLabel: {
      fontSize: 14,
      color: "#666",
      marginHorizontal: 8,
    },
    rangeInputs: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    rangeInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#aaa",
      borderRadius: 6,
      padding: isSmallScreen ? 8 : 10,
      color: "#11181C",
      marginHorizontal: isSmallScreen ? 4 : 6,
      fontSize: isSmallScreen ? 14 : 16,
      minWidth: isSmallScreen ? 80 : 100, // Ensure minimum width for usability
    },
    constraintStatus: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#ff9500",
      backgroundColor: "#fff8f0",
    },
    constraintHeader: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 8,
      color: "#d2691e",
    },
    violationText: {
      fontSize: 14,
      color: "#d2691e",
      marginBottom: 4,
      marginLeft: 8,
    },
    reasoningText: {
      fontSize: 13,
      color: "#8b4513",
      marginBottom: 4,
      marginLeft: 16,
      fontStyle: "italic",
    },
    warningText: {
      fontSize: 14,
      color: "#ff6b35",
      marginTop: 8,
      fontWeight: "500",
    },
    infoBox: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#0a7ea4",
      backgroundColor: "#f0f8ff",
    },
    infoText: {
      fontSize: 14,
      color: "#11181C",
      lineHeight: 20,
    },
    infoHighlight: {
      fontWeight: "600",
      color: "#0a7ea4",
    },
    errorBox: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#dc3545",
      backgroundColor: "#fff5f5",
    },
    errorHeader: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 8,
      color: "#dc3545",
    },
    errorText: {
      fontSize: 14,
      color: "#dc3545",
      marginBottom: 4,
      marginLeft: 8,
    },
  });
