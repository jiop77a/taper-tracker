import { Dimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";

interface TaperLineChartProps {
  data: { phase: number; avgDailyDose: number }[];
}

const screenWidth = Dimensions.get("window").width;

export default function TaperLineChart({ data }: TaperLineChartProps) {
  // Use light mode colors for consistency
  const backgroundColor = "#f8f9fa";

  const chartData = {
    labels: data.map((d) => `P${d.phase}`),
    datasets: [
      {
        data: data.map((d) => d.avgDailyDose),
        strokeWidth: 2,
      },
    ],
  };

  return (
    <View style={{ backgroundColor, borderRadius: 16, padding: 8 }}>
      <LineChart
        data={chartData}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundGradientFrom: backgroundColor,
          backgroundGradientTo: backgroundColor,
          color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(17, 24, 28, ${opacity})`,
          decimalPlaces: 2,
        }}
        bezier
        style={{ marginVertical: 8, borderRadius: 16 }}
      />
    </View>
  );
}
