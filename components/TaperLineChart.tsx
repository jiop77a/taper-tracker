import { Dimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";

interface TaperLineChartProps {
  data: { phase: number; avgDailyDose: number }[];
}

const screenWidth = Dimensions.get("window").width;

export default function TaperLineChart({ data }: TaperLineChartProps) {
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
    <View>
      <LineChart
        data={chartData}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`, // indigo
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          decimalPlaces: 2,
        }}
        bezier
        style={{ marginVertical: 8, borderRadius: 16 }}
      />
    </View>
  );
}
