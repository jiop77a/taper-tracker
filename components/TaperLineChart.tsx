import { Dimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useState, useEffect } from "react";

interface TaperLineChartProps {
  data: { phase: number; avgDailyDose: number }[];
}

export default function TaperLineChart({ data }: TaperLineChartProps) {
  // Use light mode colors for consistency
  const backgroundColor = "#f8f9fa";

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

  // Calculate chart dimensions based on orientation
  const chartWidth = screenData.width - 40;
  const chartHeight = screenData.isLandscape ? 180 : 220;

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
        width={chartWidth}
        height={chartHeight}
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
