import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import TextField from "../ui/TextField";
import { theme } from "../ui/theme";
import { useNavigation } from "@react-navigation/native";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);

  async function onSubmit() {
    if (!login || !password) {
      Alert.alert("Login", "Please enter login and password");
      return;
    }
    setLoading(true);
    try {
      const r = await api.post("/auth/login", { login, password });
      const token = r.data?.token;
      if (!token) throw new Error("Missing token");
      await setToken(token);
      setUser(r.data?.user ?? null);
    } catch (e: any) {
      Alert.alert(
        "Login failed",
        e?.response?.data?.message ?? e?.message ?? "Unknown error",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ gap: 6 }}>
        <Text
          style={{ color: theme.colors.text, fontSize: 28, fontWeight: "900" }}
        >
          Flamestreet
        </Text>
        <Text style={{ color: theme.colors.muted }}>Login to continue</Text>
      </View>

      <Card style={{ gap: theme.spacing.md }}>
        <TextField
          label="Login"
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Email or username"
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
        />

        <Button onPress={onSubmit} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </Card>

      <Pressable onPress={() => navigation.navigate("Register")}>
        <Text style={{ color: theme.colors.muted }}>
          Don't have account?{" "}
          <Text style={{ color: theme.colors.green, fontWeight: "800" }}>
            Register
          </Text>
        </Text>
      </Pressable>
    </Screen>
  );
}
