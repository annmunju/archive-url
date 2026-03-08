import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/auth/context";
import { colors, radius, spacing, typography } from "@/theme/tokens";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export function SignInScreen() {
  const { signInWithPassword, signUpWithPassword, pendingSignup, clearPendingSignup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [submittedMode, setSubmittedMode] = useState<"signin" | "signup" | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignIn = mode === "signin";

  useEffect(() => {
    if (pendingSignup?.status !== "confirmed") {
      return;
    }
    setMode("signin");
    setEmail(pendingSignup.email);
    setPassword("");
    setPasswordConfirm("");
    setSubmittedMode(null);
  }, [pendingSignup]);

  const onSubmit = async (mode: "signin" | "signup") => {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      Alert.alert("이메일 확인", "유효한 이메일 주소를 입력해 주세요.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("비밀번호 확인", "비밀번호는 8자 이상 입력해 주세요.");
      return;
    }
    if (mode === "signup" && password !== passwordConfirm) {
      Alert.alert("비밀번호 확인", "비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithPassword(trimmed, password);
      } else {
        await signUpWithPassword(trimmed, password);
      }
      setSubmittedMode(mode);
    } catch (error) {
      Alert.alert(
        mode === "signin" ? "로그인 실패" : "회원가입 실패",
        error instanceof Error ? error.message : "다시 시도해 주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>ArchiveURL</Text>
        <Text style={styles.title}>{isSignIn ? "로그인" : "회원가입"}</Text>
        <Text style={styles.body}>
          {isSignIn
            ? "이메일과 비밀번호로 바로 로그인합니다."
            : "이메일과 비밀번호로 계정을 만들고, 확인 메일로 계정을 활성화합니다."}
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
        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          textContentType={isSignIn ? "password" : "newPassword"}
          style={styles.input}
          placeholder={isSignIn ? "비밀번호" : "8자 이상 비밀번호"}
          placeholderTextColor={colors.textSecondary}
        />
        {!isSignIn ? (
          <>
            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              textContentType="newPassword"
              style={styles.input}
              placeholder="비밀번호 다시 입력"
              placeholderTextColor={colors.textSecondary}
            />
          </>
        ) : null}
        <PrimaryButton
          label={isSignIn ? "로그인" : "회원가입"}
          onPress={() => onSubmit(mode)}
          disabled={loading}
          loading={loading}
        />
        {pendingSignup?.status === "requested" && !isSignIn ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>이메일 확인이 필요합니다.</Text>
            <Text style={styles.noticeBody}>
              {pendingSignup.email} 로 보낸 확인 메일에서 계정 활성화를 완료해 주세요.
            </Text>
          </View>
        ) : null}
        {pendingSignup?.status === "confirmed" ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>계정 확인이 끝났습니다.</Text>
            <Text style={styles.noticeBody}>
              {pendingSignup.email} 계정을 확인했습니다. 이제 같은 이메일과 비밀번호로 로그인하세요.
            </Text>
          </View>
        ) : null}
        {submittedMode && !(submittedMode === "signup" && pendingSignup) && pendingSignup?.status !== "confirmed" ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>
              {submittedMode === "signin" ? "로그인 중입니다." : "회원가입 메일을 확인해 주세요."}
            </Text>
            <Text style={styles.noticeBody}>
              {submittedMode === "signin"
                ? `${email.trim()} 계정으로 로그인을 시도했습니다.`
                : `${email.trim()} 로 회원가입 확인 메일을 보냈습니다.`}
            </Text>
          </View>
        ) : null}
        <View style={styles.footerSwitch}>
          <Text style={styles.footerSwitchText}>
            {isSignIn ? "처음 오셨나요?" : "이미 계정이 있나요?"}
          </Text>
          <Pressable
            onPress={() => {
              setMode(isSignIn ? "signup" : "signin");
              setSubmittedMode(null);
              setPassword("");
              setPasswordConfirm("");
              if (isSignIn) {
                void clearPendingSignup();
              }
            }}
          >
            <Text style={styles.footerSwitchAction}>{isSignIn ? "회원가입하기" : "로그인하기"}</Text>
          </Pressable>
        </View>
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
  footerSwitch: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  footerSwitchText: {
    fontFamily: "System",
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerSwitchAction: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 14,
    color: colors.primary,
  },
});
