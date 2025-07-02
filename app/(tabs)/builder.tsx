import TaperLineChart from "@/components/TaperLineChart";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import React, { useState } from "react";
import { Button, ScrollView, StyleSheet, TextInput } from "react-native";
import { generateTaperPhases, TaperPhase } from "../../lib/generateTaperPhases";

export default function BuilderScreen() {
  const [currentAvgDose, setCurrentAvgDose] = useState("0.75");
  const [goalAvgDose, setGoalAvgDose] = useState("0.5");
  const [numberOfSteps, setNumberOfSteps] = useState("7");
  const [cycleLengthRange, setCycleLengthRange] = useState<[number, number]>([
    14, 14,
  ]);

  const [taperPhases, setTaperPhases] = useState<TaperPhase[]>([]);

  const handleGenerate = () => {
    const [minCycleLength, maxCycleLength] = cycleLengthRange;

    const phases = generateTaperPhases({
      currentAvgDose: parseFloat(currentAvgDose),
      goalAvgDose: parseFloat(goalAvgDose),
      numberOfSteps: parseInt(numberOfSteps, 10),
      minCycleLength,
      maxCycleLength,
    });

    setTaperPhases(phases);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        Taper Plan Builder
      </ThemedText>

      {/* Form */}
      <ThemedView style={styles.form}>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Current Avg Dose"
          placeholderTextColor="#666"
          value={currentAvgDose}
          onChangeText={setCurrentAvgDose}
        />
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Goal Avg Dose"
          placeholderTextColor="#666"
          value={goalAvgDose}
          onChangeText={setGoalAvgDose}
        />
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder="Number of Steps"
          placeholderTextColor="#666"
          value={numberOfSteps}
          onChangeText={setNumberOfSteps}
        />
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
        <ThemedText style={{ marginTop: 8, fontSize: 14 }}>
          Min: {cycleLengthRange[0]} days — Max: {cycleLengthRange[1]} days
        </ThemedText>
        <Button title="Generate Plan" onPress={handleGenerate} />
      </ThemedView>

      {/* Output Table */}
      {taperPhases.length > 0 && (
        <ThemedView style={styles.table}>
          <ThemedView style={styles.rowHeader}>
            <ThemedText style={styles.cellHeader}>Phase</ThemedText>
            <ThemedText style={styles.cellHeader}>Full</ThemedText>
            <ThemedText style={styles.cellHeader}>Half</ThemedText>
            <ThemedText style={styles.cellHeader}>Total</ThemedText>
            <ThemedText style={styles.cellHeader}>Avg/Day</ThemedText>
            <ThemedText style={styles.cellHeader}>Cycle Length</ThemedText>
          </ThemedView>
          {taperPhases.map((phase) => (
            <ThemedView style={styles.row} key={phase.phase}>
              <ThemedText style={styles.cell}>{phase.phase}</ThemedText>
              <ThemedText style={styles.cell}>{phase.fullPills}</ThemedText>
              <ThemedText style={styles.cell}>{phase.halfPills}</ThemedText>
              <ThemedText style={styles.cell}>{phase.totalPills}</ThemedText>
              <ThemedText style={styles.cell}>{phase.avgDailyDose}</ThemedText>
              <ThemedText style={styles.cell}>{phase.cycleLength}</ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
      )}
      {taperPhases.length > 0 && (
        <TaperLineChart
          data={taperPhases.map((p) => ({
            phase: p.phase,
            avgDailyDose: p.avgDailyDose,
          }))}
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
    backgroundColor: "#fff",
    color: "#11181C",
  },
  table: {
    borderWidth: 1,
    borderColor: "#ccc",
  },
  rowHeader: {
    flexDirection: "row",
    paddingVertical: 4,
    backgroundColor: "#f5f5f5",
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
});
