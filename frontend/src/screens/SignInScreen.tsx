import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/auth/context";
import { colors, radius, spacing, typography } from "@/theme/tokens";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export function SignInScreen() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      Alert.alert("이메일 확인", "유효한 이메일 주소를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(trimmed);
      setSubmitted(true);
    } catch (error) {
      Alert.alert("로그인 링크 전송 실패", error instanceof Error ? error.message : "다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>ArchiveURL</Text>
        <Text style={styles.title}>로그인 링크를 보내드릴게요.</Text>
        <Text style={styles.body}>
          이메일로 받은 링크를 탭하면 앱으로 돌아와 자동 로그인됩니다.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>이메일</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.textSecondary}
        />
        <PrimaryButton label="로그인 링크 보내기" onPress={onSubmit} disabled={loading} loading={loading} />
        {submitted ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>이메일을 확인해 주세요.</Text>
            <Text style={styles.noticeBody}>{email.trim()} 로 로그인 링크를 보냈습니다.</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 36,
    gap: 28,
  },
  hero: {
    gap: 10,
  },
  eyebrow: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.primary,
  },
  title: {
    fontFamily: "System",
    fontWeight: "800",
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: "System",
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.large,
    gap: 14,
  },
  label: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 13,
    color: colors.textSecondary,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    fontFamily: "System",
    fontSize: 16,
    color: colors.textPrimary,
  },
  notice: {
    backgroundColor: "#F3F8F3",
    borderRadius: radius.lg,
    padding: 14,
    gap: 4,
  },
  noticeTitle: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 14,
    color: colors.textPrimary,
  },
  noticeBody: {
    fontFamily: "System",
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
