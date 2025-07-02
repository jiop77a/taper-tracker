import React from "react";
import CustomCalendar from "@/components/CustomCalendar";

const CYCLE_LENGTH = 14;
const DEFAULT_SCHEDULE = [
  1, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5,
];

export default function CalendarScreen() {
  return (
    <CustomCalendar schedule={DEFAULT_SCHEDULE} cycleLength={CYCLE_LENGTH} />
  );
}
