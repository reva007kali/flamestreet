import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { theme } from "./theme";

export type ActionSheetItem = {
  key: string;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

export default function ActionSheet({
  open,
  title,
  onClose,
  items,
  children,
}: PropsWithChildren<{
  open: boolean;
  title?: string;
  onClose: () => void;
  items?: ActionSheetItem[];
}>) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          onPress={onClose}
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.65)" }}
        />
        <View
          style={{
            padding: 14,
            paddingBottom: 18,
          }}
        >
          <View
            style={{
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.06)",
              backgroundColor: "#0d0f0e",
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 14,
                paddingTop: 12,
                paddingBottom: 10,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.06)",
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                {title ?? ""}
              </Text>
              <Pressable
                onPress={onClose}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={18} color={theme.colors.text} />
              </Pressable>
            </View>

            {items?.length ? (
              <View style={{ padding: 10, gap: 8 }}>
                {items.map((it) => (
                  <Pressable
                    key={it.key}
                    onPress={() => {
                      if (it.disabled) return;
                      onClose();
                      it.onPress?.();
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.06)",
                      backgroundColor: "rgba(255,255,255,0.02)",
                      opacity: it.disabled ? 0.5 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: it.destructive ? theme.colors.danger : theme.colors.text,
                        fontWeight: "900",
                        fontSize: 14,
                      }}
                    >
                      {it.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {children ? <View style={{ padding: 10 }}>{children}</View> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

