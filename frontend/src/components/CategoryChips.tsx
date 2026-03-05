import { ScrollView, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius } from "@/theme/tokens";
import type { Category } from "@/utils/category";

type Props = {
  value: Category;
  onChange: (value: Category) => void;
};

const labels: { key: Category; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "tech", label: "기술" },
  { key: "design", label: "디자인" },
  { key: "business", label: "비즈니스" },
];

export function CategoryChips({ value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {labels.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.chip, active ? styles.activeChip : styles.inactiveChip]}
          >
            <Text style={[styles.label, active ? styles.activeText : styles.inactiveText]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  chip: {
    height: 32,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  activeChip: {
    backgroundColor: colors.primary,
  },
  inactiveChip: {
    backgroundColor: colors.border,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  activeText: {
    color: "#fff",
  },
  inactiveText: {
    color: colors.textPrimary,
  },
});
