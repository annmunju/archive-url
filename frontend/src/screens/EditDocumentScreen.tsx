import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Plus, X } from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getDocument, patchDocument } from "@/api/documents";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, radius, spacing } from "@/theme/tokens";
import type { RootStackParamList } from "@/types/navigation";
import type { ExtractedLink } from "@/api/types";

type Props = NativeStackScreenProps<RootStackParamList, "EditDocument">;

export function EditDocumentScreen({ route, navigation }: Props) {
  const { documentId } = route.params;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<ExtractedLink[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newContent, setNewContent] = useState("");

  useEffect(() => {
    if (!query.data) return;
    setTitle(query.data.document.title);
    setDescription(query.data.document.description);
    setLinks(query.data.document.links);
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      patchDocument(documentId, {
        title: title.trim(),
        description: description.trim(),
        links,
      }),
    onSuccess: ({ document }) => {
      queryClient.setQueryData(["document", documentId], { document });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigation.goBack();
    },
  });

  const canAddLink = useMemo(() => {
    if (!newUrl || !newContent) return false;
    try {
      const url = new URL(newUrl);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, [newContent, newUrl]);

  const canSave = title.trim().length > 0 && description.trim().length > 0;

  const addLink = () => {
    if (!canAddLink) return;
    setLinks((prev) => [...prev, { url: newUrl.trim(), content: newContent.trim() }]);
    setNewUrl("");
    setNewContent("");
  };

  if (query.isLoading || !query.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>취소</Text>
        </Pressable>
        <Pressable onPress={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
          <Text style={styles.saveText}>저장</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>제목</Text>
        <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="문서 제목" />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>설명</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.multiInput]}
          multiline
          placeholder="문서 설명"
        />
      </View>

      <PrimaryButton label="저장" onPress={() => saveMutation.mutate()} disabled={!canSave} loading={saveMutation.isPending} />

      <View style={styles.section}>
        <View style={styles.linkHeader}>
          <Text style={styles.label}>관련 링크</Text>
          <Pressable style={styles.addButton} onPress={addLink} disabled={!canAddLink}>
            <Plus size={16} color={colors.primary} />
            <Text style={styles.addText}>추가</Text>
          </Pressable>
        </View>
        <TextInput value={newUrl} onChangeText={setNewUrl} style={styles.input} placeholder="https://example.com" />
        <TextInput value={newContent} onChangeText={setNewContent} style={styles.input} placeholder="링크 설명" />

        <View style={styles.linkList}>
          {links.map((link, index) => (
            <View key={`${link.url}-${index}`} style={styles.linkItem}>
              <View style={styles.linkTextWrap}>
                <Text style={styles.linkUrl}>{link.url}</Text>
                <Text style={styles.linkContent}>{link.content}</Text>
              </View>
              <Pressable
                style={styles.removeButton}
                onPress={() => setLinks((prev) => prev.filter((_, idx) => idx !== index))}
              >
                <X size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    gap: spacing.large,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: colors.textSecondary,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancelText: {
    fontFamily: "Inter_400Regular",
    fontSize: 17,
    color: colors.textPrimary,
  },
  saveText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: colors.primary,
  },
  section: {
    gap: spacing.small,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: colors.textPrimary,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: colors.textPrimary,
  },
  multiInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  linkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addText: {
    fontFamily: "Inter_600SemiBold",
    color: colors.primary,
  },
  linkList: {
    gap: 12,
  },
  linkItem: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  linkTextWrap: {
    flex: 1,
    gap: 4,
  },
  linkUrl: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: colors.primary,
  },
  linkContent: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
