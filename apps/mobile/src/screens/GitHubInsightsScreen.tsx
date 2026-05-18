import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import type { GitHubInsights, GitHubRepo, GitHubLanguageStat } from '@devcard/shared';

// ─── Language color map (subset of github-linguist) ───

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178C6',
  JavaScript: '#F7DF1E',
  Python: '#3572A5',
  Rust: '#DEA584',
  Go: '#00ADD8',
  Java: '#B07219',
  'C++': '#F34B7D',
  C: '#555555',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  PHP: '#4F5D95',
  'C#': '#178600',
  HTML: '#E34C26',
  CSS: '#563D7C',
  Shell: '#89E051',
  Vue: '#41B883',
  Svelte: '#FF3E00',
};

function getLangColor(lang: string): string {
  return LANGUAGE_COLORS[lang] ?? COLORS.primary;
}

// ─── Sub-components ───

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.statCard}>
      <Icon name={icon} size={22} color={COLORS.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LanguageBar({ stats }: { stats: GitHubLanguageStat[] }) {
  const top = stats.slice(0, 6);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Language Breakdown</Text>
      {/* Stacked bar */}
      <View style={styles.langBar}>
        {top.map((s) => (
          <View
            key={s.language}
            style={[
              styles.langBarSegment,
              { width: `${s.percentage}%`, backgroundColor: getLangColor(s.language) },
            ]}
          />
        ))}
      </View>
      {/* Legend */}
      <View style={styles.langLegend}>
        {top.map((s) => (
          <View key={s.language} style={styles.langLegendItem}>
            <View
              style={[styles.langDot, { backgroundColor: getLangColor(s.language) }]}
            />
            <Text style={styles.langName}>{s.language}</Text>
            <Text style={styles.langPct}>{s.percentage}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <TouchableOpacity
      style={styles.repoCard}
      onPress={() => Linking.openURL(repo.url)}
      activeOpacity={0.8}
      accessibilityRole="link"
      accessibilityLabel={`Open ${repo.name} on GitHub`}>
      <View style={styles.repoHeader}>
        <Icon name="source-repository" size={16} color={COLORS.primary} />
        <Text style={styles.repoName} numberOfLines={1}>
          {repo.name}
        </Text>
      </View>
      {repo.description ? (
        <Text style={styles.repoDesc} numberOfLines={2}>
          {repo.description}
        </Text>
      ) : null}
      <View style={styles.repoMeta}>
        {repo.language ? (
          <View style={styles.repoLang}>
            <View
              style={[styles.langDot, { backgroundColor: getLangColor(repo.language) }]}
            />
            <Text style={styles.repoMetaText}>{repo.language}</Text>
          </View>
        ) : null}
        <View style={styles.repoStat}>
          <Icon name="star-outline" size={14} color={COLORS.warning} />
          <Text style={styles.repoMetaText}>{repo.stars}</Text>
        </View>
        <View style={styles.repoStat}>
          <Icon name="source-fork" size={14} color={COLORS.textMuted} />
          <Text style={styles.repoMetaText}>{repo.forks}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AiSummaryCard({ summary }: { summary: string }) {
  return (
    <View style={styles.aiCard}>
      <View style={styles.aiHeader}>
        <Icon name="robot-outline" size={18} color={COLORS.accent} />
        <Text style={styles.aiTitle}>AI Developer Summary</Text>
      </View>
      <Text style={styles.aiText}>{summary}</Text>
    </View>
  );
}

// ─── Main Screen ───

export default function GitHubInsightsScreen() {
  const { token } = useAuth();
  const [insights, setInsights] = useState<GitHubInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresConnect, setRequiresConnect] = useState(false);

  const fetchInsights = useCallback(
    async (forceRefresh = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      setError(null);
      try {
        const url = `${API_BASE_URL}/api/analytics/github-insights${forceRefresh ? '?refresh=true' : ''}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Read the body once — it can only be consumed once per response
        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 400 && body.requiresAuth) {
            setRequiresConnect(true);
            return;
          }
          setError(body.message ?? 'Failed to load GitHub insights');
          return;
        }

        setInsights(body as GitHubInsights);
      } catch {
        setError('Network error — please check your connection');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInsights(true);
  }, [fetchInsights]);

  // ── Loading state ──
  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Analyzing your GitHub activity…</Text>
      </View>
    );
  }

  // ── Not connected state ──
  if (requiresConnect) {
    return (
      <View style={[styles.container, styles.center]}>
        <Icon name="github" size={64} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>GitHub Not Connected</Text>
        <Text style={styles.emptyDesc}>
          Connect your GitHub account in Settings → Connected Platforms to unlock
          activity insights.
        </Text>
      </View>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Icon name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.emptyTitle}>Something went wrong</Text>
        <Text style={styles.emptyDesc}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            fetchInsights();
          }}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty state ──
  if (!insights) {
    return (
      <View style={[styles.container, styles.center]}>
        <Icon name="chart-bar" size={64} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>No Data Yet</Text>
        <Text style={styles.emptyDesc}>
          We couldn't find any GitHub activity to analyze.
        </Text>
      </View>
    );
  }

  // ── Main content ──
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            title="Refreshing insights…"
            titleColor={COLORS.textMuted}
          />
        }>

        {/* Header */}
        <View style={styles.pageHeader}>
          <Icon name="github" size={28} color={COLORS.textPrimary} />
          <View style={styles.pageHeaderText}>
            <Text style={styles.pageTitle}>{insights.username}</Text>
            <Text style={styles.pageSubtitle}>
              Member since {new Date(insights.accountCreatedAt).getFullYear()}
            </Text>
          </View>
        </View>

        {/* AI Summary */}
        {insights.aiSummary ? (
          <AiSummaryCard summary={insights.aiSummary} />
        ) : null}

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="source-repository" label="Repos" value={insights.totalRepos} />
          <StatCard icon="star-outline" label="Stars" value={insights.totalStars} />
          <StatCard icon="source-fork" label="Forks" value={insights.totalForks} />
          <StatCard icon="account-group-outline" label="Followers" value={insights.followers} />
        </View>

        {/* Primary language badge */}
        {insights.primaryLanguage ? (
          <View style={styles.primaryLangBadge}>
            <View
              style={[
                styles.langDot,
                { backgroundColor: getLangColor(insights.primaryLanguage) },
              ]}
            />
            <Text style={styles.primaryLangText}>
              Primary language:{' '}
              <Text style={{ color: getLangColor(insights.primaryLanguage), fontWeight: '700' }}>
                {insights.primaryLanguage}
              </Text>
            </Text>
          </View>
        ) : null}

        {/* Language breakdown */}
        {insights.languageStats.length > 0 ? (
          <LanguageBar stats={insights.languageStats} />
        ) : null}

        {/* Top repositories */}
        {insights.topRepos.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Repositories</Text>
            {insights.topRepos.map((repo) => (
              <RepoCard key={repo.name} repo={repo} />
            ))}
          </View>
        ) : null}

        {/* Cache notice */}
        <Text style={styles.cacheNotice}>
          Last updated {new Date(insights.fetchedAt).toLocaleString()} · Pull down to
          refresh
        </Text>

        {/* Capped stats disclaimer */}
        {insights.statsAreCapped ? (
          <View style={styles.cappedNotice}>
            <Icon name="information-outline" size={14} color={COLORS.warning} />
            <Text style={styles.cappedNoticeText}>
              Stats are based on your most recently updated 200 repos. Users with
              200+ repos may see partial star, fork, and language counts.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  // Loading
  loadingText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.md,
  },

  // Empty / error
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptyDesc: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZE.md,
  },

  // Page header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  pageHeaderText: {
    flex: 1,
  },
  pageTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
  },
  pageSubtitle: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },

  // AI card
  aiCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    marginBottom: SPACING.lg,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  aiTitle: {
    color: COLORS.accentLight,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    marginTop: SPACING.xs,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },

  // Primary language badge
  primaryLangBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  primaryLangText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },

  // Section
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },

  // Language bar
  langBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    backgroundColor: COLORS.bgElevated,
    marginBottom: SPACING.md,
  },
  langBarSegment: {
    height: '100%',
  },
  langLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  langLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  langName: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
  },
  langPct: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },

  // Repo card
  repoCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  repoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  repoName: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    flex: 1,
  },
  repoDesc: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  repoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  repoLang: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  repoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  repoMetaText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },

  // Cache notice
  cacheNotice: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginTop: SPACING.md,
  },

  // Capped stats disclaimer
  cappedNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginTop: SPACING.sm,
  },
  cappedNoticeText: {
    flex: 1,
    color: COLORS.warning,
    fontSize: FONT_SIZE.xs,
    lineHeight: 16,
  },
});
