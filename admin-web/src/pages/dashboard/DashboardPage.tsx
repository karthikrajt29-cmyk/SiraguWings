import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND, STATUS_COLORS } from '../../theme';
import {
  Alert,
  Avatar,
  Box,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccessTimeRounded as ClockIcon,
  AdminPanelSettingsRounded as AdminIcon,
  ApartmentRounded as ApartmentIcon,
  ArticleRounded as ContentIcon,
  BlockRounded as BlockIcon,
  BoltRounded as BoltIcon,
  BusinessRounded as CenterIcon,
  CheckCircleRounded as ApprovedIcon,
  ChevronRightRounded as ChevronIcon,
  ErrorOutlineRounded as ErrorIcon,
  FamilyRestroomRounded as ParentIcon,
  HourglassBottomRounded as HourglassIcon,
  InsightsRounded as InsightsIcon,
  LinkOffRounded as UnlinkIcon,
  MergeRounded as MergeIcon,
  PaidRounded as PaidIcon,
  PendingActionsRounded as PendingIcon,
  PeopleAltRounded as PeopleIcon,
  PriceChangeRounded as PriceChangeIcon,
  ReceiptLongRounded as ReceiptIcon,
  SchoolRounded as SchoolIcon,
  StorageRounded as StorageIcon,
  TrendingUpRounded as RevenueIcon,
  WarningAmberRounded as WarningIcon,
  WavingHandRounded as WaveIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { getCenters } from '../../api/centers.api';
import { getBillingDashboard } from '../../api/billing.api';
import { getFeedPosts } from '../../api/content.api';
import { getDuplicates } from '../../api/students.api';
import { getUnlinkRequests, getUserStats } from '../../api/users.api';
import { getSubscriptionDashboard, getBillingSummary } from '../../api/subscription.api';

/* ───────────────────────── helpers ───────────────────────── */
const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

const fmtCompact = (n: number) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const todayLong = () =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/* ───────────────────────── KPI card ───────────────────────── */
function KpiCard({
  label,
  value,
  sub,
  trend,
  icon,
  color,
  loading,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { positive: boolean; text: string };
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={!onClick}
      sx={{ display: 'block', width: '100%', textAlign: 'left', borderRadius: '16px' }}
    >
      <Card
        sx={{
          borderRadius: '16px',
          height: '100%',
          transition: 'all .18s ease',
          '&:hover': onClick
            ? { boxShadow: '0 6px 24px rgba(15,30,53,0.10)', transform: 'translateY(-2px)' }
            : {},
        }}
      >
        <CardContent sx={{ p: '16px !important' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.25 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: color + '15',
                color,
                borderRadius: '10px',
              }}
            >
              {icon}
            </Avatar>
            {onClick && <ChevronIcon sx={{ color: '#C4A99A', fontSize: 18, mt: 0.25 }} />}
          </Box>
          {loading ? (
            <>
              <Skeleton width="55%" height={28} sx={{ mb: 0.5 }} />
              <Skeleton width="70%" height={16} />
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: 22, fontWeight: 800, color: BRAND.textPrimary, lineHeight: 1.1, mb: 0.5 }}>
                {value}
              </Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: BRAND.textSecondary }}>
                {label}
              </Typography>
              {(sub || trend) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
                  {trend && (
                    <Chip
                      size="small"
                      label={trend.text}
                      sx={{
                        height: 18,
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor: trend.positive ? '#ECFDF5' : '#FEF2F2',
                        color: trend.positive ? '#059669' : '#DC2626',
                      }}
                    />
                  )}
                  {sub && (
                    <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }} noWrap>{sub}</Typography>
                  )}
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </ButtonBase>
  );
}

/* ───────────────────────── section card ───────────────────────── */
function Section({
  title,
  subtitle,
  badge,
  action,
  onAction,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: number;
  action?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card sx={{ borderRadius: '16px' }}>
      <CardContent sx={{ p: '0 !important' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 3,
            py: 2.25,
            borderBottom: `1px solid ${BRAND.divider}`,
          }}
        >
          {icon && (
            <Avatar sx={{ width: 32, height: 32, bgcolor: BRAND.primaryBg, color: BRAND.primary, borderRadius: '10px' }}>
              {icon}
            </Avatar>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: BRAND.textPrimary, lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary, mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {badge !== undefined && badge > 0 && (
            <Chip
              label={badge}
              size="small"
              sx={{
                bgcolor: BRAND.primaryBg,
                color: BRAND.primary,
                fontWeight: 700,
                fontSize: 12,
                height: 22,
              }}
            />
          )}
          {action && onAction && (
            <ButtonBase onClick={onAction} sx={{ borderRadius: '8px', px: 1.25, py: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.primary }}>
                {action}
              </Typography>
            </ButtonBase>
          )}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── queue row ───────────────────────── */
function QueueRow({
  name,
  category,
  city,
  status,
  hours,
  onClick,
}: {
  name: string;
  category: string;
  city: string;
  status: string;
  hours: number;
  onClick: () => void;
}) {
  const breached = hours >= 24;
  const urgent = hours >= 20;
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex',
        width: '100%',
        textAlign: 'left',
        alignItems: 'center',
        gap: 2,
        px: 3,
        py: 1.75,
        transition: 'background .12s',
        '&:hover': { bgcolor: BRAND.surface },
        '&:not(:last-child)': { borderBottom: `1px solid ${BRAND.divider}` },
      }}
    >
      <Avatar
        sx={{
          width: 40,
          height: 40,
          bgcolor: breached ? '#FEE2E2' : urgent ? '#FEF3C7' : BRAND.primaryBg,
          color: breached ? '#DC2626' : urgent ? '#D97706' : BRAND.primary,
          fontWeight: 700,
          fontSize: 15,
          borderRadius: '10px',
          flexShrink: 0,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }} noWrap>
          {name}
        </Typography>
        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }} noWrap>
          {category} &middot; {city}
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.75} alignItems="center" flexShrink={0}>
        {(urgent || breached) && (
          <Tooltip title={breached ? 'SLA breached' : 'SLA at risk'}>
            <Chip
              icon={<ClockIcon sx={{ fontSize: '14px !important' }} />}
              label={`${Math.round(hours)}h`}
              size="small"
              sx={{
                bgcolor: breached ? '#FEE2E2' : '#FEF3C7',
                color: breached ? '#DC2626' : '#D97706',
                fontWeight: 700,
                fontSize: 11,
                height: 22,
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          </Tooltip>
        )}
        <Chip
          label={status === 'UnderReview' ? 'In Review' : 'New'}
          size="small"
          sx={{
            bgcolor: status === 'UnderReview' ? '#EFF6FF' : `${BRAND.primary}12`,
            color: status === 'UnderReview' ? '#3B82F6' : BRAND.primary,
            fontWeight: 600,
            fontSize: 11,
            height: 22,
          }}
        />
        <ChevronIcon sx={{ color: '#C4A99A', fontSize: 18 }} />
      </Stack>
    </ButtonBase>
  );
}

/* ───────────────────────── action row ───────────────────────── */
function ActionRow({
  icon,
  label,
  description,
  count,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  count?: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex',
        width: '100%',
        textAlign: 'left',
        alignItems: 'center',
        gap: 2,
        px: 3,
        py: 1.75,
        transition: 'background .12s',
        '&:hover': { bgcolor: BRAND.surface },
        '&:not(:last-child)': { borderBottom: `1px solid ${BRAND.divider}` },
      }}
    >
      <Avatar
        sx={{
          width: 36,
          height: 36,
          bgcolor: color + '12',
          color,
          borderRadius: '10px',
          flexShrink: 0,
        }}
      >
        {icon}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: BRAND.textPrimary }}>
          {label}
        </Typography>
        {description && (
          <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }} noWrap>
            {description}
          </Typography>
        )}
      </Box>
      {count !== undefined && count > 0 && (
        <Chip
          label={count}
          size="small"
          sx={{
            bgcolor: color + '18',
            color,
            fontWeight: 700,
            fontSize: 12,
            height: 22,
            minWidth: 28,
          }}
        />
      )}
      <ChevronIcon sx={{ color: '#C4A99A', fontSize: 18, flexShrink: 0 }} />
    </ButtonBase>
  );
}

/* ───────────────────────── stat row ───────────────────────── */
function StatRow({
  icon,
  label,
  value,
  color,
  bg,
  divider,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color: string;
  bg: string;
  divider?: boolean;
  loading?: boolean;
}) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.4 }}>
        <Avatar sx={{ width: 30, height: 30, bgcolor: bg, color, borderRadius: '8px' }}>{icon}</Avatar>
        <Typography sx={{ flex: 1, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500 }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton width={32} height={20} />
        ) : (
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: BRAND.textPrimary }}>
            {value}
          </Typography>
        )}
      </Box>
      {divider && <Divider sx={{ borderColor: BRAND.divider }} />}
    </>
  );
}

/* ───────────────────────── distribution bar ───────────────────────── */
function DistributionBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          height: 10,
          borderRadius: 5,
          overflow: 'hidden',
          bgcolor: BRAND.divider,
          mb: 1.5,
        }}
      >
        {segments.map((s, i) => (
          <Tooltip key={i} title={`${s.label}: ${s.value}`}>
            <Box sx={{ width: `${(s.value / total) * 100}%`, bgcolor: s.color, transition: 'width .3s' }} />
          </Tooltip>
        ))}
      </Box>
      <Stack direction="row" flexWrap="wrap" gap={1.25}>
        {segments.map((s, i) => (
          <Stack key={i} direction="row" alignItems="center" gap={0.6}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: BRAND.textSecondary }}>
              {s.label}
            </Typography>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: BRAND.textPrimary }}>
              {s.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </>
  );
}

/* ═══════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════ */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const firstName = profile?.name?.split(' ')[0] ?? 'Admin';

  /* ── queries ── */
  const submitted = useQuery({
    queryKey: ['dash', 'sub'],
    queryFn: () => getCenters({ status: 'Submitted', page: 0, size: 5 }),
  });
  const inReview = useQuery({
    queryKey: ['dash', 'rev'],
    queryFn: () => getCenters({ status: 'UnderReview', page: 0, size: 5 }),
  });
  const approved = useQuery({
    queryKey: ['dash', 'app'],
    queryFn: () => getCenters({ status: 'Approved', page: 0, size: 1 }),
  });
  const rejected = useQuery({
    queryKey: ['dash', 'rej'],
    queryFn: () => getCenters({ status: 'Rejected', page: 0, size: 1 }),
  });
  const suspended = useQuery({
    queryKey: ['dash', 'sus'],
    queryFn: () => getCenters({ status: 'Suspended', page: 0, size: 1 }),
  });
  const recentApproved = useQuery({
    queryKey: ['dash', 'recent'],
    queryFn: () => getCenters({ status: 'Approved', page: 0, size: 5 }),
  });

  const billing = useQuery({ queryKey: ['dash', 'bill'], queryFn: getBillingDashboard, retry: 1 });
  const subDash = useQuery({
    queryKey: ['dash', 'subdash'],
    queryFn: getSubscriptionDashboard,
    retry: 1,
  });
  const billSummary = useQuery({
    queryKey: ['dash', 'billsum'],
    queryFn: () => getBillingSummary(),
    retry: 1,
  });
  const userStats = useQuery({ queryKey: ['dash', 'users'], queryFn: getUserStats, retry: 1 });

  const posts = useQuery({
    queryKey: ['dash', 'post'],
    queryFn: () => getFeedPosts({ status: 'Pending', page: 0, size: 1 }),
    retry: 1,
  });
  const dupes = useQuery({
    queryKey: ['dash', 'dup'],
    queryFn: () => getDuplicates({ page: 0, size: 1 }),
    retry: 1,
  });
  const unlinks = useQuery({
    queryKey: ['dash', 'unl'],
    queryFn: () => getUnlinkRequests({ page: 0, size: 1 }),
    retry: 1,
  });

  /* ── derived ── */
  const pendingCnt = submitted.data?.total ?? 0;
  const reviewCnt = inReview.data?.total ?? 0;
  const approvedCnt = approved.data?.total ?? 0;
  const rejectedCnt = rejected.data?.total ?? 0;
  const suspendedCnt = suspended.data?.total ?? 0;
  const queueTotal = pendingCnt + reviewCnt;
  const totalCenters = approvedCnt + suspendedCnt + queueTotal + rejectedCnt;
  const statsLoading =
    submitted.isLoading || inReview.isLoading || approved.isLoading || suspended.isLoading;

  const queueItems = useMemo(
    () =>
      [
        ...(submitted.data?.items ?? []).map((i) => ({ ...i, _s: 'Submitted' as const })),
        ...(inReview.data?.items ?? []).map((i) => ({ ...i, _s: 'UnderReview' as const })),
      ].sort((a, b) => (b.hours_since_submission ?? 0) - (a.hours_since_submission ?? 0)),
    [submitted.data, inReview.data],
  );

  const slaBreachedCount = queueItems.filter((c) => (c.hours_since_submission ?? 0) >= 24).length;

  /* category mix from approved sample */
  const categoryMix = useMemo(() => {
    const items = recentApproved.data?.items ?? [];
    const m = new Map<string, number>();
    items.forEach((i) => m.set(i.category, (m.get(i.category) ?? 0) + 1));
    return Array.from(m.entries()).slice(0, 4);
  }, [recentApproved.data]);

  const collectionRate =
    billSummary.data && billSummary.data.total_amount > 0
      ? Math.round((billSummary.data.collected / billSummary.data.total_amount) * 100)
      : null;

  const ownerCount = userStats.data?.by_role?.Owner ?? 0;
  const teacherCount = userStats.data?.by_role?.Teacher ?? 0;
  const parentCount = userStats.data?.by_role?.Parent ?? 0;
  const adminCount = userStats.data?.by_role?.Admin ?? 0;
  const staffCount = userStats.data?.by_role?.Staff ?? 0;

  return (
    <Box>
      {/* ════ HERO HEADER ════ */}
      <Card
        sx={{
          mb: 3,
          borderRadius: '20px',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${BRAND.navyDark} 0%, ${BRAND.navyLight} 100%)`,
          border: 'none',
          color: '#fff',
        }}
      >
        <CardContent sx={{ p: '28px !important' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack direction="row" alignItems="center" gap={1.25} mb={1}>
                <WaveIcon sx={{ color: BRAND.accent, fontSize: 22 }} />
                <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                  {greeting()}, {firstName}
                </Typography>
              </Stack>
              <Typography
                sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 800, lineHeight: 1.2, mb: 0.75 }}
              >
                Welcome to SiraguWings Admin
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                {todayLong()} &middot; {totalCenters} centers under management
              </Typography>
            </Grid>
            <Grid item xs={12} md={5}>
              <Grid container spacing={1.5}>
                <Grid item xs={4}>
                  <Box
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      p: 1.75,
                      textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      Queue
                    </Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, color: BRAND.accent }}>
                      {statsLoading ? '—' : queueTotal}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      p: 1.75,
                      textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      SLA Risk
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: slaBreachedCount > 0 ? '#FCA5A5' : BRAND.accent,
                      }}
                    >
                      {slaBreachedCount}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      p: 1.75,
                      textAlign: 'center',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      MRR
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: BRAND.accent }}>
                      {billing.data ? fmtCompact(billing.data.mrr) : '—'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ════ SLA BREACH ALERT ════ */}
      {slaBreachedCount > 0 && (
        <Alert
          severity="error"
          icon={<ErrorIcon />}
          sx={{ mb: 3, borderRadius: '12px', fontSize: 13, alignItems: 'center' }}
          action={
            <ButtonBase
              onClick={() => navigate('/centers')}
              sx={{ borderRadius: '8px', px: 1.5, py: 0.75, bgcolor: 'rgba(0,0,0,0.06)' }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Review now</Typography>
            </ButtonBase>
          }
        >
          <strong>{slaBreachedCount} application{slaBreachedCount > 1 ? 's' : ''}</strong> exceeded
          the 24-hour SLA target — immediate review required.
        </Alert>
      )}

      {/* ════ TOP KPIs ════ */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Pending Review"
            value={queueTotal}
            sub={reviewCnt > 0 ? `${reviewCnt} in review` : 'All caught up'}
            icon={<PendingIcon sx={{ fontSize: 20 }} />}
            color={BRAND.primary}
            loading={statsLoading}
            onClick={() => navigate('/centers')}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Active Centers"
            value={approvedCnt}
            sub={`${totalCenters} total`}
            icon={<ApprovedIcon sx={{ fontSize: 20 }} />}
            color={STATUS_COLORS.approved}
            loading={statsLoading}
            onClick={() => navigate('/centers')}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Monthly Revenue"
            value={billing.data ? fmtINR(billing.data.mrr) : '—'}
            sub={billing.data ? `${billing.data.billed_students} students billed` : undefined}
            icon={<RevenueIcon sx={{ fontSize: 20 }} />}
            color={BRAND.accent}
            loading={billing.isLoading}
            onClick={() => navigate('/billing')}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Collection Rate"
            value={collectionRate !== null ? `${collectionRate}%` : '—'}
            sub={
              billSummary.data
                ? `${fmtINR(billSummary.data.outstanding)} outstanding`
                : undefined
            }
            icon={<PaidIcon sx={{ fontSize: 20 }} />}
            color="#0EA5E9"
            loading={billSummary.isLoading}
            onClick={() => navigate('/billing')}
          />
        </Grid>
      </Grid>

      {/* ════ SECONDARY KPIs ════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Total Users"
            value={userStats.data?.total ?? '—'}
            sub={userStats.data ? `${userStats.data.active} active` : undefined}
            icon={<PeopleIcon sx={{ fontSize: 20 }} />}
            color="#8B5CF6"
            loading={userStats.isLoading}
            onClick={() => navigate('/users')}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Owners"
            value={ownerCount}
            sub={`${teacherCount} teachers`}
            icon={<AdminIcon sx={{ fontSize: 20 }} />}
            color="#06B6D4"
            loading={userStats.isLoading}
            onClick={() => navigate('/owners')}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Parents"
            value={parentCount}
            icon={<ParentIcon sx={{ fontSize: 20 }} />}
            color="#EC4899"
            loading={userStats.isLoading}
            onClick={() => navigate('/parents')}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Suspended"
            value={suspendedCnt}
            sub={rejectedCnt > 0 ? `${rejectedCnt} rejected` : undefined}
            icon={<BlockIcon sx={{ fontSize: 20 }} />}
            color={STATUS_COLORS.suspended}
            loading={statsLoading}
            onClick={() => navigate('/centers')}
          />
        </Grid>
      </Grid>

      {/* ════ BODY GRID ════ */}
      <Grid container spacing={2.5}>
        {/* ── LEFT COLUMN ── */}
        <Grid item xs={12} lg={8}>
          {/* Approval queue */}
          <Section
            title="Approval Queue"
            subtitle="Centers awaiting review, sorted by oldest first"
            badge={queueTotal}
            icon={<HourglassIcon sx={{ fontSize: 18 }} />}
            action="View all"
            onAction={() => navigate('/centers')}
          >
            {queueTotal > 0 && (
              <Box sx={{ px: 3, pt: 2, pb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                    {pendingCnt} new &middot; {reviewCnt} in review
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: 600 }}>
                    {queueTotal} total
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={queueTotal ? (reviewCnt / queueTotal) * 100 : 0}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: `${BRAND.primary}18`,
                    '& .MuiLinearProgress-bar': { bgcolor: BRAND.accent, borderRadius: 3 },
                  }}
                />
              </Box>
            )}

            {submitted.isLoading || inReview.isLoading ? (
              <Box sx={{ px: 3, pb: 2, pt: 1 }}>
                {[1, 2, 3].map((i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
                    <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: '10px' }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="55%" height={18} />
                      <Skeleton width="30%" height={14} sx={{ mt: 0.5 }} />
                    </Box>
                    <Skeleton width={72} height={22} sx={{ borderRadius: 1 }} />
                  </Box>
                ))}
              </Box>
            ) : queueItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: '#ECFDF5',
                    color: STATUS_COLORS.approved,
                    mx: 'auto',
                    mb: 1.5,
                  }}
                >
                  <ApprovedIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
                  All caught up!
                </Typography>
                <Typography sx={{ color: BRAND.textSecondary, fontSize: 12, mt: 0.5 }}>
                  No pending applications to review
                </Typography>
              </Box>
            ) : (
              <Box>
                {queueItems.slice(0, 6).map((c) => (
                  <QueueRow
                    key={c.id}
                    name={c.name}
                    category={c.category}
                    city={c.city}
                    status={c._s}
                    hours={c.hours_since_submission ?? 0}
                    onClick={() => navigate(`/centers/${c.id}`)}
                  />
                ))}
              </Box>
            )}
          </Section>

          {/* Billing Snapshot */}
          {(billing.data || billSummary.data) && (
            <Card sx={{ mt: 2.5, borderRadius: '16px' }}>
              <CardContent sx={{ p: '0 !important' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 3,
                    py: 2.25,
                    borderBottom: `1px solid ${BRAND.divider}`,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: BRAND.primaryBg,
                      color: BRAND.primary,
                      borderRadius: '10px',
                    }}
                  >
                    <ReceiptIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 15, color: BRAND.textPrimary }}>
                      Billing Snapshot
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary, mt: 0.25 }}>
                      Current month financial summary
                    </Typography>
                  </Box>
                  <ButtonBase
                    onClick={() => navigate('/billing')}
                    sx={{ borderRadius: '8px', px: 1.25, py: 0.5 }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.primary }}>
                      Details
                    </Typography>
                  </ButtonBase>
                </Box>
                <Grid container sx={{ px: 3, py: 2.5 }} spacing={2}>
                  {[
                    {
                      label: 'MRR',
                      val: billing.data ? fmtINR(billing.data.mrr) : '—',
                      color: BRAND.primary,
                      icon: <RevenueIcon sx={{ fontSize: 18 }} />,
                    },
                    {
                      label: 'Outstanding',
                      val: billing.data ? fmtINR(billing.data.outstanding_amount) : '—',
                      color:
                        billing.data && billing.data.outstanding_amount > 0
                          ? '#D97706'
                          : BRAND.textPrimary,
                      icon: <HourglassIcon sx={{ fontSize: 18 }} />,
                    },
                    {
                      label: 'Overdue',
                      val: billing.data ? fmtINR(billing.data.overdue_amount) : '—',
                      color:
                        billing.data && billing.data.overdue_amount > 0
                          ? '#DC2626'
                          : BRAND.textPrimary,
                      icon: <ErrorIcon sx={{ fontSize: 18 }} />,
                    },
                    {
                      label: 'Billed Students',
                      val: billing.data?.billed_students ?? '—',
                      color: BRAND.textPrimary,
                      icon: <SchoolIcon sx={{ fontSize: 18 }} />,
                    },
                  ].map((item, i) => (
                    <Grid key={i} item xs={6} sm={3}>
                      <Box
                        sx={{
                          p: 1.75,
                          bgcolor: BRAND.surface,
                          borderRadius: '12px',
                          border: `1px solid ${BRAND.divider}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                          <Box sx={{ color: BRAND.textSecondary }}>{item.icon}</Box>
                          <Typography
                            sx={{
                              fontSize: 10.5,
                              color: BRAND.textSecondary,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                            }}
                          >
                            {item.label}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 18, fontWeight: 800, color: item.color }}>
                          {item.val}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {billSummary.data && (
                  <Box sx={{ px: 3, pb: 3, pt: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: 600 }}>
                        Collection Progress
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: BRAND.textPrimary, fontWeight: 700 }}>
                        {fmtINR(billSummary.data.collected)} / {fmtINR(billSummary.data.total_amount)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={collectionRate ?? 0}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: BRAND.divider,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: STATUS_COLORS.approved,
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Stack direction="row" gap={2} mt={1.25} flexWrap="wrap">
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_COLORS.approved }} />
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                          Paid: <strong style={{ color: BRAND.textPrimary }}>{billSummary.data.paid_count}</strong>
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#F59E0B' }} />
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                          Pending: <strong style={{ color: BRAND.textPrimary }}>{billSummary.data.pending_count}</strong>
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#DC2626' }} />
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                          Overdue: <strong style={{ color: BRAND.textPrimary }}>{billSummary.data.overdue_count}</strong>
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Subscription Plan Distribution */}
          {subDash.data && subDash.data.plan_breakdown.length > 0 && (
            <Box sx={{ mt: 2.5 }}>
              <Section
                title="Subscription Plans"
                subtitle="Plan adoption across active centers"
                icon={<PriceChangeIcon sx={{ fontSize: 18 }} />}
                action="Manage"
                onAction={() => navigate('/subscription')}
              >
                <Box sx={{ px: 3, py: 2.5 }}>
                  <Grid container spacing={2} mb={2.5}>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: BRAND.textSecondary,
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            letterSpacing: 0.5,
                          }}
                        >
                          Active Subs
                        </Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: BRAND.textPrimary }}>
                          {subDash.data.active_subscriptions}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: BRAND.textSecondary,
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            letterSpacing: 0.5,
                          }}
                        >
                          Free Plan
                        </Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: BRAND.textPrimary }}>
                          {subDash.data.free_plan_count}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: BRAND.textSecondary,
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            letterSpacing: 0.5,
                          }}
                        >
                          Paid Plan
                        </Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: BRAND.primary }}>
                          {subDash.data.paid_plan_count}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: BRAND.textSecondary,
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            letterSpacing: 0.5,
                          }}
                        >
                          Add-on Rev.
                        </Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: BRAND.accent }}>
                          {fmtCompact(
                            subDash.data.total_extra_student_revenue +
                              subDash.data.total_storage_addon_revenue,
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Stack gap={1.5}>
                    {subDash.data.plan_breakdown.map((p, i) => {
                      const palette = [BRAND.primary, BRAND.accent, '#06B6D4', '#8B5CF6', '#22C55E'];
                      const max = Math.max(...subDash.data!.plan_breakdown.map((x) => x.count), 1);
                      const pct = (p.count / max) * 100;
                      return (
                        <Box key={i}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: BRAND.textPrimary }}>
                              {p.name}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                              <strong style={{ color: BRAND.textPrimary }}>{p.count}</strong> centers &middot;{' '}
                              {fmtINR(p.revenue)}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: BRAND.divider,
                              '& .MuiLinearProgress-bar': {
                                bgcolor: palette[i % palette.length],
                                borderRadius: 4,
                              },
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </Section>
            </Box>
          )}
        </Grid>

        {/* ── RIGHT COLUMN ── */}
        <Grid item xs={12} lg={4}>
          {/* Needs Attention */}
          <Section
            title="Needs Attention"
            subtitle="Items waiting on admin action"
            icon={<BoltIcon sx={{ fontSize: 18 }} />}
          >
            <ActionRow
              icon={<CenterIcon sx={{ fontSize: 18 }} />}
              label="Center Applications"
              description="Review and approve"
              count={queueTotal}
              color={BRAND.primary}
              onClick={() => navigate('/centers')}
            />
            <ActionRow
              icon={<ContentIcon sx={{ fontSize: 18 }} />}
              label="Posts to Moderate"
              description="Pending feed posts"
              count={posts.data?.total}
              color={STATUS_COLORS.underReview}
              onClick={() => navigate('/content')}
            />
            <ActionRow
              icon={<MergeIcon sx={{ fontSize: 18 }} />}
              label="Duplicate Students"
              description="Merge or keep separate"
              count={dupes.data?.total}
              color={BRAND.accent}
              onClick={() => navigate('/students')}
            />
            <ActionRow
              icon={<UnlinkIcon sx={{ fontSize: 18 }} />}
              label="Unlink Requests"
              description="Parent disconnects"
              count={unlinks.data?.total}
              color={STATUS_COLORS.suspended}
              onClick={() => navigate('/unlink-requests')}
            />
            {billing.data && billing.data.overdue_amount > 0 && (
              <ActionRow
                icon={<ReceiptIcon sx={{ fontSize: 18 }} />}
                label="Overdue Invoices"
                description={fmtINR(billing.data.overdue_amount)}
                color={STATUS_COLORS.rejected}
                onClick={() => navigate('/billing/invoices')}
              />
            )}
          </Section>

          {/* User Distribution */}
          {userStats.data && (
            <Card sx={{ mt: 2.5, borderRadius: '16px' }}>
              <CardContent sx={{ p: '0 !important' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 3,
                    py: 2.25,
                    borderBottom: `1px solid ${BRAND.divider}`,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: BRAND.primaryBg,
                      color: BRAND.primary,
                      borderRadius: '10px',
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 15, color: BRAND.textPrimary }}>
                      User Distribution
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary, mt: 0.25 }}>
                      {userStats.data.total} total accounts
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ px: 3, py: 2.5 }}>
                  <DistributionBar
                    segments={[
                      { label: 'Owners', value: ownerCount, color: '#06B6D4' },
                      { label: 'Teachers', value: teacherCount, color: BRAND.accent },
                      { label: 'Parents', value: parentCount, color: '#EC4899' },
                      { label: 'Staff', value: staffCount, color: '#8B5CF6' },
                      { label: 'Admins', value: adminCount, color: BRAND.primary },
                    ]}
                  />
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Platform Stats */}
          <Card sx={{ mt: 2.5, borderRadius: '16px' }}>
            <CardContent sx={{ p: '0 !important' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 3,
                  py: 2.25,
                  borderBottom: `1px solid ${BRAND.divider}`,
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: BRAND.primaryBg,
                    color: BRAND.primary,
                    borderRadius: '10px',
                  }}
                >
                  <InsightsIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: BRAND.textPrimary }}>
                  Platform Stats
                </Typography>
              </Box>
              <Box sx={{ px: 3, py: 1.5 }}>
                <StatRow
                  icon={<CenterIcon sx={{ fontSize: 16 }} />}
                  label="Total Centers"
                  value={statsLoading ? null : totalCenters}
                  loading={statsLoading}
                  color={BRAND.primary}
                  bg={BRAND.primaryBg}
                  divider
                />
                <StatRow
                  icon={<ApprovedIcon sx={{ fontSize: 16 }} />}
                  label="Active"
                  value={statsLoading ? null : approvedCnt}
                  loading={statsLoading}
                  color={STATUS_COLORS.approved}
                  bg="#F0FDF4"
                  divider
                />
                <StatRow
                  icon={<PendingIcon sx={{ fontSize: 16 }} />}
                  label="In Queue"
                  value={statsLoading ? null : queueTotal}
                  loading={statsLoading}
                  color={BRAND.accent}
                  bg={`${BRAND.accent}18`}
                  divider
                />
                <StatRow
                  icon={<BlockIcon sx={{ fontSize: 16 }} />}
                  label="Suspended"
                  value={statsLoading ? null : suspendedCnt}
                  loading={statsLoading}
                  color={STATUS_COLORS.suspended}
                  bg="#FDF4FF"
                  divider
                />
                <StatRow
                  icon={<WarningIcon sx={{ fontSize: 16 }} />}
                  label="Rejected"
                  value={statsLoading ? null : rejectedCnt}
                  loading={statsLoading}
                  color={STATUS_COLORS.rejected}
                  bg="#FEF2F2"
                  divider
                />
                <StatRow
                  icon={<SchoolIcon sx={{ fontSize: 16 }} />}
                  label="Billed Students"
                  value={billing.data?.billed_students ?? null}
                  loading={billing.isLoading}
                  color="#0EA5E9"
                  bg="#E0F2FE"
                  divider={!!subDash.data}
                />
                {subDash.data && (
                  <StatRow
                    icon={<StorageIcon sx={{ fontSize: 16 }} />}
                    label="Add-on Revenue"
                    value={fmtINR(
                      subDash.data.total_extra_student_revenue +
                        subDash.data.total_storage_addon_revenue,
                    )}
                    color="#8B5CF6"
                    bg="#F5F3FF"
                  />
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Category Mix */}
          {categoryMix.length > 0 && (
            <Card sx={{ mt: 2.5, borderRadius: '16px' }}>
              <CardContent sx={{ p: '0 !important' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 3,
                    py: 2.25,
                    borderBottom: `1px solid ${BRAND.divider}`,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: BRAND.primaryBg,
                      color: BRAND.primary,
                      borderRadius: '10px',
                    }}
                  >
                    <ApartmentIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Typography sx={{ fontWeight: 700, fontSize: 15, color: BRAND.textPrimary }}>
                    Center Categories
                  </Typography>
                </Box>
                <Box sx={{ px: 3, py: 2.5 }}>
                  <Stack gap={1.25}>
                    {categoryMix.map(([cat, count], i) => {
                      const palette = ['#06B6D4', BRAND.accent, '#8B5CF6', '#EC4899'];
                      const max = Math.max(...categoryMix.map(([, c]) => c), 1);
                      return (
                        <Box key={cat}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: BRAND.textPrimary }}>
                              {cat}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: 600 }}>
                              {count}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={(count / max) * 100}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: BRAND.divider,
                              '& .MuiLinearProgress-bar': {
                                bgcolor: palette[i % palette.length],
                                borderRadius: 3,
                              },
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
