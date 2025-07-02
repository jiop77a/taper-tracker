import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

interface CustomCalendarProps {
  schedule: number[];
  cycleLength: number;
  startDate?: Date;
}

export default function CustomCalendar({
  schedule,
  cycleLength,
  startDate = new Date(),
}: CustomCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Track screen dimensions and orientation
  const [screenData, setScreenData] = useState(() => {
    const { width, height } = Dimensions.get("window");
    return {
      width,
      height,
      isLandscape: width > height,
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenData({
        width: window.width,
        height: window.height,
        isLandscape: window.width > window.height,
      });
    });

    return () => subscription?.remove();
  }, []);

  const textColor = "#11181C";
  const fullPillColor = "#cce5ff";
  const halfPillColor = "#e2ffe2";
  const todayBorderColor = "#ff0000";

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday (0) to 6, Monday becomes 0
  };

  const getDoseForDate = (date: Date) => {
    const daysDiff = Math.floor(
      (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const scheduleIndex =
      ((daysDiff % cycleLength) + cycleLength) % cycleLength;
    return schedule[scheduleIndex];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;
    const weeks = [];

    let dayCounter = 1;

    for (let week = 0; week < totalCells / 7; week++) {
      const weekDays = [];

      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const cellIndex = week * 7 + dayOfWeek;

        if (cellIndex < firstDay || dayCounter > daysInMonth) {
          // Empty cell
          weekDays.push(
            <View
              key={`empty-${cellIndex}`}
              style={[
                styles.dayCell,
                screenData.isLandscape && styles.dayCellLandscape,
              ]}
            />
          );
        } else {
          // Day cell
          const date = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            dayCounter
          );
          const dose = getDoseForDate(date);
          const isTodayDate = isToday(date);

          const backgroundColor = dose === 1 ? fullPillColor : halfPillColor;

          weekDays.push(
            <View
              key={dayCounter}
              style={[
                styles.dayCell,
                screenData.isLandscape && styles.dayCellLandscape,
                { backgroundColor },
                isTodayDate && {
                  borderWidth: 3,
                  borderColor: todayBorderColor,
                  borderRadius: 20,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.dayText,
                  { color: textColor },
                  isTodayDate && { fontWeight: "900", fontSize: 18 },
                ]}
              >
                {dayCounter}
              </ThemedText>
            </View>
          );
          dayCounter++;
        }
      }

      weeks.push(
        <View key={`week-${week}`} style={styles.weekRow}>
          {weekDays}
        </View>
      );
    }

    return weeks;
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header with month navigation */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={goToPreviousMonth}
            style={styles.navButton}
          >
            <ThemedText style={[styles.navText, { color: textColor }]}>
              ‹
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={[styles.monthText, { color: textColor }]}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </ThemedText>

          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <ThemedText style={[styles.navText, { color: textColor }]}>
              ›
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View
          style={[
            styles.dayHeaderRow,
            screenData.isLandscape && styles.dayHeaderRowLandscape,
          ]}
        >
          {dayNames.map((day) => (
            <View
              key={day}
              style={[
                styles.dayHeaderCell,
                screenData.isLandscape && styles.dayHeaderCellLandscape,
              ]}
            >
              <ThemedText style={[styles.dayHeaderText, { color: textColor }]}>
                {day}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View
          style={[
            styles.calendarGrid,
            screenData.isLandscape && styles.calendarGridLandscape,
          ]}
        >
          {renderCalendarDays()}
        </View>

        {/* Legend */}
        <ThemedText style={[styles.legend, { color: textColor }]}>
          💊 Blue = 1 pill day, Green = 0.5 pill day{"\n"}
          🔴 Red border = Today
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  navButton: {
    padding: 10,
    minWidth: 40,
    alignItems: "center",
  },
  navText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  monthText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  dayHeaderRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: "600",
  },
  calendarGrid: {
    borderRadius: 8,
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
    margin: 1,
    minWidth: 0, // Ensures flex works properly
  },
  dayText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  legend: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
  calendarGridLandscape: {
    alignSelf: "center",
    maxWidth: 600, // Increased width for better landscape viewing
    width: "80%", // Use percentage of screen width
  },
  dayCellLandscape: {
    maxWidth: 80, // Increased cell width for better visibility
    maxHeight: 80, // Increased cell height for better visibility
  },
  dayHeaderRowLandscape: {
    alignSelf: "center",
    maxWidth: 600, // Match calendar grid width
    width: "80%", // Match calendar grid width
  },
  dayHeaderCellLandscape: {
    flex: 1, // Keep flex behavior but within constrained parent
    maxWidth: 86, // Slightly larger to account for margins (80 + 6 for margins)
  },
});
