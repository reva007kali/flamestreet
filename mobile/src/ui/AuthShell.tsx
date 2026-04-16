import { PropsWithChildren } from "react";
import {
  ImageBackground,
  Platform,
  ScrollView,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "./theme";

const BG_URL =
  "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=2400&q=80";

export default function AuthShell({
  title,
  subtitle,
  scroll = false,
  contentStyle,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}>) {
  const Container: any = scroll ? ScrollView : View;
  const containerProps = scroll
    ? {
        contentContainerStyle: [
          {
            flexGrow: 1,
            padding: theme.spacing.md,
            justifyContent: "center",
            alignItems: "center",
          },
          contentStyle,
        ],
        keyboardShouldPersistTaps: "handled",
      }
    : {
        style: [
          {
            flex: 1,
            padding: theme.spacing.md,
            justifyContent: "center",
            alignItems: "center",
          },
          contentStyle,
        ],
      };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ImageBackground
        source={{ uri: BG_URL }}
        resizeMode="cover"
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0.78)", "rgba(0,0,0,0.95)"]}
          style={{ flex: 1 }}
        >
          <Container {...containerProps}>
            <View style={{ width: "100%", maxWidth: 420 }}>
              <View style={{ alignItems: "center" }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.32)",
                    borderWidth: 1,
                    borderColor: "rgba(34,197,94,0.45)",
                    shadowColor: theme.colors.green,
                    shadowOpacity: 0.35,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 8,
                  }}
                >
                  <Ionicons name="flame" size={26} color={theme.colors.green} />
                </View>
                <Text
                  style={{
                    marginTop: 14,
                    color: theme.colors.text,
                    fontSize: 28,
                    fontWeight: "900",
                    textAlign: "center",
                    letterSpacing: Platform.OS === "ios" ? 0.2 : 0,
                  }}
                >
                  {title}
                </Text>
                {subtitle ? (
                  <Text
                    style={{
                      marginTop: 6,
                      color: "rgba(232,245,238,0.78)",
                      textAlign: "center",
                    }}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>

              <View
                style={[
                  {
                    marginTop: 18,
                    padding: theme.spacing.md,
                    borderRadius: theme.radius.lg,
                    backgroundColor: "rgba(13,20,16,0.72)",
                    borderWidth: 1,
                    borderColor: "rgba(34,197,94,0.35)",
                    shadowColor: theme.colors.green,
                    shadowOpacity: 0.25,
                    shadowRadius: 24,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 10,
                  },
                ]}
              >
                {children}
              </View>
            </View>
          </Container>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}
