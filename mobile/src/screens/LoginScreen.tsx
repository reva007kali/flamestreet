import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import Button from "../ui/Button";
import AuthShell from "../ui/AuthShell";
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
    <AuthShell title="Flamestreet" subtitle="Login untuk lanjut.">
      <View style={{ gap: theme.spacing.md }}>
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
      </View>

      <Pressable
        onPress={() => navigation.navigate("Register")}
        style={{ marginTop: theme.spacing.md, alignItems: "center" }}
      >
        <Text style={{ color: "rgba(232,245,238,0.78)" }}>
          Belum punya akun?{" "}
          <Text style={{ color: theme.colors.green, fontWeight: "900" }}>
            Register
          </Text>
        </Text>
      </Pressable>
    </AuthShell>
  );
}
