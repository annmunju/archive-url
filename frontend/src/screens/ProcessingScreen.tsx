import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { createIngestJob, getIngestJob } from "@/api/ingest";
import { PrimaryButton } from "@/components/PrimaryButton";
import { colors, spacing, typography } from "@/theme/tokens";
import type { RootStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Processing">;

function intervalByAttempt(attempt: number) {
  if (attempt <= 5) return 1000;
  if (attempt <= 15) return 2000;
  return 3000;
}

export function ProcessingScreen({ route, navigation }: Props) {
  const [pollAttempt, setPollAttempt] = useState(0);
  const { jobId, normalizedUrl } = route.params;

  const polling = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      setPollAttempt((prev) => prev + 1);
      return getIngestJob(jobId);
    },
    refetchInterval: (query) => {
      const status = query.state.data?.job.status;
      if (status === "succeeded" || status === "failed") {
        return false;
      }
      if (pollAttempt > 25) {
        return false;
      }
      return intervalByAttempt(pollAttempt);
    },
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!normalizedUrl) {
        throw new Error("재시도할 URL이 없습니다.");
      }
      return createIngestJob(normalizedUrl);
    },
    onSuccess: ({ job }) => {
      navigation.replace("Processing", {
        jobId: job.id,
        normalizedUrl: job.normalized_url,
      });
    },
  });

  useEffect(() => {
    if (polling.data?.job.status === "succeeded" && polling.data.job.document_id) {
      navigation.replace("DocumentDetail", { documentId: polling.data.job.document_id });
    }
  }, [navigation, polling.data?.job.document_id, polling.data?.job.status]);

  const ui = useMemo(() => {
    if (polling.isLoading) {
      return { title: "대기 중...", color: colors.textPrimary };
    }
    if (polling.isError) {
      return { title: "네트워크 오류가 발생했습니다.", color: colors.error };
    }
    const status = polling.data?.job.status;
    if (status === "queued") return { title: "대기 중...", color: colors.textPrimary };
    if (status === "running") return { title: "처리 중...", color: colors.textPrimary };
    if (status === "succeeded") return { title: "완료! 문서를 여는 중입니다.", color: colors.success };
    return {
      title: polling.data?.job.error_message ?? "실패했습니다.",
      color: colors.error,
    };
  }, [polling.data?.job.error_message, polling.data?.job.status, polling.isError, polling.isLoading]);

  const failed = polling.data?.job.status === "failed";

  return (
    <View style={styles.screen}>
      <Text style={styles.url}>{normalizedUrl ?? "URL 정보 없음"}</Text>
      <ActivityIndicator size="large" color={failed ? colors.error : colors.primary} />
      <Text style={[styles.statusText, { color: ui.color }]}>{ui.title}</Text>
      {failed ? (
        <PrimaryButton
          label="재시도"
          onPress={() => retryMutation.mutate()}
          loading={retryMutation.isPending}
          disabled={!normalizedUrl}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.large,
    paddingHorizontal: 24,
  },
  url: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  statusText: {
    ...typography.sectionLabel,
    textAlign: "center",
  },
});
