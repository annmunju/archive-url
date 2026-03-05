import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DocumentListItem } from "@/api/types";
import { colors, radius, spacing } from "@/theme/tokens";
import { fromNow } from "@/utils/time";
import { cleanTitle, getListDescription } from "@/utils/text";

type Props = {
  item: DocumentListItem;
  onPress: () => void;
};

export function DocumentCard({ item, onPress }: Props) {
  const domain = safeDomain(item.url);
  const title = cleanTitle(item.title);
  const description = getListDescription(item);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, item.is_pinned && styles.pinnedCard, pressed && styles.pressed]}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {item.is_pinned ? <Text style={styles.pinBadge}>고정</Text> : null}
      </View>
      <Text style={styles.description} numberOfLines={3}>
        {description}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{domain}</Text>
        <Text style={styles.metaText}>•</Text>
        <Text style={styles.metaText}>{fromNow(item.created_at)}</Text>
      </View>
    </Pressable>
  );
}

function safeDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.medium,
    gap: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  pinnedCard: {
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.9,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: colors.textPrimary,
    flex: 1,
  },
  pinBadge: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    lineHeight: 16,
    color: colors.primary,
    backgroundColor: "#E8F2FF",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  metaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
  },
});
