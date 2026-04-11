import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import Card from "../ui/Card";
import { theme } from "../ui/theme";

export type ProductModifierOption = {
  id: number;
  name: string;
  additional_price?: number | string | null;
  is_default?: boolean;
};

export type ProductModifier = {
  id: number;
  name: string;
  type: "single" | "multiple";
  is_required?: boolean;
  options?: ProductModifierOption[];
};

export function isModifierComplete(
  modifier: ProductModifier,
  selectedIds: number[],
) {
  const ids = new Set(selectedIds ?? []);
  const options = modifier.options ?? [];
  const selectedInThis = options.filter((o) => ids.has(o.id));
  if (!modifier.is_required) return true;
  return selectedInThis.length > 0;
}

export default function ModifierSelector({
  modifiers,
  selectedIds,
  onChange,
}: {
  modifiers: ProductModifier[];
  selectedIds: number[];
  onChange: (next: number[]) => void;
}) {
  const set = new Set(selectedIds ?? []);

  const toggle = (m: ProductModifier, opt: ProductModifierOption) => {
    const next = new Set(selectedIds ?? []);
    if (m.type === "single") {
      for (const o of m.options ?? []) next.delete(o.id);
      next.add(opt.id);
    } else {
      if (next.has(opt.id)) next.delete(opt.id);
      else next.add(opt.id);
    }
    onChange(Array.from(next));
  };

  return (
    <View style={{ gap: 12 }}>
      {(modifiers ?? []).map((m) => {
        const complete = isModifierComplete(m, selectedIds);
        return (
          <Card key={m.id} style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ gap: 2 }}>
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  {m.name}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                  {m.type === "single" ? "Choose one" : "Choose multiple"}
                  {m.is_required ? " • Required" : ""}
                </Text>
              </View>
              {m.is_required ? (
                <Ionicons
                  name={complete ? "checkmark-circle" : "alert-circle"}
                  size={18}
                  color={complete ? theme.colors.green : theme.colors.danger}
                />
              ) : null}
            </View>

            <View style={{ gap: 8 }}>
              {(m.options ?? []).map((o) => {
                const active = set.has(o.id);
                const add = Number(o.additional_price ?? 0);
                return (
                  <Pressable key={o.id} onPress={() => toggle(m, o)}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderWidth: 1,
                        borderColor: active
                          ? theme.colors.green
                          : theme.colors.border,
                        backgroundColor: active ? "#0b1b12" : "transparent",
                        borderRadius: theme.radius.md,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                      }}
                    >
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <Ionicons
                          name={
                            m.type === "single"
                              ? active
                                ? "radio-button-on"
                                : "radio-button-off"
                              : active
                                ? "checkbox"
                                : "square-outline"
                          }
                          size={18}
                          color={active ? theme.colors.green : theme.colors.muted}
                        />
                        <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                          {o.name}
                        </Text>
                      </View>
                      {add > 0 ? (
                        <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                          +Rp {add.toLocaleString("id-ID")}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

