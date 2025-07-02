import TaperLineChart from "@/components/TaperLineChart";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import React, { useState } from "react";
import {
  Button,
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

  // Determine display units
  const isMilligramMode = pillStrength && pillStrength.trim() !== "";
  const displayUnit = isMilligramMode ? "mg" : " pills";

  const handleGenerate = () => {
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
          ? {
              min: minStepSize ? parseFloat(minStepSize) : undefined,
              max: maxStepSize ? parseFloat(maxStepSize) : undefined,
            }
          : undefined,
        cycleLengthRange: cycleLengthManual
          ? {
              min: minCycleLength ? parseInt(minCycleLength, 10) : undefined,
              max: maxCycleLength ? parseInt(maxCycleLength, 10) : undefined,
            }
          : undefined,
        stepsRange: stepsManual
          ? {
              min: minSteps ? parseInt(minSteps, 10) : undefined,
              max: maxSteps ? parseInt(maxSteps, 10) : undefined,
            }
          : undefined,
        durationRange: durationManual
          ? {
              min: minTotalDuration
                ? parseInt(minTotalDuration, 10)
                : undefined,
              max: maxTotalDuration
                ? parseInt(maxTotalDuration, 10)
                : undefined,
            }
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
        <TextInput
          style={[styles.input, { backgroundColor }]}
          keyboardType="decimal-pad"
          placeholder="e.g., 0.75 pills"
          placeholderTextColor="#666"
          value={currentAvgDose}
          onChangeText={setCurrentAvgDose}
        />

        <ThemedText style={styles.label}>
          Target Average Daily Dose (pills)
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor }]}
          keyboardType="decimal-pad"
          placeholder="e.g., 0.5 pills"
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
        <Button title="Generate Plan" onPress={handleGenerate} />
      </ThemedView>

      {/* Output Table */}
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

          {/* Constraint Status */}
          {constraintStatus &&
            (constraintStatus.violated.length > 0 ||
              constraintStatus.warnings.length > 0) && (
              <ThemedView
                style={[styles.constraintStatus, { backgroundColor }]}
              >
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

const styles = StyleSheet.create({
  container: {
    padding: 16,
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
    padding: 10,
    marginBottom: 12,
    color: "#11181C",
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 8,
    color: "#11181C",
  },
  sublabel: {
    fontSize: 14,
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
    padding: 12,
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
    gap: 12,
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 6,
    padding: 10,
    color: "#11181C",
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
});
