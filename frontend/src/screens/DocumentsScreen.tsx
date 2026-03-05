import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { deleteDocument, listCategories, listDocuments } from "@/api/documents";
import { CategoryChips } from "@/components/CategoryChips";
import { SwipeableDocumentCard } from "@/components/SwipeableDocumentCard";
import { colors, spacing, typography } from "@/theme/tokens";
import type { RootStackParamList, TabParamList } from "@/types/navigation";
import type { CategoryItem, DocumentListItem } from "@/api/types";
import { ALL_CATEGORY_KEY, applyCategoryFilter, FALLBACK_CATEGORY_KEY, type CategorySelection } from "@/utils/category";

const PAGE_SIZE = 20;
type DocsNavigation = NativeStackNavigationProp<RootStackParamList>;
type DocumentsPage = Awaited<ReturnType<typeof listDocuments>>;

function removeDocumentFromPages(data: InfiniteData<DocumentsPage> | undefined, targetId: number) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== targetId),
    })),
  };
}

export function DocumentsScreen() {
  const navigation = useNavigation<DocsNavigation>();
  const route = useRoute<RouteProp<TabParamList, "Documents">>();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<CategorySelection>(ALL_CATEGORY_KEY);
  const handledRefreshToken = useRef<number | null>(null);
  const openedSwipeableRef = useRef<(() => void) | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["documents"],
    queryFn: ({ pageParam }) => listDocuments(PAGE_SIZE, pageParam as number),
    initialPageParam: 0,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
    staleTime: Infinity,
  });

  useEffect(() => {
    const refreshToken = route.params?.refreshToken;
    if (!refreshToken || handledRefreshToken.current === refreshToken) return;
    handledRefreshToken.current = refreshToken;
    const delay = route.params?.refreshDelayMs ?? 1000;
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }, delay);
    return () => clearTimeout(timer);
  }, [queryClient, route.params?.refreshDelayMs, route.params?.refreshToken]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      }, 1000);
      return () => clearTimeout(timer);
    }, [queryClient]),
  );

  const deleteMutation = useMutation({
    mutationFn: (documentId: number) => deleteDocument(documentId),
    onMutate: async (documentId) => {
      await queryClient.cancelQueries({ queryKey: ["documents"] });
      const previous = queryClient.getQueryData<InfiniteData<DocumentsPage>>(["documents"]);
      queryClient.setQueryData<InfiniteData<DocumentsPage>>(["documents"], (current) =>
        removeDocumentFromPages(current, documentId),
      );
      return { previous };
    },
    onError: (error, _documentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["documents"], context.previous);
      }
      Alert.alert("삭제 실패", error instanceof Error ? error.message : "문서 삭제에 실패했습니다.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const allItems = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data?.pages],
  );
  const categoryOptions = useMemo<CategoryItem[]>(
    () => [
      { key: ALL_CATEGORY_KEY, label: "전체", order: -1 },
      ...(categoriesQuery.data?.items ?? [{ key: FALLBACK_CATEGORY_KEY, label: "기타", order: 9999 }]),
    ],
    [categoriesQuery.data?.items],
  );

  useEffect(() => {
    if (categoryOptions.some((item) => item.key === category)) {
      return;
    }
    setCategory(ALL_CATEGORY_KEY);
  }, [category, categoryOptions]);

  const filtered = useMemo(() => applyCategoryFilter(allItems, category), [allItems, category]);

  const handleSwipeableOpen = (close: () => void) => {
    if (openedSwipeableRef.current && openedSwipeableRef.current !== close) {
      openedSwipeableRef.current();
    }
    openedSwipeableRef.current = close;
  };

  const handleDelete = (item: DocumentListItem) => {
    if (deleteMutation.isPending) return;
    deleteMutation.mutate(item.id);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>내 문서</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={() => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            queryClient.invalidateQueries({ queryKey: ["categories"] });
          }}
        >
          <Text style={styles.refreshText}>↻</Text>
        </Pressable>
      </View>
      <Text style={styles.categoryLabel}>카테고리</Text>
      <CategoryChips options={categoryOptions} value={category} onChange={setCategory} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContainer, { paddingBottom: tabBarHeight + insets.bottom + 20 }]}
        renderItem={({ item }) => (
          <SwipeableDocumentCard
            item={item}
            onSwipeableOpen={handleSwipeableOpen}
            onDelete={() => handleDelete(item)}
            disabled={deleteMutation.isPending}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 14,
    gap: spacing.small,
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
  refreshText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  categoryLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: colors.textPrimary,
  },
  listContainer: {
    paddingTop: spacing.small,
    gap: spacing.medium,
  },
  empty: {
    paddingTop: spacing.large,
    textAlign: "center",
    color: colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
});
