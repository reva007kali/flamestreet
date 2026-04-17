import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
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
import ConfirmSheet from "../ui/ConfirmSheet";

// Komponen Pembantu untuk Baris Info agar terlihat modern
function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.03)",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: "#1a1a1a",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={18} color={theme.colors.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.colors.muted,
            fontSize: 11,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: "#fff",
            fontSize: 15,
            fontWeight: "800",
            marginTop: 2,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);
  const { refreshing, onRefresh } = usePullToRefresh();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [flamehubBio, setFlamehubBio] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const avatarUrl = toPublicUrl(user?.avatar);

  useEffect(() => {
    setFullName(user?.full_name ?? "");
    setPhoneNumber(user?.phone_number ?? "");
    setFlamehubBio(user?.flamehub_bio ?? "");
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
        flamehub_bio: flamehubBio.trim() || null,
      });
      await refreshMe();
      setEditing(false);
    } catch (e: any) {
      Alert.alert(
        "Update failed",
        e?.response?.data?.message ?? "Cannot update profile",
      );
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
      Alert.alert(
        "Upload failed",
        e?.response?.data?.message ?? "Cannot upload avatar",
      );
    }
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            tintColor={theme.colors.green}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* -- TOP HEADER -- */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 28,
              fontWeight: "900",
              letterSpacing: -1,
            }}
          >
            Account
          </Text>
          <Pressable
            onPress={editing ? saveProfile : () => setEditing(true)}
            style={{
              backgroundColor: editing
                ? theme.colors.green
                : "rgba(255,255,255,0.05)",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: editing ? "#000" : "#fff",
                fontWeight: "800",
                fontSize: 13,
              }}
            >
              {editing ? "Save Changes" : "Edit Profile"}
            </Text>
          </Pressable>
        </View>

        {/* -- AVATAR SECTION -- */}
        <View style={{ alignItems: "center", marginTop: 10 }}>
          <Pressable onPress={changeAvatar}>
            <View
              style={{
                padding: 4,
                borderRadius: 60,
                borderWidth: 2,
                borderColor: theme.colors.green,
                borderStyle: "dashed",
              }}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: 110, height: 110, borderRadius: 55 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: 55,
                    backgroundColor: "#1a1a1a",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="person"
                    size={40}
                    color={theme.colors.muted}
                  />
                </View>
              )}
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 5,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: theme.colors.green,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 4,
                  borderColor: theme.colors.bg,
                }}
              >
                <Ionicons name="camera" size={16} color="#000" />
              </View>
            </View>
          </Pressable>
          <Text
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: "900",
              marginTop: 16,
            }}
          >
            {user?.full_name ?? "Member"}
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: 14 }}>
            @{user?.username}
          </Text>
        </View>

        {/* -- ACCOUNT DETAILS SECTION -- */}
        <View style={{ gap: 16 }}>
          <Text
            style={{
              color: "rgba(255,255,255,0.4)",
              fontWeight: "800",
              textTransform: "uppercase",
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            Personal Information
          </Text>

          <Card
            style={{
              padding: 20,
              borderRadius: 24,
              backgroundColor: "#151515",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.03)",
            }}
          >
            {editing ? (
              <View style={{ gap: 15 }}>
                <TextField
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your name"
                />
                <TextField
                  label="Phone Number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
                <TextField
                  label="Bio (Flamehub)"
                  value={flamehubBio}
                  onChangeText={setFlamehubBio}
                  placeholder="Write a short bio"
                  multiline
                  style={{ minHeight: 80, textAlignVertical: "top" }}
                />
                <Button
                  variant="secondary"
                  onPress={() => setEditing(false)}
                  style={{ marginTop: 5 }}
                >
                  Cancel
                </Button>
              </View>
            ) : (
              <View>
                <InfoRow
                  label="Email Address"
                  value={user?.email ?? "—"}
                  icon="mail-outline"
                />
                <InfoRow
                  label="Phone"
                  value={user?.phone_number ?? "—"}
                  icon="call-outline"
                />
                <InfoRow
                  label="Membership"
                  value={(user?.roles ?? []).join(" • ") || "Member"}
                  icon="ribbon-outline"
                />
              </View>
            )}
          </Card>
        </View>

        {/* -- SUPPORT & APP SECTION -- */}
        <View style={{ gap: 16 }}>
          <Text
            style={{
              color: "rgba(255,255,255,0.4)",
              fontWeight: "800",
              textTransform: "uppercase",
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            Preferences
          </Text>
          <Card
            style={{ padding: 8, borderRadius: 24, backgroundColor: "#151515" }}
          >
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#222",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="notifications-outline" size={18} color="#fff" />
              </View>
              <Text style={{ color: "#fff", fontWeight: "700", flex: 1 }}>
                Notifications
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#333" />
            </Pressable>
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#222",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="lock-closed-outline" size={18} color="#fff" />
              </View>
              <Text style={{ color: "#fff", fontWeight: "700", flex: 1 }}>
                Privacy & Security
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#333" />
            </Pressable>
          </Card>
        </View>

        {/* -- DANGER ZONE -- */}
        <View style={{ marginTop: 10 }}>
          <Pressable
            onPress={() => {
              setLogoutOpen(true);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 16,
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.2)",
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={{ color: "#ef4444", fontWeight: "900", fontSize: 16 }}>
              Sign Out
            </Text>
          </Pressable>
          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 11,
              textAlign: "center",
              marginTop: 16,
            }}
          >
            Flame Street App v1.0.4
          </Text>
        </View>

        <ConfirmSheet
          open={logoutOpen}
          title="Sign Out"
          message="Are you sure you want to log out?"
          confirmText="Sign Out"
          destructive
          onClose={() => setLogoutOpen(false)}
          onConfirm={() => {
            setLogoutOpen(false);
            logout();
          }}
        />
      </ScrollView>
    </Screen>
  );
}
