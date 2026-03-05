import { useMemo, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { RefreshCw } from "lucide-react-native";
import { listDocuments } from "@/api/documents";
import { CategoryChips } from "@/components/CategoryChips";
import { DocumentCard } from "@/components/DocumentCard";
import { colors, spacing, typography } from "@/theme/tokens";
import type { RootStackParamList } from "@/types/navigation";
import { applyCategoryFilter, type Category } from "@/utils/category";

const PAGE_SIZE = 20;
type DocsNavigation = NativeStackNavigationProp<RootStackParamList>;

export function DocumentsScreen() {
  const navigation = useNavigation<DocsNavigation>();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<Category>("all");

  const query = useInfiniteQuery({
    queryKey: ["documents"],
    queryFn: ({ pageParam }) => listDocuments(PAGE_SIZE, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
  });

  const allItems = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data?.pages],
  );
  const filtered = useMemo(() => applyCategoryFilter(allItems, category), [allItems, category]);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>내 문서</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={() => queryClient.invalidateQueries({ queryKey: ["documents"] })}
        >
          <RefreshCw size={20} color={colors.textPrimary} />
        </Pressable>
      </View>
      <Text style={styles.categoryLabel}>카테고리</Text>
      <CategoryChips value={category} onChange={setCategory} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <DocumentCard
            item={item}
            onPress={() => navigation.navigate("DocumentDetail", { documentId: item.id })}
          />
        )}
        onEndReached={() => query.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>문서가 없습니다.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: spacing.medium,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: colors.textPrimary,
  },
  listContainer: {
    gap: spacing.medium,
    paddingBottom: 120,
  },
  empty: {
    paddingTop: spacing.large,
    textAlign: "center",
    color: colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
});
