import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import TextField from "../ui/TextField";
import { theme } from "../ui/theme";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { AuthStackParamList } from "../navigation/types";

type RegisterRoute = RouteProp<AuthStackParamList, "Register">;

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RegisterRoute>();
  const allowTrainer = Boolean(route.params?.allowTrainer);
  const presetRole = route.params?.presetRole ?? "member";
  const [role, setRole] = useState<"member" | "trainer">(
    allowTrainer ? presetRole : "member",
  );
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);

  const payload = useMemo(() => {
    const base: any = {
      full_name: fullName,
      username,
      phone_number: phoneNumber,
      email,
      password,
      role,
    };
    if (dateOfBirth) base.date_of_birth = dateOfBirth;
    if (role === "member" && referralCode) base.referral_code = referralCode;
    return base;
  }, [
    fullName,
    username,
    phoneNumber,
    email,
    password,
    role,
    dateOfBirth,
    referralCode,
  ]);

  async function onSubmit() {
    if (!fullName || !username || !phoneNumber || !email || !password) {
      Alert.alert("Register", "Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const r = await api.post("/auth/register", payload);
      const token = r.data?.token;
      if (!token) throw new Error("Missing token");
      await setToken(token);
      setUser(r.data?.user ?? null);
    } catch (e: any) {
      Alert.alert(
        "Register failed",
        e?.response?.data?.message ?? e?.message ?? "Unknown error",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "900" }}>
            Register
          </Text>
          <Text style={{ color: theme.colors.muted }}>Create your account.</Text>
        </View>

        <Card style={{ gap: theme.spacing.md }}>
          {allowTrainer ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                variant={role === "member" ? "primary" : "secondary"}
                onPress={() => setRole("member")}
                style={{ flex: 1, paddingVertical: 10 }}
              >
                Member
              </Button>
              <Button
                variant={role === "trainer" ? "primary" : "secondary"}
                onPress={() => setRole("trainer")}
                style={{ flex: 1, paddingVertical: 10 }}
              >
                Trainer
              </Button>
            </View>
          ) : null}

          <TextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
          />
          <TextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Username"
          />
          <TextField
            label="Phone number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholder="Phone number"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Email"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
          />
          <TextField
            label="Date of birth (YYYY-MM-DD)"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
          />

          {role === "member" ? (
            <TextField
              label="Referral code (optional)"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
              placeholder="Referral code"
            />
          ) : null}

          <Button onPress={onSubmit} disabled={loading}>
            {loading ? "Creating..." : "Register"}
          </Button>
        </Card>

        <Pressable onPress={() => navigation.navigate("Login")}>
          <Text style={{ color: theme.colors.muted }}>
            Already have account?{" "}
            <Text style={{ color: theme.colors.green, fontWeight: "800" }}>
              Login
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
