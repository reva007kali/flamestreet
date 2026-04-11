import { enableScreens } from "react-native-screens";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { theme } from "./src/ui/theme";
import { ToastProvider } from "./src/ui/Toast";
import NotificationBridge from "./src/components/NotificationBridge";

enableScreens();

const queryClient = new QueryClient();

export default function App() {
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
