import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { api } from "../lib/api";
import { toPublicUrl } from "../lib/assets";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { usePullToRefresh } from "../lib/usePullToRefresh";

type Article = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  cover_image?: string | null;
  published_at?: string | null;
  is_pinned?: boolean;
};

export default function ArticlesScreen() {
  const navigation = useNavigation<any>();
  const { refreshing, onRefresh } = usePullToRefresh();

  const query = useQuery({
    queryKey: ["articles"],
    queryFn: async (): Promise<Article[]> => {
      const r = await api.get("/articles", { params: { limit: 20 } });
      const data = r.data?.data ?? [];
      return Array.isArray(data) ? data : [];
    },
  });

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}
        data={query.data ?? []}
        keyExtractor={(i) => String(i.id)}
        refreshing={refreshing || query.isFetching}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <Text style={{ color: theme.colors.muted }}>
            {query.isLoading ? "Loading…" : "No articles"}
          </Text>
        }
        renderItem={({ item }) => {
          const img = toPublicUrl(item.cover_image);
          return (
            <Pressable onPress={() => navigation.navigate("ArticleDetail", { slug: item.slug })}>
              <Card style={{ gap: 10 }}>
                {img ? (
                  <Image
                    source={{ uri: img }}
                    style={{
                      width: "100%",
                      height: 180,
                      borderRadius: theme.radius.md,
                      backgroundColor: "#0a0f0c",
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: 180,
                      borderRadius: theme.radius.md,
                      backgroundColor: "#0a0f0c",
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  />
                )}
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }}>
                  {item.title}
                </Text>
                {item.excerpt ? (
                  <Text style={{ color: theme.colors.muted }} numberOfLines={2}>
                    {item.excerpt}
                  </Text>
                ) : null}
                {item.published_at ? (
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                    {new Date(item.published_at).toLocaleDateString("id-ID")}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
