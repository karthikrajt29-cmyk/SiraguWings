import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
  Avatar,
  Box,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  BusinessRounded as CenterIcon,
  SchoolRounded as SchoolIcon,
  GroupsRounded as GroupsIcon,
  SupervisorAccountRounded as TeacherIcon,
  EventAvailableRounded as AttendanceIcon,
  CheckCircleRounded as ApprovedIcon,
  ChevronRightRounded as ChevronIcon,
  WavingHandRounded as WaveIcon,
  LocationOnRounded as LocationIcon,
  PendingActionsRounded as PendingIcon,
  CurrencyRupeeRounded as RupeeIcon,
  TrendingUpRounded as RevenueIcon,
  WarningAmberRounded as WarningIcon,
} from '@mui/icons-material';
import { BRAND, STATUS_COLORS } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import {
  listOwnerStudents,
  listOwnerBatches,
  listOwnerTeachers,
  getOwnerFeesSummary,
} from '../../api/owner.api';
import StatusChip from '../../components/common/StatusChip';

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

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

/* ── KPI card ── */
function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
  loading,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
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
                width: 36, height: 36,
                bgcolor: color + '15',
                color, borderRadius: '10px',
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
              {sub && (
                <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary, mt: 0.5 }} noWrap>
                  {sub}
                </Typography>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </ButtonBase>
  );
}

/* ── Section card ── */
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
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 3, py: 2.25,
          borderBottom: `1px solid ${BRAND.divider}`,
        }}>
          {icon && (
            <Avatar sx={{
              width: 32, height: 32,
              bgcolor: BRAND.primaryBg, color: BRAND.primary,
              borderRadius: '10px',
            }}>
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
                bgcolor: BRAND.primaryBg, color: BRAND.primary,
                fontWeight: 700, fontSize: 12, height: 22,
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

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { centers, loading: centersLoading } = useOwnerCenter();
  const firstName = profile?.name?.split(' ')[0] ?? 'Owner';

  /* ── Per-center fan-out queries (students/batches/teachers) ── */
  const studentQueries = useQueries({
    queries: centers.map((c) => ({
      queryKey: ['owner', 'students', c.id],
      queryFn: () => listOwnerStudents(c.id),
      enabled: !!c.id,
    })),
  });

  const batchQueries = useQueries({
    queries: centers.map((c) => ({
      queryKey: ['owner', 'batches', c.id],
      queryFn: () => listOwnerBatches(c.id),
      enabled: !!c.id,
    })),
  });

  const teacherQueries = useQueries({
    queries: centers.map((c) => ({
      queryKey: ['owner', 'teachers', c.id],
      queryFn: () => listOwnerTeachers(c.id),
      enabled: !!c.id,
    })),
  });

  const feeSummaryQueries = useQueries({
    queries: centers.map((c) => ({
      queryKey: ['owner', 'fees', 'summary', c.id],
      queryFn: () => getOwnerFeesSummary(c.id),
      enabled: !!c.id,
    })),
  });

  /* ── Derived totals ── */
  const totals = useMemo(() => {
    const students = studentQueries.reduce((s, q) => s + (q.data?.length ?? 0), 0);
    const batches  = batchQueries.reduce((s, q) => s + (q.data?.length ?? 0), 0);
    const activeBatches = batchQueries.reduce(
      (s, q) => s + (q.data?.filter((b) => b.is_active).length ?? 0),
      0,
    );
    const teachers = teacherQueries.reduce(
      (s, q) => s + (q.data?.filter((t) => t.is_active).length ?? 0),
      0,
    );
    const totalBilled    = feeSummaryQueries.reduce((s, q) => s + (q.data?.total_billed   ?? 0), 0);
    const collected      = feeSummaryQueries.reduce((s, q) => s + (q.data?.collected      ?? 0), 0);
    const outstanding    = feeSummaryQueries.reduce((s, q) => s + (q.data?.outstanding    ?? 0), 0);
    const overdueAmount  = feeSummaryQueries.reduce((s, q) => s + (q.data?.overdue_amount ?? 0), 0);
    const overdueCount   = feeSummaryQueries.reduce((s, q) => s + (q.data?.overdue_count  ?? 0), 0);
    const collectionPct  = totalBilled > 0 ? Math.round((collected / totalBilled) * 100) : 0;
    return {
      students, batches, activeBatches, teachers,
      totalBilled, collected, outstanding, overdueAmount, overdueCount, collectionPct,
    };
  }, [studentQueries, batchQueries, teacherQueries, feeSummaryQueries]);

  const feesLoading = feeSummaryQueries.some((q) => q.isLoading);

  const childLoading =
    studentQueries.some((q) => q.isLoading) ||
    batchQueries.some((q) => q.isLoading) ||
    teacherQueries.some((q) => q.isLoading);

  const approvedCenters = centers.filter((c) => c.registration_status === 'Approved').length;

  /* ── Per-center quick stats (for "Centers at a glance") ── */
  const centerStats = useMemo(
    () =>
      centers.map((c, idx) => ({
        ...c,
        students: studentQueries[idx]?.data?.length ?? 0,
        batches: batchQueries[idx]?.data?.length ?? 0,
        teachers: teacherQueries[idx]?.data?.filter((t) => t.is_active).length ?? 0,
      })),
    [centers, studentQueries, batchQueries, teacherQueries],
  );

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
              <Typography sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 800, lineHeight: 1.2, mb: 0.75 }}>
                Owner Console
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                {todayLong()} &middot; {centers.length} center{centers.length === 1 ? '' : 's'} under management
              </Typography>
            </Grid>
            <Grid item xs={12} md={5}>
              <Grid container spacing={1.5}>
                <Grid item xs={4}>
                  <Box sx={{
                    bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '12px',
                    p: 1.75, textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      Students
                    </Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, color: BRAND.accent }}>
                      {childLoading ? '—' : totals.students}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{
                    bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '12px',
                    p: 1.75, textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      Active Batches
                    </Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, color: BRAND.accent }}>
                      {childLoading ? '—' : totals.activeBatches}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{
                    bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '12px',
                    p: 1.75, textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                      Teachers
                    </Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, color: BRAND.accent }}>
                      {childLoading ? '—' : totals.teachers}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ════ TOP KPIs ════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="My Centers"
            value={centers.length}
            sub={`${approvedCenters} approved`}
            icon={<CenterIcon sx={{ fontSize: 20 }} />}
            color={BRAND.primary}
            loading={centersLoading}
            onClick={() => navigate('/owner/centers')}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Total Students"
            value={totals.students}
            sub={centers.length > 0 ? `${(totals.students / centers.length).toFixed(0)} per center avg` : undefined}
            icon={<SchoolIcon sx={{ fontSize: 20 }} />}
            color={STATUS_COLORS.approved}
            loading={childLoading}
            onClick={() => navigate('/owner/students')}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Batches"
            value={totals.batches}
            sub={`${totals.activeBatches} active`}
            icon={<GroupsIcon sx={{ fontSize: 20 }} />}
            color={BRAND.accent}
            loading={childLoading}
            onClick={() => navigate('/owner/batches')}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Teachers"
            value={totals.teachers}
            sub="active staff"
            icon={<TeacherIcon sx={{ fontSize: 20 }} />}
            color="#06B6D4"
            loading={childLoading}
            onClick={() => navigate('/owner/teachers')}
          />
        </Grid>
      </Grid>

      {/* ════ FEE KPIs ════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Total billed"
            value={fmtINR(totals.totalBilled)}
            sub={`${totals.collectionPct}% collected`}
            icon={<RupeeIcon sx={{ fontSize: 20 }} />}
            color={BRAND.primary}
            loading={feesLoading}
            onClick={() => navigate('/owner/fees')}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Collected"
            value={fmtINR(totals.collected)}
            sub="across all centers"
            icon={<RevenueIcon sx={{ fontSize: 20 }} />}
            color={STATUS_COLORS.approved}
            loading={feesLoading}
            onClick={() => navigate('/owner/fees')}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Outstanding"
            value={fmtINR(totals.outstanding)}
            sub={totals.outstanding > 0 ? 'awaiting payment' : 'all settled'}
            icon={<PendingIcon sx={{ fontSize: 20 }} />}
            color="#D97706"
            loading={feesLoading}
            onClick={() => navigate('/owner/fees')}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard
            label="Overdue"
            value={fmtINR(totals.overdueAmount)}
            sub={`${totals.overdueCount} fees past due`}
            icon={<WarningIcon sx={{ fontSize: 20 }} />}
            color={STATUS_COLORS.rejected}
            loading={feesLoading}
            onClick={() => navigate('/owner/fees?status=Overdue')}
          />
        </Grid>
      </Grid>

      {/* ════ BODY GRID ════ */}
      <Grid container spacing={2.5}>
        {/* ── Centers at a glance ── */}
        <Grid item xs={12} lg={8}>
          <Section
            title="Centers at a glance"
            subtitle="Quick stats for each of your centers"
            icon={<CenterIcon sx={{ fontSize: 18 }} />}
            badge={centers.length}
            action="Manage"
            onAction={() => navigate('/owner/centers')}
          >
            {centersLoading ? (
              <Box sx={{ p: 3 }}>
                {[1, 2].map((i) => (
                  <Skeleton key={i} variant="rounded" height={68} sx={{ mb: 1.5, borderRadius: '12px' }} />
                ))}
              </Box>
            ) : centers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Avatar sx={{
                  width: 56, height: 56, bgcolor: BRAND.primaryBg, color: BRAND.primary,
                  mx: 'auto', mb: 1.5, borderRadius: '14px',
                }}>
                  <CenterIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
                  No centers linked yet
                </Typography>
                <Typography sx={{ color: BRAND.textSecondary, fontSize: 12, mt: 0.5 }}>
                  Contact support to get your centers set up.
                </Typography>
              </Box>
            ) : (
              <Box>
                {centerStats.map((c) => (
                  <ButtonBase
                    key={c.id}
                    onClick={() => navigate(`/owner/centers/${c.id}`)}
                    sx={{
                      display: 'flex', width: '100%', textAlign: 'left',
                      alignItems: 'center', gap: 2, px: 3, py: 2,
                      transition: 'background .12s',
                      '&:hover': { bgcolor: BRAND.surface },
                      '&:not(:last-child)': { borderBottom: `1px solid ${BRAND.divider}` },
                    }}
                  >
                    <Avatar sx={{
                      width: 44, height: 44, fontSize: 14, fontWeight: 800,
                      background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                      color: '#fff', flexShrink: 0, borderRadius: '11px',
                    }}>
                      {c.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" gap={1} mb={0.25} flexWrap="wrap">
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: BRAND.textPrimary }} noWrap>
                          {c.name}
                        </Typography>
                        <StatusChip status={c.registration_status} />
                      </Stack>
                      <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
                        <Stack direction="row" alignItems="center" gap={0.5}>
                          <LocationIcon sx={{ fontSize: 13, color: BRAND.textSecondary }} />
                          <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }} noWrap>
                            {c.city}
                          </Typography>
                        </Stack>
                        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                          <strong style={{ color: BRAND.textPrimary }}>{c.students}</strong> students
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                          <strong style={{ color: BRAND.textPrimary }}>{c.batches}</strong> batches
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                          <strong style={{ color: BRAND.textPrimary }}>{c.teachers}</strong> teachers
                        </Typography>
                      </Stack>
                    </Box>
                    <ChevronIcon sx={{ color: '#C4A99A', fontSize: 18 }} />
                  </ButtonBase>
                ))}
              </Box>
            )}
          </Section>

          {/* Capacity utilisation */}
          {centers.length > 0 && totals.batches > 0 && (
            <Card sx={{ mt: 2.5, borderRadius: '16px' }}>
              <CardContent sx={{ p: '0 !important' }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 3, py: 2.25,
                  borderBottom: `1px solid ${BRAND.divider}`,
                }}>
                  <Avatar sx={{
                    width: 32, height: 32,
                    bgcolor: BRAND.primaryBg, color: BRAND.primary,
                    borderRadius: '10px',
                  }}>
                    <AttendanceIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 15, color: BRAND.textPrimary }}>
                      Batch capacity
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary, mt: 0.25 }}>
                      Students enrolled vs strength limits across all batches
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ px: 3, py: 2.5 }}>
                  {(() => {
                    const allBatches = batchQueries.flatMap((q) => q.data ?? []);
                    const totalLimit = allBatches.reduce((s, b) => s + (b.strength_limit ?? 0), 0);
                    const utilisation = totalLimit > 0
                      ? Math.min(100, Math.round((totals.students / totalLimit) * 100))
                      : 0;
                    return (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: 600 }}>
                            Overall utilisation
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: BRAND.textPrimary, fontWeight: 700 }}>
                            {totals.students} / {totalLimit || '—'} ({utilisation}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={utilisation}
                          sx={{
                            height: 8, borderRadius: 4,
                            bgcolor: BRAND.divider,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: utilisation > 85 ? STATUS_COLORS.rejected
                                : utilisation > 65 ? BRAND.accent
                                : STATUS_COLORS.approved,
                              borderRadius: 4,
                            },
                          }}
                        />
                      </>
                    );
                  })()}
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* ── Right rail ── */}
        <Grid item xs={12} lg={4}>
          {/* Quick actions */}
          <Section
            title="Quick actions"
            subtitle="Jump straight to common tasks"
            icon={<PendingIcon sx={{ fontSize: 18 }} />}
          >
            {[
              { label: 'Add Student',  desc: 'Enroll a new student',     icon: <SchoolIcon  sx={{ fontSize: 18 }} />, color: BRAND.primary,         to: '/owner/students' },
              { label: 'Create Batch', desc: 'Start a new class batch',  icon: <GroupsIcon  sx={{ fontSize: 18 }} />, color: BRAND.accent,          to: '/owner/batches' },
              { label: 'Add Teacher',  desc: 'Invite a teacher by mobile', icon: <TeacherIcon sx={{ fontSize: 18 }} />, color: '#06B6D4',           to: '/owner/teachers' },
              { label: 'Mark Attendance', desc: "Today's roll call",     icon: <AttendanceIcon sx={{ fontSize: 18 }} />, color: STATUS_COLORS.approved, to: '/owner/attendance' },
              { label: 'Manage Fees',  desc: 'Bill students & log payments', icon: <RupeeIcon sx={{ fontSize: 18 }} />, color: '#D97706',          to: '/owner/fees' },
            ].map((a) => (
              <ButtonBase
                key={a.label}
                onClick={() => navigate(a.to)}
                sx={{
                  display: 'flex', width: '100%', textAlign: 'left',
                  alignItems: 'center', gap: 2, px: 3, py: 1.75,
                  transition: 'background .12s',
                  '&:hover': { bgcolor: BRAND.surface },
                  '&:not(:last-child)': { borderBottom: `1px solid ${BRAND.divider}` },
                }}
              >
                <Avatar sx={{
                  width: 36, height: 36, bgcolor: a.color + '12', color: a.color,
                  borderRadius: '10px', flexShrink: 0,
                }}>
                  {a.icon}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: BRAND.textPrimary }}>
                    {a.label}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }} noWrap>
                    {a.desc}
                  </Typography>
                </Box>
                <ChevronIcon sx={{ color: '#C4A99A', fontSize: 18, flexShrink: 0 }} />
              </ButtonBase>
            ))}
          </Section>

          {/* Center status summary */}
          <Card sx={{ mt: 2.5, borderRadius: '16px' }}>
            <CardContent sx={{ p: '0 !important' }}>
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 3, py: 2.25,
                borderBottom: `1px solid ${BRAND.divider}`,
              }}>
                <Avatar sx={{
                  width: 32, height: 32,
                  bgcolor: BRAND.primaryBg, color: BRAND.primary,
                  borderRadius: '10px',
                }}>
                  <ApprovedIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: BRAND.textPrimary }}>
                  Status overview
                </Typography>
              </Box>
              <Box sx={{ px: 3, py: 2 }}>
                {(() => {
                  const buckets = new Map<string, number>();
                  centers.forEach((c) => {
                    buckets.set(c.registration_status, (buckets.get(c.registration_status) ?? 0) + 1);
                  });
                  const entries = Array.from(buckets.entries());
                  if (entries.length === 0) {
                    return (
                      <Typography sx={{ fontSize: 12.5, color: BRAND.textSecondary, py: 1 }}>
                        No centers to summarise yet.
                      </Typography>
                    );
                  }
                  return (
                    <Stack gap={1.5}>
                      {entries.map(([status, count]) => {
                        const max = Math.max(...entries.map(([, c]) => c), 1);
                        return (
                          <Box key={status}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Stack direction="row" alignItems="center" gap={1}>
                                <StatusChip status={status} />
                              </Stack>
                              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: 600 }}>
                                {count}
                              </Typography>
                            </Box>
                            <Tooltip title={`${count} ${status}`}>
                              <LinearProgress
                                variant="determinate"
                                value={(count / max) * 100}
                                sx={{
                                  height: 6, borderRadius: 3,
                                  bgcolor: BRAND.divider,
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: BRAND.primary, borderRadius: 3,
                                  },
                                }}
                              />
                            </Tooltip>
                          </Box>
                        );
                      })}
                    </Stack>
                  );
                })()}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
