import { Text, TextInput, TextInputProps, View } from "react-native";
import { theme } from "./theme";

export default function TextField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#6b7d73"
        style={[
          {
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: "#0a0f0c",
            borderRadius: theme.radius.md,
            paddingVertical: 12,
            paddingHorizontal: 14,
            color: theme.colors.text,
          },
          props.style,
        ]}
      />
    </View>
  );
}
