import { useMutation } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
      Alert.alert("Flamehub", "Post successfully shared!");
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

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Screen headerShown={false} allowUnderHeader>
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          gap: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View>
          <Text style={{ color: theme.colors.green, fontSize: 13, fontWeight: "800", textTransform: 'uppercase', letterSpacing: 1 }}>
            Flamehub
          </Text>
          <Text style={{ color: "#fff", fontSize: 32, fontWeight: "900", letterSpacing: -1 }}>
            Create Post
          </Text>
        </View>

        <View style={{ gap: 20 }}>
          {/* CAPTION AREA */}
          <TextField
            label="What's on your mind?"
            value={caption}
            onChangeText={setCaption}
            placeholder="Share your progress or healthy tips..."
            multiline
            style={{ minHeight: 120, fontSize: 16, textAlignVertical: 'top' }}
          />

          {/* MEDIA PICKERS */}
          <View style={{ gap: 12 }}>
            <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '700' }}>ATTACH MEDIA</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable 
                onPress={pickImages} 
                style={{ flex: 1, backgroundColor: '#151515', borderRadius: 20, padding: 20, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <Ionicons name="images" size={28} color={theme.colors.green} />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12, marginTop: 8 }}>Photos</Text>
              </Pressable>
              
              <Pressable 
                onPress={pickVideo} 
                style={{ flex: 1, backgroundColor: '#151515', borderRadius: 20, padding: 20, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <Ionicons name="videocam" size={28} color="#a78bfa" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12, marginTop: 8 }}>Video</Text>
              </Pressable>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center' }}>
              Max: 10 photos or 1 video clip
            </Text>
          </View>

          {/* PREVIEW AREA */}
          {items.length ? (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
                  Preview ({items.length}/10)
                </Text>
                <Pressable onPress={() => setItems([])}>
                  <Text style={{ color: theme.colors.danger, fontSize: 12, fontWeight: '700' }}>Remove All</Text>
                </Pressable>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 14 }}>
                  {items.map((m, idx) => (
                    <View
                      key={`${m.uri}-${idx}`}
                      style={{
                        width: 200,
                        height: 200,
                        borderRadius: 24,
                        backgroundColor: "#111",
                        overflow: "hidden",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.05)",
                      }}
                    >
                      {m.type === "image" ? (
                        <Image source={{ uri: m.uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="play-circle" size={48} color={theme.colors.green} />
                          <Text style={{ color: theme.colors.muted, fontWeight: "800", fontSize: 12, marginTop: 4 }}>Video Clip</Text>
                        </View>
                      )}
                      
                      {/* Delete Button */}
                      <Pressable 
                        onPress={() => removeItem(idx)}
                        style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}

          {/* SUBMIT BUTTON */}
          <Button
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending || items.length === 0}
            style={{ height: 56, borderRadius: 18, marginTop: 20 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
               <Text style={{ color: "#000", fontWeight: "900", fontSize: 16 }}>
                {mutation.isPending ? "Sharing Post..." : "Share to Flamehub"}
              </Text>
              {!mutation.isPending && <Ionicons name="paper-plane" size={18} color="#000" />}
            </View>
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}