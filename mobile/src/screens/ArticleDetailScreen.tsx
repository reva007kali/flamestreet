import { useQuery } from "@tanstack/react-query";
import { RouteProp, useRoute } from "@react-navigation/native";
import { Image, RefreshControl, ScrollView, Text, View } from "react-native";
import { api } from "../lib/api";
import { toPublicUrl } from "../lib/assets";
import { RootStackParamList } from "../navigation/types";
import Card from "../ui/Card";
import Screen from "../ui/Screen";
import { theme } from "../ui/theme";
import { usePullToRefresh } from "../lib/usePullToRefresh";

type FeedDetailRoute = RouteProp<RootStackParamList, "FeedDetail">;

type Article = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content_html?: string | null;
  cover_image?: string | null;
  published_at?: string | null;
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ArticleDetailScreen() {
  const route = useRoute<FeedDetailRoute>();
  const { refreshing, onRefresh } = usePullToRefresh();

  const query = useQuery<Article>({
    queryKey: ["article", route.params.slug],
    queryFn: async () => {
      const r = await api.get(`/articles/${route.params.slug}`);
      return r.data?.article;
    },
  });

  const article = query.data;
  const img = toPublicUrl(article?.cover_image);

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
        {query.isLoading ? (
          <Text style={{ color: theme.colors.muted }}>Loading…</Text>
        ) : null}
        {article ? (
          <Card style={{ gap: 12 }}>
            {img ? (
              <Image
                source={{ uri: img }}
                style={{
                  width: "100%",
                  height: 220,
                  borderRadius: theme.radius.md,
                  backgroundColor: "#0a0f0c",
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: 220,
                  borderRadius: theme.radius.md,
                  backgroundColor: "#0a0f0c",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              />
            )}
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 20,
                fontWeight: "900",
              }}
            >
              {article.title}
            </Text>
            {article.published_at ? (
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                {new Date(article.published_at).toLocaleString("id-ID")}
              </Text>
            ) : null}
            {article.excerpt ? (
              <Text style={{ color: theme.colors.muted }}>
                {article.excerpt}
              </Text>
            ) : null}
            {article.content_html ? (
              <Text style={{ color: theme.colors.text }}>
                {stripHtml(article.content_html)}
              </Text>
            ) : null}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
