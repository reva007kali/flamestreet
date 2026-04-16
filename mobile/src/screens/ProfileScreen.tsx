import { Alert, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { api } from "../lib/api";
import { toPublicUrl } from "../lib/assets";
import { useAuthStore } from "../store/authStore";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { usePullToRefresh } from "../lib/usePullToRefresh";
import TextField from "../ui/TextField";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);
  const { refreshing, onRefresh } = usePullToRefresh();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const avatarUrl = toPublicUrl(user?.avatar);

  useEffect(() => {
    setFullName(user?.full_name ?? "");
    setPhoneNumber(user?.phone_number ?? "");
  }, [user?.id]);

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {}
    await setToken(null);
    setUser(null);
    navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
  }

  async function refreshMe() {
    try {
      const r = await api.get("/me");
      setUser(r.data?.user ?? null);
    } catch {}
  }

  async function saveProfile() {
    try {
      await api.put("/me/profile", {
        full_name: fullName || null,
        phone_number: phoneNumber || null,
      });
      await refreshMe();
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Update failed", e?.response?.data?.message ?? "Cannot update profile");
    }
  }

  async function changeAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo access");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
      aspect: [1, 1],
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) return;

    const uri = asset.uri;
    const name = uri.split("/").pop() || "avatar.jpg";
    const ext = name.split(".").pop()?.toLowerCase();
    const type = ext === "png" ? "image/png" : "image/jpeg";

    const fd = new FormData();
    fd.append("avatar", { uri, name, type } as any);

    try {
      await api.post("/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshMe();
    } catch (e: any) {
      Alert.alert("Upload failed", e?.response?.data?.message ?? "Cannot upload avatar");
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.text}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
          Profile
        </Text>

        <Card style={{ gap: 12, alignItems: "center" }}>
          <Pressable onPress={changeAvatar}>
            <View>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 46,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: "#0a0f0c",
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 46,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: "#0a0f0c",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="person" size={34} color={theme.colors.muted} />
                </View>
              )}
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: theme.colors.green,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Ionicons name="pencil" size={14} color="#041009" />
              </View>
            </View>
          </Pressable>

          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              {user?.full_name ?? user?.username ?? "—"}
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
              @{user?.username ?? "—"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              variant="secondary"
              onPress={() => setEditing((v) => !v)}
              style={{ paddingVertical: 10 }}
            >
              {editing ? "Cancel" : "Edit profile"}
            </Button>
            <Button
              onPress={saveProfile}
              disabled={!editing}
              style={{ paddingVertical: 10 }}
            >
              Save
            </Button>
          </View>
        </Card>

        <Card style={{ gap: 12 }}>
          {editing ? (
            <>
              <TextField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Full name" />
              <TextField
                label="Phone number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
            </>
          ) : (
            <>
              <View style={{ gap: 4 }}>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Email</Text>
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  {user?.email ?? "—"}
                </Text>
              </View>
              <View style={{ gap: 4 }}>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Phone</Text>
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  {user?.phone_number ?? "—"}
                </Text>
              </View>
              <View style={{ gap: 4 }}>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Roles</Text>
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  {(user?.roles ?? []).join(", ") || "—"}
                </Text>
              </View>
            </>
          )}
        </Card>

        <Button
          variant="danger"
          onPress={() => {
            Alert.alert("Logout", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Logout", style: "destructive", onPress: logout },
            ]);
          }}
        >
          Logout
        </Button>
      </ScrollView>
    </Screen>
  );
}
