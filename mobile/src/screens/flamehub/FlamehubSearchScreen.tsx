import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { api } from "../../lib/api";
import { toPublicUrl } from "../../lib/assets";
import AppFlatList from "../../ui/AppFlatList";
import Card from "../../ui/Card";
import Screen from "../../ui/Screen";
import { theme } from "../../ui/theme";

type UserBrief = {
  id: number;
  username: string;
  full_name?: string | null;
  avatar?: string | null;
};

export default function FlamehubSearchScreen() {
  const navigation = useNavigation<any>();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const query = useQuery({
    queryKey: ["flamehub", "searchUsers", debounced],
    enabled: debounced.length > 0,
    queryFn: async () => {
      const r = await api.get("/flamehub/users/search", {
        params: { q: debounced },
      });
      return (r.data?.data ?? []) as UserBrief[];
    },
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);

  return (
    <Screen>
      <View style={{ padding: theme.spacing.md, gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ color: theme.colors.green, fontWeight: "900" }}>
              Back
            </Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("FlamehubCreate")}>
            <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
              Post
            </Text>
          </Pressable>
        </View>

        <Card style={{ gap: 10 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontWeight: "900",
              fontSize: 18,
            }}
          >
            Search
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              backgroundColor: "#0a0f0c",
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Cari username…"
              placeholderTextColor={theme.colors.muted}
              style={{ color: theme.colors.text }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </Card>

        <AppFlatList
          contentContainerStyle={{ gap: 10, paddingBottom: 14 }}
          data={rows}
          keyExtractor={(i) => String(i.id)}
          ListEmptyComponent={
            q.trim().length === 0 ? (
              <Text style={{ color: theme.colors.muted }}>
                Ketik username untuk mulai mencari.
              </Text>
            ) : query.isLoading ? (
              <Text style={{ color: theme.colors.muted }}>Searching…</Text>
            ) : (
              <Text style={{ color: theme.colors.muted }}>No users found.</Text>
            )
          }
          renderItem={({ item }) => {
            const avatar = toPublicUrl(item.avatar);
            return (
              <Pressable
                onPress={() =>
                  navigation.navigate("FlamehubProfile", {
                    username: item.username,
                  })
                }
              >
                <Card
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 16,
                      backgroundColor: "rgba(34,197,94,0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(34,197,94,0.25)",
                      overflow: "hidden",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {avatar ? (
                      <Image
                        source={{ uri: avatar }}
                        style={{ width: 44, height: 44 }}
                      />
                    ) : (
                      <Text
                        style={{ color: theme.colors.green, fontWeight: "900" }}
                      >
                        {(item.username?.[0] ?? "F").toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: theme.colors.text, fontWeight: "900" }}
                    >
                      @{item.username}
                    </Text>
                    {item.full_name ? (
                      <Text
                        style={{ color: theme.colors.muted }}
                        numberOfLines={1}
                      >
                        {item.full_name}
                      </Text>
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      </View>
    </Screen>
  );
}
