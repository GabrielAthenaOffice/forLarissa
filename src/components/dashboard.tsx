import { useRouter, type Href } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { cardShadow, MaxContentWidth, Radii, Spacing } from "@/constants/theme";
import { useSession } from "@/context/auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

export type DashboardAction = {
  label: string;
  description: string;
  href?: Href;
  icon?: React.ReactNode;
};

export type DashboardStat = {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "success" | "warning";
  icon?: React.ReactNode;
};

type DashboardProps = {
  roleLabel: string;
  hero?: { label: string; value: string | number; caption?: string; icon?: React.ReactNode };
  stats?: DashboardStat[];
  actions: DashboardAction[];
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function Dashboard({ roleLabel, hero, stats, actions }: DashboardProps) {
  const { profile } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const scheme = useColorScheme();
  const shadow = cardShadow(scheme === "dark" ? "dark" : "light");
  const firstName = profile?.name?.split(" ")[0] ?? "bem-vindo";
  const initial = (profile?.name?.[0] ?? "?").toUpperCase();

  function onAction(action: DashboardAction) {
    if (action.href) router.push(action.href);
    else Alert.alert(action.label, "Disponível em breve.");
  }

  let step = 0;
  const next = () => FadeInDown.springify().damping(18).delay((step++) * 70);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.topAccent, { backgroundColor: theme.accent }]} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Cabeçalho */}
          <Animated.View entering={next()} style={styles.header}>
            <View style={styles.flex}>
              <ThemedText type="overline" themeColor="accent">
                {roleLabel}
              </ThemedText>
              <ThemedText type="display">
                {greeting()},{"\n"}
                {firstName}.
              </ThemedText>
            </View>
            <Pressable
              onPress={() => router.push("/profile")}
              style={[styles.avatar, { backgroundColor: theme.accentSoft }, shadow]}
              hitSlop={8}
            >
              <ThemedText type="smallBold" themeColor="accent">
                {initial}
              </ThemedText>
            </Pressable>
          </Animated.View>

          {/* Hero KPI */}
          {hero && (
            <Animated.View
              entering={next()}
              style={[styles.hero, { backgroundColor: theme.accent }, shadow]}
            >
              <View style={styles.rowBetween}>
                <ThemedText type="overline" style={{ color: theme.accentText, opacity: 0.85 }}>
                  {hero.label}
                </ThemedText>
                {hero.icon && hero.icon}
              </View>
              <ThemedText type="metric" style={[styles.heroValue, { color: theme.accentText }]}>
                {hero.value}
              </ThemedText>
              {hero.caption && (
                <ThemedText type="small" style={{ color: theme.accentText, opacity: 0.9 }}>
                  {hero.caption}
                </ThemedText>
              )}
            </Animated.View>
          )}

          {/* Grade de estatísticas */}
          {stats && stats.length > 0 && (
            <Animated.View entering={next()} style={styles.statGrid}>
              {stats.map((s) => (
                <View
                  key={s.label}
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    shadow,
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <ThemedText
                      type="metric"
                      themeColor={s.tone && s.tone !== "default" ? s.tone : "text"}
                      style={styles.statValue}
                    >
                      {s.value}
                    </ThemedText>
                    {s.icon && s.icon}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {s.label}
                  </ThemedText>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Atalhos */}
          <Animated.View entering={next()}>
            <ThemedText type="overline" themeColor="textSecondary" style={styles.sectionLabel}>
              Atalhos
            </ThemedText>
          </Animated.View>

          {actions.map((action) => (
            <Animated.View key={action.label} entering={next()}>
              <Pressable
                onPress={() => onAction(action)}
                style={({ pressed }) => [
                  styles.actionRow,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  shadow,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={[styles.actionDot, { backgroundColor: theme.accentSoft }]}>
                  {action.icon ? (
                    action.icon
                  ) : (
                    <View style={[styles.actionDotCore, { backgroundColor: theme.accent }]} />
                  )}
                </View>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{action.label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {action.description}
                  </ThemedText>
                </View>
                <ChevronRight size={20} stroke={theme.textSecondary} />
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  topAccent: { height: 4, width: "100%" },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  flex: { flex: 1, gap: Spacing.half },
  avatar: {
    height: 48,
    width: 48,
    borderRadius: Radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    borderRadius: Radii.lg,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  heroValue: { fontSize: 44, lineHeight: 46, marginTop: Spacing.one },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: "45%",
    minWidth: 140,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  statValue: { fontSize: 26, lineHeight: 28 },
  sectionLabel: { marginTop: Spacing.two },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.three,
  },
  actionDot: {
    height: 36,
    width: 36,
    borderRadius: Radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  actionDotCore: { height: 12, width: 12, borderRadius: Radii.pill },
});


