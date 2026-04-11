import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Article as ArticleIcon,
  ArrowForward as ArrowForwardIcon,
  AccessTime as AccessTimeIcon,
  CheckCircleOutline as CheckCircleIcon,
  WarningAmber as WarningIcon,
  Block as BlockIcon,
  PendingActions as PendingIcon,
  OpenInNew as OpenInNewIcon,
  CallMerge as MergeIcon,
  LinkOff as UnlinkIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { getCenters } from '../../api/centers.api';
import { getBillingDashboard } from '../../api/billing.api';
import { getUsers } from '../../api/users.api';
import { getFeedPosts } from '../../api/content.api';
import { getDuplicates } from '../../api/students.api';
import { getUnlinkRequests } from '../../api/users.api';
import { STATUS_COLORS } from '../../theme';

/* ─── helpers ─── */
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ─── Stat Card ─── */
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  loading?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, icon, color, subtitle, loading, onClick }: StatCardProps) {
  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        '&:hover': onClick
          ? { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
              {label}
            </Typography>
            {loading ? (
              <Skeleton width={60} height={36} />
            ) : (
              <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                {value}
              </Typography>
            )}
            {subtitle && !loading && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: color + '18',
              color,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ─── Section Header ─── */
function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant="h6" fontWeight={600}>
        {title}
      </Typography>
      {action && onAction && (
        <Button
          size="small"
          endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
          onClick={onAction}
          sx={{ textTransform: 'none', fontWeight: 500, fontSize: 13 }}
        >
          {action}
        </Button>
      )}
    </Box>
  );
}

/* ─── Center Row ─── */
function CenterRow({
  name,
  category,
  status,
  hours,
  onClick,
}: {
  name: string;
  category: string;
  status: string;
  hours: number;
  onClick: () => void;
}) {
  const isUrgent = hours >= 20;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1.5,
        px: 2,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'background 0.15s',
        '&:hover': { bgcolor: '#F5F7FA' },
        '&:not(:last-child)': { borderBottom: '1px solid #F3F4F6' },
      }}
      onClick={onClick}
    >
      <Avatar
        sx={{
          width: 36,
          height: 36,
          bgcolor: isUrgent ? STATUS_COLORS.slaWarning + '18' : '#EEF2FF',
          color: isUrgent ? STATUS_COLORS.slaWarning : '#4F46E5',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {name.charAt(0)}
      </Avatar>
      <Box flex={1} minWidth={0}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {category}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        {isUrgent && (
          <Tooltip title={`${Math.round(hours)}h since submission — SLA at risk`}>
            <Chip
              icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
              label={`${Math.round(hours)}h`}
              size="small"
              sx={{
                bgcolor: STATUS_COLORS.slaWarning + '18',
                color: STATUS_COLORS.slaWarning,
                fontWeight: 600,
                fontSize: 12,
                height: 24,
              }}
            />
          </Tooltip>
        )}
        <Chip
          label={status}
          size="small"
          sx={{
            bgcolor:
              status === 'Submitted'
                ? STATUS_COLORS.pending + '22'
                : STATUS_COLORS.underReview + '18',
            color:
              status === 'Submitted' ? '#92400E' : STATUS_COLORS.underReview,
            fontWeight: 500,
            fontSize: 12,
            height: 24,
          }}
        />
        <IconButton size="small" sx={{ color: '#9CA3AF' }}>
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>
    </Box>
  );
}

/* ─── Quick Action Button ─── */
function QuickAction({
  icon,
  label,
  count,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': { bgcolor: color + '08' },
        '&:not(:last-child)': { borderBottom: '1px solid #F3F4F6' },
      }}
      onClick={onClick}
    >
      <Avatar sx={{ width: 32, height: 32, bgcolor: color + '15', color }}>
        {icon}
      </Avatar>
      <Typography variant="body2" fontWeight={500} flex={1}>
        {label}
      </Typography>
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
      <ArrowForwardIcon sx={{ fontSize: 16, color: '#D1D5DB' }} />
    </Box>
  );
}

/* ═══════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════ */
export default function DashboardPage() {
  const navigate = useNavigate();

  // ── data queries ──
  const submitted = useQuery({
    queryKey: ['dash', 'centers', 'Submitted'],
    queryFn: () => getCenters({ status: 'Submitted', page: 0, size: 5 }),
  });
  const underReview = useQuery({
    queryKey: ['dash', 'centers', 'UnderReview'],
    queryFn: () => getCenters({ status: 'UnderReview', page: 0, size: 5 }),
  });
  const approved = useQuery({
    queryKey: ['dash', 'centers', 'Approved'],
    queryFn: () => getCenters({ status: 'Approved', page: 0, size: 1 }),
  });
  const suspended = useQuery({
    queryKey: ['dash', 'centers', 'Suspended'],
    queryFn: () => getCenters({ status: 'Suspended', page: 0, size: 1 }),
  });
  const billing = useQuery({
    queryKey: ['dash', 'billing'],
    queryFn: getBillingDashboard,
    retry: 1,
  });
  const pendingPosts = useQuery({
    queryKey: ['dash', 'content', 'Pending'],
    queryFn: () => getFeedPosts({ status: 'Pending', page: 0, size: 1 }),
    retry: 1,
  });
  const duplicates = useQuery({
    queryKey: ['dash', 'duplicates'],
    queryFn: () => getDuplicates({ page: 0, size: 1 }),
    retry: 1,
  });
  const unlinkReqs = useQuery({
    queryKey: ['dash', 'unlinks'],
    queryFn: () => getUnlinkRequests({ page: 0, size: 1 }),
    retry: 1,
  });

  // ── derived values ──
  const pendingCount = submitted.data?.total ?? 0;
  const reviewCount = underReview.data?.total ?? 0;
  const approvedCount = approved.data?.total ?? 0;
  const suspendedCount = suspended.data?.total ?? 0;
  const queueTotal = pendingCount + reviewCount;

  // merge submitted + under-review into a single queue list
  const queueItems = [
    ...(submitted.data?.items ?? []).map((i) => ({ ...i, _status: 'Submitted' as const })),
    ...(underReview.data?.items ?? []).map((i) => ({ ...i, _status: 'UnderReview' as const })),
  ].sort((a, b) => (b.hours_since_submission ?? 0) - (a.hours_since_submission ?? 0));

  const statsLoading = submitted.isLoading || underReview.isLoading || approved.isLoading || suspended.isLoading;

  return (
    <Box>
      {/* ── Page header ── */}
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Overview of your platform at a glance
        </Typography>
      </Box>

      {/* ── SLA Warning banner ── */}
      {queueItems.some((c) => (c.hours_since_submission ?? 0) >= 24) && (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button
              size="small"
              color="warning"
              onClick={() => navigate('/centers')}
              sx={{ fontWeight: 600 }}
            >
              Review Now
            </Button>
          }
        >
          <strong>SLA Breach:</strong> One or more center applications have exceeded the 24-hour review window.
        </Alert>
      )}

      {/* ── Stat Cards Row ── */}
      <Grid container spacing={2.5} mb={3.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Pending Review"
            value={queueTotal}
            icon={<PendingIcon sx={{ fontSize: 22 }} />}
            color={STATUS_COLORS.pending}
            subtitle={reviewCount > 0 ? `${reviewCount} under review` : undefined}
            loading={statsLoading}
            onClick={() => navigate('/centers')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Active Centers"
            value={approvedCount}
            icon={<CheckCircleIcon sx={{ fontSize: 22 }} />}
            color={STATUS_COLORS.approved}
            loading={statsLoading}
            onClick={() => navigate('/centers')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Monthly Revenue"
            value={billing.data ? formatCurrency(billing.data.mrr) : '--'}
            icon={<TrendingUpIcon sx={{ fontSize: 22 }} />}
            color="#4F46E5"
            subtitle={billing.data ? `${billing.data.billed_students} students` : undefined}
            loading={billing.isLoading}
            onClick={() => navigate('/billing')}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Suspended"
            value={suspendedCount}
            icon={<BlockIcon sx={{ fontSize: 22 }} />}
            color={STATUS_COLORS.suspended}
            loading={statsLoading}
            onClick={() => navigate('/centers')}
          />
        </Grid>
      </Grid>

      {/* ── Main content grid ── */}
      <Grid container spacing={2.5}>
        {/* ── Left column: Approval Queue ── */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Box px={2.5} pt={2.5} pb={1}>
                <SectionHeader
                  title="Approval Queue"
                  action={`View all (${queueTotal})`}
                  onAction={() => navigate('/centers')}
                />
                {queueTotal > 0 && (
                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        {pendingCount} pending &middot; {reviewCount} in review
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {queueTotal} total
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={queueTotal > 0 ? (reviewCount / queueTotal) * 100 : 0}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: STATUS_COLORS.pending + '30',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: STATUS_COLORS.underReview,
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>
                )}
              </Box>

              {submitted.isLoading || underReview.isLoading ? (
                <Box px={2.5} pb={2}>
                  {[1, 2, 3].map((i) => (
                    <Box key={i} display="flex" alignItems="center" gap={2} py={1.5} px={2}>
                      <Skeleton variant="circular" width={36} height={36} />
                      <Box flex={1}>
                        <Skeleton width="60%" height={20} />
                        <Skeleton width="30%" height={16} />
                      </Box>
                      <Skeleton width={70} height={24} sx={{ borderRadius: 1 }} />
                    </Box>
                  ))}
                </Box>
              ) : queueItems.length === 0 ? (
                <Box textAlign="center" py={5} px={2}>
                  <CheckCircleIcon sx={{ fontSize: 40, color: STATUS_COLORS.approved, mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    All caught up! No centers waiting for review.
                  </Typography>
                </Box>
              ) : (
                <Box pb={1}>
                  {queueItems.slice(0, 5).map((c) => (
                    <CenterRow
                      key={c.id}
                      name={c.name}
                      category={c.category}
                      status={c._status}
                      hours={c.hours_since_submission ?? 0}
                      onClick={() => navigate(`/centers/${c.id}`)}
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* ── Billing summary row (below queue) ── */}
          {billing.data && (
            <Card sx={{ mt: 2.5 }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <SectionHeader title="Billing Snapshot" action="Details" onAction={() => navigate('/billing')} />
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      MRR
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {formatCurrency(billing.data.mrr)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Outstanding
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color={billing.data.outstanding_amount > 0 ? 'warning.main' : 'text.primary'}>
                      {formatCurrency(billing.data.outstanding_amount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Overdue
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color={billing.data.overdue_amount > 0 ? 'error.main' : 'text.primary'}>
                      {formatCurrency(billing.data.overdue_amount)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">
                      Billed Students
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {billing.data.billed_students}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* ── Right column: Quick Actions + info ── */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Box px={2.5} pt={2.5} pb={1}>
                <Typography variant="h6" fontWeight={600} mb={1.5}>
                  Needs Attention
                </Typography>
              </Box>
              <Box pb={1}>
                <QuickAction
                  icon={<BusinessIcon sx={{ fontSize: 18 }} />}
                  label="Center Applications"
                  count={queueTotal}
                  color={STATUS_COLORS.pending}
                  onClick={() => navigate('/centers')}
                />
                <QuickAction
                  icon={<ArticleIcon sx={{ fontSize: 18 }} />}
                  label="Posts to Moderate"
                  count={pendingPosts.data?.total}
                  color={STATUS_COLORS.underReview}
                  onClick={() => navigate('/content')}
                />
                <QuickAction
                  icon={<MergeIcon sx={{ fontSize: 18 }} />}
                  label="Duplicate Students"
                  count={duplicates.data?.total}
                  color={STATUS_COLORS.slaWarning}
                  onClick={() => navigate('/students')}
                />
                <QuickAction
                  icon={<UnlinkIcon sx={{ fontSize: 18 }} />}
                  label="Unlink Requests"
                  count={unlinkReqs.data?.total}
                  color={STATUS_COLORS.suspended}
                  onClick={() => navigate('/unlink-requests')}
                />
                {billing.data && billing.data.overdue_amount > 0 && (
                  <QuickAction
                    icon={<ReceiptIcon sx={{ fontSize: 18 }} />}
                    label="Overdue Invoices"
                    count={undefined}
                    color={STATUS_COLORS.rejected}
                    onClick={() => navigate('/billing/invoices')}
                  />
                )}
              </Box>
            </CardContent>
          </Card>

          {/* ── Platform Stats ── */}
          <Card sx={{ mt: 2.5 }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Platform Stats
              </Typography>
              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#EEF2FF', color: '#4F46E5' }}>
                      <BusinessIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography variant="body2" color="text.secondary">
                      Total Centers
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700}>
                    {statsLoading ? <Skeleton width={24} /> : approvedCount + suspendedCount}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#F0FDF4', color: STATUS_COLORS.approved }}>
                      <CheckCircleIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography variant="body2" color="text.secondary">
                      Active
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} color={STATUS_COLORS.approved}>
                    {statsLoading ? <Skeleton width={24} /> : approvedCount}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#FDF4FF', color: STATUS_COLORS.suspended }}>
                      <BlockIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography variant="body2" color="text.secondary">
                      Suspended
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} color={STATUS_COLORS.suspended}>
                    {statsLoading ? <Skeleton width={24} /> : suspendedCount}
                  </Typography>
                </Box>
                {billing.data && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: '#FFFBEB', color: STATUS_COLORS.pending }}>
                        <PeopleIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                      <Typography variant="body2" color="text.secondary">
                        Billed Students
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700}>
                      {billing.data.billed_students}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
