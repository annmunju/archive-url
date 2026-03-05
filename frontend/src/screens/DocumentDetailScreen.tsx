import { useLayoutEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Share2 } from "lucide-react-native";
import { deleteDocument, getDocument } from "@/api/documents";
import { colors, radius, spacing, typography } from "@/theme/tokens";
import type { RootStackParamList } from "@/types/navigation";
import { fromNow } from "@/utils/time";

type Props = NativeStackScreenProps<RootStackParamList, "DocumentDetail">;

export function DocumentDetailScreen({ route, navigation }: Props) {
  const { documentId } = route.params;
  const queryClient = useQueryClient();
  const documentQuery = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => getDocument(documentId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigation.navigate("Tabs", { screen: "Documents" });
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable style={styles.circleButton} onPress={() => shareUrl(documentQuery.data?.document.url)}>
          <Share2 size={18} color={colors.textPrimary} />
        </Pressable>
      ),
    });
  }, [documentQuery.data?.document.url, navigation]);

  if (documentQuery.isLoading || !documentQuery.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>불러오는 중...</Text>
      </View>
    );
  }

  const doc = documentQuery.data.document;

  const onDelete = () => {
    Alert.alert("문서 삭제", "정말 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.actionRow}>
        <Pressable style={styles.actionButton} onPress={() => navigation.navigate("EditDocument", { documentId })}>
          <Text style={styles.actionText}>수정</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onDelete}>
          <Text style={styles.actionText}>삭제</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.link} onPress={() => openUrl(doc.url)}>
          {doc.url}
        </Text>
        <Text style={styles.meta}>{fromNow(doc.created_at)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>요약</Text>
        <Text style={styles.body}>{doc.summary}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>관련 링크</Text>
        <View style={styles.links}>
          {doc.links.map((link, index) => (
            <Pressable key={`${link.url}-${index}`} style={styles.linkCard} onPress={() => openUrl(link.url)}>
              <Text style={styles.link}>{link.url}</Text>
              <Text style={styles.linkDesc}>{link.content}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

async function openUrl(url?: string) {
  if (!url) return;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
}

async function shareUrl(url?: string) {
  if (!url) return;
  await Share.share({
    message: url,
    url,
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    gap: spacing.large,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    ...typography.body,
    color: colors.textSecondary,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.medium,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: colors.textPrimary,
  },
  section: {
    gap: spacing.small,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  link: {
    ...typography.body,
    color: colors.primary,
  },
  meta: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.sectionLabel,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 23,
    color: colors.textPrimary,
  },
  links: {
    gap: spacing.medium,
  },
  linkCard: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  linkDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
