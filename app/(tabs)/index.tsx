import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import { Alert, Button, FlatList, Text, View } from "react-native";

const CYCLE_LENGTH = 14;
const DEFAULT_SCHEDULE = [
  1, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5,
];

type LogEntry = {
  day: string;
  dose: number;
};

export default function HomeScreen() {
  const [dayIndex, setDayIndex] = useState(0);
  const [schedule, setSchedule] = useState<number[]>(DEFAULT_SCHEDULE);
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Enable notifications to get daily reminders."
        );
      }
    })();
  }, []);

  useEffect(() => {
    Notifications.scheduleNotificationAsync({
      content: {
        title: "Medication Reminder",
        body: `Today take ${schedule[dayIndex]} pill(s)`,
      },
      trigger: {
        type: "daily",
        hour: 9,
        minute: 0,
      } as Notifications.DailyTriggerInput,
    });
  }, [dayIndex, schedule]);

  const logDose = () => {
    const today = new Date().toISOString().split("T")[0];
    setLog([...log, { day: today, dose: schedule[dayIndex] }]);
    setDayIndex((dayIndex + 1) % CYCLE_LENGTH);
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Day {dayIndex + 1}</Text>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        Take {schedule[dayIndex]} pill(s) today
      </Text>
      <Button title="Log Dose" onPress={logDose} />
      <FlatList
        style={{ marginTop: 30 }}
        data={log}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Text>
            {item.day}: {item.dose} pill(s)
          </Text>
        )}
      />
    </View>
  );
}
