import TaperLineChart from "@/components/TaperLineChart";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
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
  generateTaperPhases,
  generateOptimalTaperPhases,
  calculateTaperDuration,
  getChartDataWithStartingPhase,
  TaperPhase,
} from "../../lib/generateTaperPhases";

export default function BuilderScreen() {
  // Unified background color to match TaperLineChart
  const backgroundColor = "#f8f9fa";

  const [currentAvgDose, setCurrentAvgDose] = useState("0.75");
  const [goalAvgDose, setGoalAvgDose] = useState("0.5");
  const [numberOfSteps, setNumberOfSteps] = useState("7");
  const [cycleLengthRange, setCycleLengthRange] = useState<[number, number]>([
    14, 14,
  ]);
  const [isAutoOptimize, setIsAutoOptimize] = useState(false);
  const [maxStepSize, setMaxStepSize] = useState("0.05");
  const [maxTotalDuration, setMaxTotalDuration] = useState("180");

  const [taperPhases, setTaperPhases] = useState<TaperPhase[]>([]);

  const handleGenerate = () => {
    if (isAutoOptimize) {
      // Use auto-optimize mode
      const phases = generateOptimalTaperPhases({
        currentAvgDose: parseFloat(currentAvgDose),
        goalAvgDose: parseFloat(goalAvgDose),
        maxStepSize: parseFloat(maxStepSize),
        maxTotalDuration: parseInt(maxTotalDuration, 10),
      });
      setTaperPhases(phases);
    } else {
      // Use guided mode with user constraints
      const [minCycleLength, maxCycleLength] = cycleLengthRange;
      const phases = generateTaperPhases({
        currentAvgDose: parseFloat(currentAvgDose),
        goalAvgDose: parseFloat(goalAvgDose),
        numberOfSteps: parseInt(numberOfSteps, 10),
        minCycleLength,
        maxCycleLength,
      });
      setTaperPhases(phases);
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

      {/* Form */}
      <ThemedView style={[styles.form, { backgroundColor }]}>
        <ThemedText style={styles.label}>
          Current Average Daily Dose (mg)
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor }]}
          keyboardType="decimal-pad"
          placeholder="e.g., 0.75"
          placeholderTextColor="#666"
          value={currentAvgDose}
          onChangeText={setCurrentAvgDose}
        />

        <ThemedText style={styles.label}>
          Target Average Daily Dose (mg)
        </ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor }]}
          keyboardType="decimal-pad"
          placeholder="e.g., 0.5"
          placeholderTextColor="#666"
          value={goalAvgDose}
          onChangeText={setGoalAvgDose}
        />

        {/* Mode Selection */}
        <View style={styles.modeSelection}>
          <ThemedText style={styles.modeLabel}>Auto-Optimize Mode</ThemedText>
          <Switch
            value={isAutoOptimize}
            onValueChange={setIsAutoOptimize}
            trackColor={{ false: "#767577", true: "#0a7ea4" }}
            thumbColor={isAutoOptimize ? "#f8f9fa" : "#f4f3f4"}
          />
        </View>
        <ThemedText style={styles.modeDescription}>
          {isAutoOptimize
            ? "Algorithm finds the smoothest possible taper path"
            : "Customize number of steps and cycle lengths"}
        </ThemedText>

        {/* Conditional inputs based on mode */}
        {isAutoOptimize ? (
          <>
            <ThemedText style={styles.label}>Maximum Step Size (mg)</ThemedText>
            <ThemedText style={styles.sublabel}>
              Leave blank to let the algorithm decide the optimal step sizes
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor }]}
              keyboardType="decimal-pad"
              placeholder="e.g., 0.05"
              placeholderTextColor="#666"
              value={maxStepSize}
              onChangeText={setMaxStepSize}
            />

            <ThemedText style={styles.label}>
              Maximum Total Duration (days)
            </ThemedText>
            <ThemedText style={styles.sublabel}>
              The algorithm will find the smoothest taper within this timeframe
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor }]}
              keyboardType="number-pad"
              placeholder="e.g., 180"
              placeholderTextColor="#666"
              value={maxTotalDuration}
              onChangeText={setMaxTotalDuration}
            />
          </>
        ) : (
          <>
            <ThemedText style={styles.label}>
              Number of Reduction Steps
            </ThemedText>
            <ThemedText style={styles.sublabel}>
              How many phases you want in your taper plan
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor }]}
              keyboardType="number-pad"
              placeholder="e.g., 7"
              placeholderTextColor="#666"
              value={numberOfSteps}
              onChangeText={setNumberOfSteps}
            />

            <ThemedText style={styles.label}>
              Cycle Length Range (days)
            </ThemedText>
            <ThemedText style={styles.sublabel}>
              How long to stay at each dose level before reducing
            </ThemedText>
            <MultiSlider
              values={cycleLengthRange}
              min={0}
              max={20}
              step={1}
              allowOverlap
              snapped
              onValuesChange={(values) =>
                setCycleLengthRange(values as [number, number])
              }
            />
            <ThemedText style={styles.sliderValues}>
              Min: {cycleLengthRange[0]} days — Max: {cycleLengthRange[1]} days
            </ThemedText>
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

          <ThemedView style={[styles.table, { backgroundColor }]}>
            <ThemedView style={[styles.rowHeader, { backgroundColor }]}>
              <ThemedText style={styles.cellHeader}>Phase</ThemedText>
              <ThemedText style={styles.cellHeader}>Full</ThemedText>
              <ThemedText style={styles.cellHeader}>Half</ThemedText>
              <ThemedText style={styles.cellHeader}>Total</ThemedText>
              <ThemedText style={styles.cellHeader}>Avg/Day</ThemedText>
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
                  {phase.avgDailyDose}
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
});
