import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { useAuthStore } from "../store/authStore";

function keyFor(userId: number) {
  return `flamestreet_onboarding_seen_${userId}`;
}

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const userId = useAuthStore((s) => s.user?.id ?? 0);
  const [step, setStep] = useState(0);

  const slides = useMemo(
    () => [
      {
        icon: "home",
        title: "Welcome to Flamestreet",
        text: "Promo banners, quick menu, dan Flame Points ada di Home.",
      },
      {
        icon: "fast-food",
        title: "Choose meals",
        text: "Pilih produk dan variannya. Kalau required, wajib dipilih sebelum add to cart.",
      },
      {
        icon: "flame",
        title: "Use Flame Points",
        text: "Kamu bisa bayar pakai Flame Points kalau saldo cukup. Tarik ke bawah untuk refresh data.",
      },
    ],
    [],
  );

  const w = Dimensions.get("window").width;
  const s = slides[step];

  async function finish() {
    try {
      if (userId) await SecureStore.setItemAsync(keyFor(userId), "1");
    } catch {}
    navigation.reset({ index: 0, routes: [{ name: "App" }] });
  }

  return (
    <Screen
      headerShown={false}
      style={{ padding: theme.spacing.md, justifyContent: "space-between" }}
    >
      <View style={{ alignItems: "flex-end" }}>
        <Pressable onPress={finish}>
          <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Skip</Text>
        </Pressable>
      </View>

      <View style={{ gap: 20, alignItems: "center", paddingHorizontal: 10 }}>
        <View
          style={{
            width: 86,
            height: 86,
            borderRadius: 26,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: "#0a0f0c",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={s.icon as any} size={34} color={theme.colors.green} />
        </View>
        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900", textAlign: "center" }}>
          {s.title}
        </Text>
        <Text style={{ color: theme.colors.muted, textAlign: "center" }}>{s.text}</Text>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === step ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === step ? theme.colors.green : theme.colors.border,
              }}
            />
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => setStep((v) => Math.max(0, v - 1))}
            disabled={step === 0}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 14,
              paddingVertical: 12,
              alignItems: "center",
              opacity: step === 0 ? 0.4 : 1,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Back</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (step === slides.length - 1) finish();
              else setStep((v) => Math.min(slides.length - 1, v + 1));
            }}
            style={{
              flex: 1,
              backgroundColor: theme.colors.green,
              borderRadius: 14,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#041009", fontWeight: "900" }}>
              {step === slides.length - 1 ? "Done" : "Next"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
