import { View, type ViewProps } from "react-native";

export type ThemedViewProps = ViewProps & {
  backgroundColor?: string;
};

export function ThemedView({
  style,
  backgroundColor,
  ...otherProps
}: ThemedViewProps) {
  // Always use light mode background
  const bgColor = backgroundColor || "#fff";

  return <View style={[{ backgroundColor: bgColor }, style]} {...otherProps} />;
}
