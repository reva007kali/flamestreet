import ActionSheet, { ActionSheetItem } from "./ActionSheet";
import { Text } from "react-native";
import { theme } from "./theme";

export default function ConfirmSheet({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const items: ActionSheetItem[] = [
    {
      key: "confirm",
      label: confirmText,
      destructive,
      onPress: onConfirm,
    },
    {
      key: "cancel",
      label: cancelText,
      onPress: onClose,
    },
  ];

  return (
    <ActionSheet open={open} title={title} onClose={onClose} items={items}>
      {message ? (
        <Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 16 }}>
          {message}
        </Text>
      ) : null}
    </ActionSheet>
  );
}
