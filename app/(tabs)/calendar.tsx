import React from "react";
import { Text, View } from "react-native";
import { Calendar } from "react-native-calendars";

const CYCLE_LENGTH = 14;
const DEFAULT_SCHEDULE = [
  1, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5,
];

function generateMarkedDates(startDate: Date, schedule: number[]) {
  const marked: Record<string, any> = {};

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const iso = date.toISOString().split("T")[0];
    const dose = schedule[i % CYCLE_LENGTH];

    marked[iso] = {
      customStyles: {
        container: {
          backgroundColor: dose === 1 ? "#cce5ff" : "#e2ffe2",
        },
        text: {
          color: "black",
          fontWeight: "bold",
        },
      },
    };
  }

  return marked;
}

export default function CalendarScreen() {
  const today = new Date();
  const markedDates = generateMarkedDates(today, DEFAULT_SCHEDULE);

  return (
    <View style={{ flex: 1 }}>
      <Calendar
        markingType={"custom"}
        markedDates={markedDates}
        theme={{
          calendarBackground: "#fff",
          textDayFontSize: 14,
        }}
      />
      <Text style={{ padding: 16 }}>
        💊 Blue = 1 pill day, Green = 0.5 pill day
      </Text>
    </View>
  );
}
