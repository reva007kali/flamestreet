import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "./theme";

type ToastVariant = "success" | "error" | "info";

type ToastState = {
  id: number;
  title: string;
  message?: string;
  variant: ToastVariant;
};

type ToastApi = {
  show: (t: Omit<ToastState, "id">) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const timer = useRef<any>(null);
  const nextId = useRef(1);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 12,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback(
    (t: Omit<ToastState, "id">) => {
      if (timer.current) clearTimeout(timer.current);
      const id = nextId.current++;
      setToast({ ...t, id });
      opacity.setValue(0);
      translateY.setValue(12);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      timer.current = setTimeout(hide, 2200);
    },
    [hide, opacity, translateY],
  );

  const api = useMemo(() => ({ show }), [show]);

  const icon =
    toast?.variant === "success"
      ? "checkmark-circle"
      : toast?.variant === "error"
        ? "alert-circle"
        : "information-circle";
  const iconColor =
    toast?.variant === "success"
      ? theme.colors.green
      : toast?.variant === "error"
        ? theme.colors.danger
        : theme.colors.muted;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.container,
              { opacity, transform: [{ translateY }] },
            ]}
          >
            <Pressable onPress={hide} style={styles.toast}>
              <Ionicons name={icon as any} size={18} color={iconColor} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title}>{toast.title}</Text>
                {toast.message ? (
                  <Text style={styles.message} numberOfLines={2}>
                    {toast.message}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="close" size={16} color={theme.colors.muted} />
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider is missing");
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 18,
    paddingHorizontal: 14,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0d1410",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  title: {
    color: theme.colors.text,
    fontWeight: "900",
  },
  message: {
    color: theme.colors.muted,
    fontSize: 12,
  },
});

