import { ScrollView, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius } from "@/theme/tokens";
import type { CategorySelection } from "@/utils/category";
import type { CategoryItem } from "@/api/types";

type Props = {
  options: CategoryItem[];
  value: CategorySelection;
  onChange: (value: CategorySelection) => void;
};

export function CategoryChips({ options, value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {options.map((item) => {
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
    paddingVertical: 2,
  },
  chip: {
    minHeight: 34,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 6,
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
