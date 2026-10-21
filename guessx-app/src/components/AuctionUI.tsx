import React, { Children } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Signal,
  Wifi,
  BatteryFull,
  Gavel,
  Trophy,
  Zap,
} from "lucide-react-native";
import Svg, {
  Circle,
  Path,
  LinearGradient as SvgGradient,
  Stop,
  Defs,
} from "react-native-svg";
import { colors, borderRadius, fontSize, spacing } from "../theme";

// ─── Awash Bank Brand Mark ──────────────────────────────────────────

export function AwashMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <SvgGradient id="awashBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#002B5C" />
          <Stop offset="100%" stopColor="#001F3F" />
        </SvgGradient>
      </Defs>
      <Circle cx="24" cy="24" r="23" fill="url(#awashBlueGrad)" />
      <Path
        d="M9 27c4-6 9-9 15-9s11 3 15 9"
        fill="none"
        stroke="#C8A642"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <Path
        d="M12 20c3.5-4.5 7.5-6.8 12-6.8S32.5 15.5 36 20"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.9"
      />
      <Circle cx="24" cy="30.5" r="3.2" fill="#C8A642" />
    </Svg>
  );
}

export function AwashLogo({
  variant = "light",
  size = 32,
}: {
  variant?: "light" | "dark";
  size?: number;
}) {
  const topColor =
    variant === "light" ? colors.awashBlueForeground : colors.awashBlue;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <AwashMark size={size} />
      <View>
        <Text
          style={{
            fontFamily: "System",
            fontWeight: "800",
            fontSize: 18,
            letterSpacing: -0.5,
            color: topColor,
          }}
        >
          Guess X
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 0.5,
            color: colors.primary,
          }}
        >
          Auctions
        </Text>
      </View>
    </View>
  );
}

export const GuessXMark = AwashMark;
export const GuessXLogo = AwashLogo;

// ─── Buttons ─────────────────────────────────────────────────────────

export function CTAButton({
  children,
  variant = "primary",
  onPress,
  disabled,
  style,
}: {
  children: React.ReactNode;
  variant?: "primary" | "navy" | "orange" | "outline";
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  if (variant === "primary") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={style}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={["#C8A642", "#D4B85E", "#C8A642"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            s.ctaBase,
            {
              opacity: disabled ? 0.5 : 1,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
            }}
          >
            {Children.map(children, (child) =>
              typeof child === "string" || typeof child === "number" ? (
                <Text style={[s.ctaText, { color: colors.primaryForeground }]}>
                  {child}
                </Text>
              ) : (
                child
              ),
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  if (variant === "navy") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={style}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={["#002B5C", "#003D7A", "#002B5C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            s.ctaBase,
            {
              opacity: disabled ? 0.5 : 1,
              shadowColor: colors.awashBlue,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
            }}
          >
            {Children.map(children, (child) =>
              typeof child === "string" || typeof child === "number" ? (
                <Text style={[s.ctaText, { color: "#FFFFFF" }]}>{child}</Text>
              ) : (
                child
              ),
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  if (variant === "orange") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={style}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={["#F59E0B", "#EA580C", "#F59E0B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            s.ctaBase,
            {
              opacity: disabled ? 0.5 : 1,
              shadowColor: "#EA580C",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
            }}
          >
            {Children.map(children, (child) =>
              typeof child === "string" || typeof child === "number" ? (
                <Text style={[s.ctaText, { color: "#FFFFFF" }]}>{child}</Text>
              ) : (
                child
              ),
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        s.ctaBase,
        {
          backgroundColor: "rgba(255,255,255,0.8)",
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.85}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          justifyContent: "center",
        }}
      >
        {Children.map(children, (child) =>
          typeof child === "string" || typeof child === "number" ? (
            <Text style={[s.ctaText, { color: colors.foreground }]}>
              {child}
            </Text>
          ) : (
            child
          ),
        )}
      </View>
    </TouchableOpacity>
  );
}

export function GoldButton({
  children,
  onPress,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={style}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={["#C8A642", "#D4B85E", "#C8A642"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          s.ctaBase,
          {
            opacity: disabled ? 0.5 : 1,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            justifyContent: "center",
          }}
        >
          {Children.map(children, (child) =>
            typeof child === "string" || typeof child === "number" ? (
              <Text style={[s.ctaText, { color: colors.primaryForeground }]}>
                {child}
              </Text>
            ) : (
              child
            ),
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function NavyButton({
  children,
  onPress,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={style}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={["#002B5C", "#003D7A", "#002B5C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          s.ctaBase,
          {
            opacity: disabled ? 0.5 : 1,
            shadowColor: colors.awashBlue,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 6,
          },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            justifyContent: "center",
          }}
        >
          {Children.map(children, (child) =>
            typeof child === "string" || typeof child === "number" ? (
              <Text style={[s.ctaText, { color: "#FFFFFF" }]}>{child}</Text>
            ) : (
              child
            ),
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Card ────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.glassCard, style]}>{children}</View>;
}

export function GoldCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        s.glassCard,
        {
          borderColor: colors.primary + "4D",
          backgroundColor: colors.accent + "CC",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Phone Status Bar ───────────────────────────────────────────────

export function PhoneStatusBar({ dark = false }: { dark?: boolean }) {
  return <StatusBar barStyle={dark ? "light-content" : "dark-content"} />;
}

// ─── App Bar ─────────────────────────────────────────────────────────

export function AppBar({
  title,
  onBack,
  right,
  variant = "navy",
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  variant?: "navy" | "light" | "gold";
}) {
  const insets = useSafeAreaInsets();
  const txtStyles = {
    navy: "#FFFFFF",
    gold: colors.primaryForeground,
    light: colors.foreground,
  };
  const txt = txtStyles[variant];
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === "android"
        ? (StatusBar.currentHeight || 24)
        : Platform.OS === "ios"
          ? 44
          : 0;

  return (
    <View
      style={[
        s.appBarOuter,
        {
          paddingTop: topInset,
          backgroundColor:
            variant === "navy"
              ? "#002B5C"
              : variant === "gold"
                ? colors.primary
                : "#FFFFFF",
        },
      ]}
    >
      <StatusBar
        barStyle={variant === "navy" ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      {variant === "navy" && (
        <LinearGradient
          colors={["#002B5C", "#003D7A", "#002B5C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View
        style={[
          s.appBarInner,
          {
            backgroundColor:
              variant === "light" ? "rgba(255,255,255,0.95)" : "transparent",
            borderBottomWidth: variant === "light" ? 1 : 0,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={s.appBarSideSlot}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={s.appBarBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeft size={22} color={txt} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={s.appBarTitleContainer}>
          <Text
            style={[s.appBarTitle, { color: txt }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
        </View>
        <View style={s.appBarSideSlotRight}>{right}</View>
      </View>
    </View>
  );
}

// ─── Stats ───────────────────────────────────────────────────────────

export function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={{ flexDirection: "column" }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: 1,
          color: colors.mutedForeground,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: "System",
          fontWeight: "800",
          fontSize: 16,
          color: accent ? colors.primary : colors.foreground,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────

export function Badge({
  children,
  tone = "gold",
  style,
}: {
  children: React.ReactNode;
  tone?: "gold" | "navy" | "green" | "muted" | "blue" | "orange";
  style?: ViewStyle;
}) {
  const bgMap: Record<string, string> = {
    orange: "#FFF0E6CC",
    gold: colors.accent + "CC",
    navy: colors.awashBlue + "18",
    green: colors.emerald100 + "CC",
    muted: colors.muted + "CC",
    blue: colors.awashBlue + "E0",
  };
  const txtMap: Record<string, string> = {
    orange: "#C2410C",
    gold: colors.accentForeground,
    navy: colors.awashBlue,
    green: colors.emerald700,
    muted: colors.mutedForeground,
    blue: "#FFFFFF",
  };
  return (
    <View style={[s.badge, { backgroundColor: bgMap[tone] }, style]}>
      <Text style={[s.badgeText, { color: txtMap[tone] }]}>{children}</Text>
    </View>
  );
}

export function BadgeGold({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[s.badgeGold, style]}>
      <Text
        style={[
          s.badgeText,
          { color: colors.accentForeground, fontWeight: "700" },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

// ─── Countdown Pill ──────────────────────────────────────────────────

export function CountdownPill({
  time,
  urgent,
}: {
  time: { d: string; h: string; m: string; s: string };
  urgent: boolean;
}) {
  return (
    <View
      style={[
        s.timePill,
        {
          backgroundColor: urgent
            ? colors.primary + "25"
            : colors.awashBlue + "CC",
          borderWidth: 1,
          borderColor: urgent
            ? colors.primary + "40"
            : "rgba(255,255,255,0.15)",
        },
      ]}
    >
      <Text
        style={[s.timePillText, { color: urgent ? colors.primary : "#FFFFFF" }]}
      >
        {time.d !== "00" ? `${parseInt(time.d)}d ` : ""}
        {time.h}:{time.m}:{time.s}
      </Text>
    </View>
  );
}

// ─── Savings Badge ───────────────────────────────────────────────────

export function SavingsBadge({ percent }: { percent: number }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        borderRadius: 20,
        backgroundColor: colors.emerald50 + "CC",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: colors.emerald100,
      }}
    >
      <Zap size={10} color={colors.emerald600} />
      <Text
        style={{ fontSize: 10, fontWeight: "700", color: colors.emerald600 }}
      >
        {percent}% off
      </Text>
    </View>
  );
}

// ─── Section Header ──────────────────────────────────────────────────

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  gold,
}: {
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  subtitle?: string;
  gold?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      }}
    >
      {Icon && (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: gold
              ? colors.primary + "18"
              : colors.awashBlue + "18",
            borderWidth: 1,
            borderColor: gold ? colors.primary + "30" : colors.awashBlue + "25",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Icon size={18} color={gold ? colors.primary : colors.awashBlue} />
        </View>
      )}
      <View>
        <Text
          style={{
            fontFamily: "System",
            fontWeight: "800",
            fontSize: 18,
            letterSpacing: -0.3,
            color: gold ? colors.primary : colors.foreground,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: colors.mutedForeground,
              marginTop: 1,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Winner Badge ────────────────────────────────────────────────────

export function WinnerBadge({
  name,
  amount,
}: {
  name: string;
  amount: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: 20,
        backgroundColor: colors.primary + "18",
        borderWidth: 1,
        borderColor: colors.primary + "33",
        paddingHorizontal: 16,
        paddingVertical: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }}
    >
      <Trophy size={14} color={colors.primary} />
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: colors.accentForeground,
        }}
      >
        {name}
      </Text>
      <Text style={{ fontSize: 14, color: colors.mutedForeground }}>·</Text>
      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
        {amount}
      </Text>
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────

export function Divider({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{ height: 1, backgroundColor: colors.border }, style]} />
  );
}

// ─── Tab Item ────────────────────────────────────────────────────────

export function TabItem({
  icon: Icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={s.tabItem} activeOpacity={0.7}>
      <Icon size={22} color={active ? colors.primary : colors.neutralGray400} />
      <Text
        style={[
          s.tabItemLabel,
          {
            color: active ? colors.primary : colors.neutralGray400,
            fontWeight: active ? "700" : "500",
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Bottom Tab Bar ──────────────────────────────────────────────────

export function BottomTabBar({
  items,
  activeTab,
  onTabChange,
}: {
  items: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
  }>;
  activeTab?: string;
  onTabChange?: (id: string) => void;
}) {
  return (
    <View style={s.bottomTabBar}>
      {items.map((item) => (
        <TabItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          active={item.id === activeTab}
          onPress={() => onTabChange?.(item.id)}
        />
      ))}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const s = StyleSheet.create({
  ctaBase: {
    height: 48,
    borderRadius: borderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    overflow: "hidden",
  },
  ctaText: {
    fontSize: fontSize.md,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  glassCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border + "99",
    backgroundColor: "rgba(255,255,255,0.85)",
    shadowColor: colors.awashBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  statusTime: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  appBarOuter: {
    zIndex: 100,
    elevation: 4,
    overflow: "hidden",
  },
  appBarInner: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  appBarSideSlot: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  appBarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  appBarTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  appBarTitle: {
    textAlign: "center",
    fontFamily: "System",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  appBarSideSlotRight: {
    minWidth: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeGold: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.primary + "18",
    borderWidth: 1,
    borderColor: colors.primary + "33",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timePillText: {
    fontSize: 10,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  bottomTabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderTopWidth: 1,
    borderTopColor: colors.border + "80",
    paddingBottom: 20,
    paddingTop: 6,
    shadowColor: colors.awashBlue,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabItemLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
