import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DocumentListItem } from "@/api/types";
import { colors, radius, spacing } from "@/theme/tokens";
import { fromNow } from "@/utils/time";

type Props = {
  item: DocumentListItem;
  onPress: () => void;
};

export function DocumentCard({ item, onPress }: Props) {
  const domain = safeDomain(item.url);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.description} numberOfLines={3}>
        {item.description || item.summary}
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
  },
  pressed: {
    opacity: 0.9,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: colors.textPrimary,
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
