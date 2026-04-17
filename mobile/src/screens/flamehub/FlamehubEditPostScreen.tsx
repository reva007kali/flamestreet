import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { api } from "../../lib/api";
import { RootStackParamList } from "../../navigation/types";
import Button from "../../ui/Button";
import Screen from "../../ui/Screen";
import TextField from "../../ui/TextField";
import { theme } from "../../ui/theme";

type EditRoute = RouteProp<RootStackParamList, "FlamehubEditPost">;

export default function FlamehubEditPostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<EditRoute>();
  const qc = useQueryClient();
  const postId = route.params.id;

  const postQuery = useQuery({
    queryKey: ["flamehub", "post", postId],
    queryFn: async () => (await api.get(`/flamehub/posts/${postId}`)).data?.post,
  });

  const [caption, setCaption] = useState("");

  useEffect(() => {
    const c = postQuery.data?.caption;
    if (typeof c === "string") setCaption(c);
  }, [postQuery.data?.caption]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = { caption: caption.trim() || null };
      return (await api.put(`/flamehub/posts/${postId}`, payload)).data?.post;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flamehub", "post", postId] });
      qc.invalidateQueries({ queryKey: ["flamehub", "feed"] });
      navigation.goBack();
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to update post";
      Alert.alert("Flamehub", String(msg));
    },
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
          Edit Post
        </Text>
        <TextField
          label="Caption"
          value={caption}
          onChangeText={setCaption}
          placeholder="Write something…"
          placeholderTextColor={theme.colors.muted}
          multiline
          style={{ minHeight: 120, textAlignVertical: "top" }}
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            variant="secondary"
            style={{ flex: 1, height: 48, borderRadius: 14 }}
            onPress={() => navigation.goBack()}
          >
            Cancel
          </Button>
          <Button
            style={{ flex: 1, height: 48, borderRadius: 14 }}
            onPress={() => save.mutate()}
            disabled={save.isPending || postQuery.isLoading}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

