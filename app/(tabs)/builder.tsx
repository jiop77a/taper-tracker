import MultiSlider from "@ptomasroos/react-native-multi-slider";
import React, { useState } from "react";
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { generateTaperPhases, TaperPhase } from "../../lib/generateTaperPhases";

export default function BuilderScreen() {
  const [currentAvgDose, setCurrentAvgDose] = useState("0.75");
  const [goalAvgDose, setGoalAvgDose] = useState("0.5");
  const [numberOfSteps, setNumberOfSteps] = useState("7");
  const [minCycleLength, setMinCycleLength] = useState("14");
  const [maxCycleLength, setMaxCycleLength] = useState("14");
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
      <Text style={styles.heading}>Taper Plan Builder</Text>

      {/* Form */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Current Avg Dose"
          value={currentAvgDose}
          onChangeText={setCurrentAvgDose}
        />
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Goal Avg Dose"
          value={goalAvgDose}
          onChangeText={setGoalAvgDose}
        />
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          placeholder="Number of Steps"
          value={numberOfSteps}
          onChangeText={setNumberOfSteps}
        />
        <MultiSlider
          values={cycleLengthRange}
          min={0}
          max={20}
          step={1}
          onValuesChange={(values) =>
            setCycleLengthRange(values as [number, number])
          }
        />
        <Text className="mt-2 text-sm">
          Min: {cycleLengthRange[0]} days — Max: {cycleLengthRange[1]} days
        </Text>
        <Button title="Generate Plan" onPress={handleGenerate} />
      </View>

      {/* Output Table */}
      {taperPhases.length > 0 && (
        <View style={styles.table}>
          <View style={styles.rowHeader}>
            <Text style={styles.cellHeader}>Phase</Text>
            <Text style={styles.cellHeader}>Full</Text>
            <Text style={styles.cellHeader}>Half</Text>
            <Text style={styles.cellHeader}>Total</Text>
            <Text style={styles.cellHeader}>Avg/Day</Text>
            <Text style={styles.cellHeader}>Cycle Length</Text>
          </View>
          {taperPhases.map((phase) => (
            <View style={styles.row} key={phase.phase}>
              <Text style={styles.cell}>{phase.phase}</Text>
              <Text style={styles.cell}>{phase.fullPills}</Text>
              <Text style={styles.cell}>{phase.halfPills}</Text>
              <Text style={styles.cell}>{phase.totalPills}</Text>
              <Text style={styles.cell}>{phase.avgDailyDose}</Text>
              <Text style={styles.cell}>{phase.cycleLength}</Text>
            </View>
          ))}
        </View>
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
  },
  table: {
    borderWidth: 1,
    borderColor: "#ccc",
  },
  rowHeader: {
    flexDirection: "row",
    backgroundColor: "#eee",
    paddingVertical: 4,
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
