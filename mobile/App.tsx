import { enableScreens } from "react-native-screens";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text, TextInput } from "react-native";
import { useFonts } from "expo-font";
import {
  GoogleSansFlex_400Regular,
  GoogleSansFlex_500Medium,
  GoogleSansFlex_700Bold,
  GoogleSansFlex_800ExtraBold,
  GoogleSansFlex_900Black,
} from "@expo-google-fonts/google-sans-flex";
import RootNavigator from "./src/navigation/RootNavigator";
import { theme } from "./src/ui/theme";
import { ToastProvider } from "./src/ui/Toast";
import NotificationBridge from "./src/components/NotificationBridge";

enableScreens();

const queryClient = new QueryClient();
let globalFontApplied = false;

export default function App() {
  const [fontsLoaded] = useFonts({
    GoogleSansFlex_400Regular,
    GoogleSansFlex_500Medium,
    GoogleSansFlex_700Bold,
    GoogleSansFlex_800ExtraBold,
    GoogleSansFlex_900Black,
  });

  if (fontsLoaded && !globalFontApplied) {
    const TextAny = Text as any;
    const TextInputAny = TextInput as any;

    TextAny.defaultProps = TextAny.defaultProps ?? {};
    TextAny.defaultProps.style = [
      { fontFamily: "GoogleSansFlex_400Regular" },
      TextAny.defaultProps.style,
    ];

    TextInputAny.defaultProps = TextInputAny.defaultProps ?? {};
    TextInputAny.defaultProps.style = [
      { fontFamily: "GoogleSansFlex_400Regular" },
      TextInputAny.defaultProps.style,
    ];

    globalFontApplied = true;
  }

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <NotificationBridge>
            <RootNavigator />
            <StatusBar
              style="light"
              backgroundColor={theme.colors.bg}
              translucent={false}
            />
          </NotificationBridge>
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
