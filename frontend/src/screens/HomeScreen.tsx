import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { createIngestJob } from "@/api/ingest";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { RootStackParamList } from "@/types/navigation";
import { colors, radius, spacing, typography } from "@/theme/tokens";

type HomeNavigation = NativeStackNavigationProp<RootStackParamList>;

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const valid = isValidUrl(url);

  const mutation = useMutation({
    mutationFn: (rawUrl: string) => createIngestJob(rawUrl),
    onSuccess: ({ job }) => {
      navigation.navigate("Processing", {
        jobId: job.id,
        normalizedUrl: job.normalized_url,
      });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const onSubmit = () => {
    if (!valid) {
      setError("유효한 URL을 입력해 주세요.");
      return;
    }
    setError("");
    mutation.mutate(url);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Snap URL</Text>
      <View style={[styles.inputCard, !!error && styles.errorBorder]}>
        <TextInput
          placeholder="https://example.com"
          value={url}
          onChangeText={setUrl}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <PrimaryButton label="수집 시작" onPress={onSubmit} disabled={!valid} loading={mutation.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: spacing.medium,
  },
  title: {
    ...typography.appTitle,
    color: colors.textPrimary,
  },
  inputCard: {
    height: 157,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    color: colors.error,
    fontSize: 13,
  },
});
