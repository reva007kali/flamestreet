import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import Screen from "../ui/Screen";
import Card from "../ui/Card";
import { api } from "../lib/api";
import { theme } from "../ui/theme";

export default function NutritionScreen() {
  const q = useQuery({
    queryKey: ["member", "nutrition", "weekly"],
    queryFn: async () => (await api.get("/member/nutrition/weekly")).data,
    staleTime: 20_000,
  });

  const d: any = q.data ?? {};
  const totals = d?.totals ?? {};
  const range = d?.range ?? null;

  return (
    <Screen>
      <View style={{ padding: theme.spacing.md, gap: 12 }}>
        <Text
          style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }}
        >
          Nutrition
        </Text>
        <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
          Weekly summary
        </Text>

        {range?.start && range?.end ? (
          <Text style={{ color: theme.colors.muted, fontSize: 11 }}>
            {String(range.start)} → {String(range.end)}
          </Text>
        ) : null}

        {q.isLoading ? (
          <Text style={{ color: theme.colors.muted }}>Loading…</Text>
        ) : q.isError ? (
          <Text style={{ color: theme.colors.muted }}>
            Gagal memuat nutrition.{" "}
            {String((q as any).error?.response?.data?.message ?? "")}
          </Text>
        ) : null}

        <Card style={{ gap: 10 }}>
          <Row
            label="Calories"
            value={`${Number(totals?.kcal ?? 0).toLocaleString("id-ID")} kcal`}
          />
          <Row
            label="Protein"
            value={`${Number(totals?.protein_g ?? 0).toLocaleString("id-ID")} g`}
          />
          <Row
            label="Carbs"
            value={`${Number(totals?.carbs_g ?? 0).toLocaleString("id-ID")} g`}
          />
          <Row
            label="Fat"
            value={`${Number(totals?.fat_g ?? 0).toLocaleString("id-ID")} g`}
          />
        </Card>
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text style={{ color: theme.colors.muted, fontWeight: "800" }}>
        {label}
      </Text>
      <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
        {value}
      </Text>
    </View>
  );
}
