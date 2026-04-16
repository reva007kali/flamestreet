import { useMutation } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../../lib/api";
import Button from "../../ui/Button";
import Screen from "../../ui/Screen";
import TextField from "../../ui/TextField";
import { theme } from "../../ui/theme";

type Picked = {
  uri: string;
  type: "image" | "video";
  mime: string;
  name: string;
};

function guessName(uri: string, fallbackExt: string) {
  const last = uri.split("/").pop() ?? "";
  if (last.includes(".")) return last;
  return `${Date.now()}.${fallbackExt}`;
}

export default function FlamehubCreatePostScreen() {
  const [caption, setCaption] = useState("");
  const [items, setItems] = useState<Picked[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!items.length) throw new Error("Media is required");
      const fd = new FormData();
      if (caption.trim()) fd.append("caption", caption.trim());
      items.forEach((m) => {
        fd.append("media[]", {
          uri: m.uri,
          name: m.name,
          type: m.mime,
        } as any);
      });
      const r = await api.post("/flamehub/posts", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return r.data?.post;
    },
    onSuccess: () => {
      Alert.alert("Flamehub", "Posted!");
      setCaption("");
      setItems([]);
    },
    onError: (e: any) => {
      Alert.alert(
        "Post failed",
        e?.response?.data?.message ?? e?.message ?? "Unknown error",
      );
    },
  });

  async function pickImages() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.7,
    });
    if (res.canceled) return;
    const assets = res.assets ?? [];
    const mapped: Picked[] = assets.slice(0, 10).map((a) => ({
      uri: a.uri,
      type: "image",
      mime: a.mimeType ?? "image/jpeg",
      name: guessName(a.uri, "jpg"),
    }));
    setItems(mapped);
  }

  async function pickVideo() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (res.canceled) return;
    const a = res.assets?.[0];
    if (!a?.uri) return;
    setItems([
      {
        uri: a.uri,
        type: "video",
        mime: a.mimeType ?? "video/mp4",
        name: guessName(a.uri, "mp4"),
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 4 }}>
          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12,
              fontWeight: "800",
            }}
          >
            Flamehub
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 24,
              fontWeight: "900",
            }}
          >
            New Post
          </Text>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <TextField
            label="Caption"
            value={caption}
            onChangeText={setCaption}
            placeholder="Tulis caption..."
            multiline
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              variant="secondary"
              onPress={() => {
                setItems([]);
                pickImages();
              }}
              style={{ flex: 1 }}
            >
              Pick Photos
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                setItems([]);
                pickVideo();
              }}
              style={{ flex: 1 }}
            >
              Pick Video
            </Button>
          </View>

          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
            Maks: 10 foto (quality 0.7) atau 1 video.
          </Text>

          {items.length ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                Preview
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {items.map((m, idx) => (
                    <View
                      key={`${m.uri}-${idx}`}
                      style={{
                        width: 180,
                        height: 180,
                        borderRadius: theme.radius.md,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        backgroundColor: "#0a0f0c",
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {m.type === "image" ? (
                        <Image
                          source={{ uri: m.uri }}
                          style={{ width: 180, height: 180 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text
                          style={{
                            color: theme.colors.muted,
                            fontWeight: "900",
                          }}
                        >
                          Video
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
              <Pressable
                onPress={() => setItems([])}
                style={{ alignSelf: "flex-start" }}
              >
                <Text style={{ color: theme.colors.danger, fontWeight: "900" }}>
                  Clear media
                </Text>
              </Pressable>
            </View>
          ) : null}

          <Button
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Posting…" : "Post"}
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}
