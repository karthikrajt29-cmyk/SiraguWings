import { useNavigate } from 'react-router-dom';
import { BRAND, STATUS_COLORS } from '../../theme';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
  Avatar,
  ButtonBase,
  Alert,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  BusinessRounded as CenterIcon,
  CheckCircleRounded as ApprovedIcon,
  WarningAmberRounded as WarningIcon,
  BlockRounded as BlockIcon,
  TrendingUpRounded as RevenueIcon,
  ArticleRounded as ContentIcon,
  MergeRounded as MergeIcon,
  LinkOffRounded as UnlinkIcon,
  ReceiptRounded as ReceiptIcon,
  PendingActionsRounded as PendingIcon,
  AccessTimeRounded as ClockIcon,
  ChevronRightRounded as ChevronIcon,
  PeopleRounded as PeopleIcon,
  SpaceDashboardRounded as DashIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { getCenters } from '../../api/centers.api';
import { getBillingDashboard } from '../../api/billing.api';
import { getFeedPosts } from '../../api/content.api';
import { getDuplicates } from '../../api/students.api';
import { getUnlinkRequests } from '../../api/users.api';

/* ── helpers ── */
const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

/* ─────────────────────────────────────────────────
   KPI CARD
───────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon, color, loading, onClick,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
  loading?: boolean; onClick?: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={!onClick}
      sx={{ display: 'block', width: '100%', textAlign: 'left', borderRadius: '16px' }}
    >
      <Card sx={{
        borderRadius: '16px',
        transition: 'all 0.18s ease',
        '&:hover': onClick ? { boxShadow: '0 4px 20px rgba(229,62,0,0.12)', transform: 'translateY(-2px)' } : {},
      }}>
        <CardContent sx={{ p: '20px !important' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Avatar sx={{ width: 44, height: 44, bgcolor: color + '15', color, borderRadius: '12px' }}>
              {icon}
            </Avatar>
            {onClick && <ChevronIcon sx={{ color: '#C4A99A', fontSize: 20, mt: 0.5 }} />}
          </Box>
          {loading ? (
            <>
              <Skeleton width="50%" height={32} sx={{ mb: 0.5 }} />
              <Skeleton width="70%" height={18} />
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: BRAND.textPrimary, lineHeight: 1.1, mb: 0.5 }}>
                {value}
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: BRAND.textSecondary }}>
                {label}
              </Typography>
              {sub && (
                <Typography sx={{ fontSize: 12, color, fontWeight: 500, mt: 0.5 }}>
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

/* ─────────────────────────────────────────────────
   SECTION WRAPPER
───────────────────────────────────────────────── */
function Section({
  title, badge, action, onAction, children,
}: {
  title: string; badge?: number; action?: string;
  onAction?: () => void; children: React.ReactNode;
}) {
  return (
    <Card sx={{ borderRadius: '16px' }}>
      <CardContent sx={{ p: '0 !important' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center',
          px: 3, py: 2.5,
          borderBottom: `1px solid ${BRAND.divider}`,
        }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: BRAND.textPrimary, flex: 1 }}>
            {title}
          </Typography>
          {badge !== undefined && badge > 0 && (
            <Chip
              label={badge}
              size="small"
              sx={{ bgcolor: BRAND.primaryBg, color: BRAND.primary, fontWeight: 700, fontSize: 12, height: 22, mr: 1.5 }}
            />
          )}
          {action && onAction && (
            <ButtonBase onClick={onAction} sx={{ borderRadius: '8px', px: 1.5, py: 0.5 }}>
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

/* ─────────────────────────────────────────────────
   QUEUE ROW
───────────────────────────────────────────────── */
function QueueRow({
  name, category, status, hours, onClick,
}: {
  name: string; category: string; status: string; hours: number; onClick: () => void;
}) {
  const urgent = hours >= 20;
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex', width: '100%', textAlign: 'left',
        alignItems: 'center', gap: 2,
        px: 3, py: 1.75,
        transition: 'background 0.12s',
        '&:hover': { bgcolor: BRAND.surface },
        '&:not(:last-child)': { borderBottom: `1px solid ${BRAND.divider}` },
      }}
    >
      <Avatar sx={{
        width: 38, height: 38,
        bgcolor: urgent ? '#FEF3C7' : BRAND.primaryBg,
        color:  urgent ? '#D97706' : BRAND.primary,
        fontWeight: 700, fontSize: 15,
        borderRadius: '10px', flexShrink: 0,
      }}>
        {name.charAt(0)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }} noWrap>
          {name}
        </Typography>
        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
          {category}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
        {urgent && (
          <Tooltip title="SLA at risk">
            <Chip
              icon={<ClockIcon sx={{ fontSize: '14px !important' }} />}
              label={`${Math.round(hours)}h`}
              size="small"
              sx={{
                bgcolor: '#FEF3C7', color: '#D97706',
                fontWeight: 600, fontSize: 11, height: 22,
                '& .MuiChip-icon': { color: '#D97706' },
              }}
            />
          </Tooltip>
        )}
        <Chip
          label={status === 'UnderReview' ? 'In Review' : 'Pending'}
          size="small"
          sx={{
            bgcolor: status === 'UnderReview' ? '#EFF6FF' : `${BRAND.primary}12`,
            color:   status === 'UnderReview' ? '#3B82F6' : BRAND.primary,
            fontWeight: 600, fontSize: 11, height: 22,
          }}
        />
        <ChevronIcon sx={{ color: '#C4A99A', fontSize: 18 }} />
      </Stack>
    </ButtonBase>
  );
}

/* ─────────────────────────────────────────────────
   ACTION ROW
───────────────────────────────────────────────── */
function ActionRow({
  icon, label, count, color, onClick,
}: {
  icon: React.ReactNode; label: string;
  count?: number; color: string; onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: 'flex', width: '100%', textAlign: 'left',
        alignItems: 'center', gap: 2,
        px: 3, py: 1.75,
        transition: 'background 0.12s',
        '&:hover': { bgcolor: BRAND.surface },
        '&:not(:last-child)': { borderBottom: `1px solid ${BRAND.divider}` },
      }}
    >
      <Avatar sx={{ width: 34, height: 34, bgcolor: color + '12', color, borderRadius: '10px', flexShrink: 0 }}>
        {icon}
      </Avatar>
      <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 500, color: BRAND.textPrimary }}>
        {label}
      </Typography>
      {count !== undefined && count > 0 && (
        <Chip
          label={count}
          size="small"
          sx={{ bgcolor: color + '18', color, fontWeight: 700, fontSize: 12, height: 22, minWidth: 28 }}
        />
      )}
      <ChevronIcon sx={{ color: '#C4A99A', fontSize: 18, flexShrink: 0 }} />
    </ButtonBase>
  );
}

/* ═══════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════ */
export default function DashboardPage() {
  const navigate = useNavigate();

  const submitted = useQuery({ queryKey: ['dash','sub'],  queryFn: () => getCenters({ status: 'Submitted',   page: 0, size: 5 }) });
  const inReview  = useQuery({ queryKey: ['dash','rev'],  queryFn: () => getCenters({ status: 'UnderReview', page: 0, size: 5 }) });
  const approved  = useQuery({ queryKey: ['dash','app'],  queryFn: () => getCenters({ status: 'Approved',    page: 0, size: 1 }) });
  const suspended = useQuery({ queryKey: ['dash','sus'],  queryFn: () => getCenters({ status: 'Suspended',   page: 0, size: 1 }) });
  const billing   = useQuery({ queryKey: ['dash','bill'], queryFn: getBillingDashboard, retry: 1 });
  const posts     = useQuery({ queryKey: ['dash','post'], queryFn: () => getFeedPosts({ status: 'Pending', page: 0, size: 1 }), retry: 1 });
  const dupes     = useQuery({ queryKey: ['dash','dup'],  queryFn: () => getDuplicates({ page: 0, size: 1 }), retry: 1 });
  const unlinks   = useQuery({ queryKey: ['dash','unl'],  queryFn: () => getUnlinkRequests({ page: 0, size: 1 }), retry: 1 });

  const pendingCnt   = submitted.data?.total  ?? 0;
  const reviewCnt    = inReview.data?.total   ?? 0;
  const approvedCnt  = approved.data?.total   ?? 0;
  const suspendedCnt = suspended.data?.total  ?? 0;
  const queueTotal   = pendingCnt + reviewCnt;
  const statsLoading = submitted.isLoading || inReview.isLoading || approved.isLoading || suspended.isLoading;

  const queueItems = [
    ...(submitted.data?.items ?? []).map((i) => ({ ...i, _s: 'Submitted'  as const })),
    ...(inReview.data?.items  ?? []).map((i) => ({ ...i, _s: 'UnderReview' as const })),
  ].sort((a, b) => (b.hours_since_submission ?? 0) - (a.hours_since_submission ?? 0));

  const hasSlaBreached = queueItems.some((c) => (c.hours_since_submission ?? 0) >= 24);

  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Avatar sx={{ width: 40, height: 40, bgcolor: BRAND.primaryBg, color: BRAND.primary, borderRadius: '12px' }}>
          <DashIcon />
        </Avatar>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: BRAND.textPrimary, lineHeight: 1.2 }}>
            Dashboard
          </Typography>
          <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>
            Platform overview
          </Typography>
        </Box>
      </Box>

      {/* ── SLA breach alert ── */}
      {hasSlaBreached && (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 3, borderRadius: '12px', fontSize: 13 }}
          action={
            <ButtonBase
              onClick={() => navigate('/centers')}
              sx={{ borderRadius: '8px', px: 1.5, py: 0.75, bgcolor: 'rgba(0,0,0,0.06)' }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Review now</Typography>
            </ButtonBase>
          }
        >
          <strong>SLA breach:</strong> One or more applications exceeded the 24-hour review window.
        </Alert>
      )}

      {/* ── KPI cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Pending Review"
            value={queueTotal}
            sub={reviewCnt > 0 ? `${reviewCnt} in review` : undefined}
            icon={<PendingIcon sx={{ fontSize: 22 }} />}
            color={BRAND.primary}
            loading={statsLoading}
            onClick={() => navigate('/centers')}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Active Centers"
            value={approvedCnt}
            icon={<ApprovedIcon sx={{ fontSize: 22 }} />}
            color={STATUS_COLORS.approved}
            loading={statsLoading}
            onClick={() => navigate('/centers')}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Monthly Revenue"
            value={billing.data ? fmt(billing.data.mrr) : '—'}
            sub={billing.data ? `${billing.data.billed_students} students billed` : undefined}
            icon={<RevenueIcon sx={{ fontSize: 22 }} />}
            color={BRAND.accent}
            loading={billing.isLoading}
            onClick={() => navigate('/billing')}
          />
        </Grid>
        <Grid item xs={12} sm={6} xl={3}>
          <KpiCard
            label="Suspended"
            value={suspendedCnt}
            icon={<BlockIcon sx={{ fontSize: 22 }} />}
            color={STATUS_COLORS.suspended}
            loading={statsLoading}
            onClick={() => navigate('/centers')}
          />
        </Grid>
      </Grid>

      {/* ── Body grid ── */}
      <Grid container spacing={2.5}>

        {/* LEFT: approval queue */}
        <Grid item xs={12} lg={8}>
          <Section title="Approval Queue" badge={queueTotal} action="View all" onAction={() => navigate('/centers')}>
            {queueTotal > 0 && (
              <Box sx={{ px: 3, pt: 2, pb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                    {pendingCnt} pending &middot; {reviewCnt} in review
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                    {queueTotal} total
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={queueTotal ? (reviewCnt / queueTotal) * 100 : 0}
                  sx={{
                    height: 6, borderRadius: 3,
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
                    <Skeleton variant="rounded" width={38} height={38} sx={{ borderRadius: '10px' }} />
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
                <ApprovedIcon sx={{ fontSize: 44, color: STATUS_COLORS.approved, mb: 1 }} />
                <Typography sx={{ color: BRAND.textSecondary, fontSize: 14 }}>
                  All caught up — no pending applications.
                </Typography>
              </Box>
            ) : (
              <Box>
                {queueItems.slice(0, 6).map((c) => (
                  <QueueRow
                    key={c.id}
                    name={c.name}
                    category={c.category}
                    status={c._s}
                    hours={c.hours_since_submission ?? 0}
                    onClick={() => navigate(`/centers/${c.id}`)}
                  />
                ))}
              </Box>
            )}
          </Section>

          {/* Billing snapshot */}
          {billing.data && (
            <Card sx={{ mt: 2.5, borderRadius: '16px' }}>
              <CardContent sx={{ p: '0 !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', px: 3, py: 2.5, borderBottom: `1px solid ${BRAND.divider}` }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 15, color: BRAND.textPrimary, flex: 1 }}>
                    Billing Snapshot
                  </Typography>
                  <ButtonBase onClick={() => navigate('/billing')} sx={{ borderRadius: '8px', px: 1.5, py: 0.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.primary }}>Details</Typography>
                  </ButtonBase>
                </Box>
                <Grid container sx={{ px: 3, py: 2.5 }}>
                  {[
                    { label: 'MRR',             val: fmt(billing.data.mrr),                color: BRAND.primary },
                    { label: 'Outstanding',     val: fmt(billing.data.outstanding_amount),  color: billing.data.outstanding_amount > 0 ? '#D97706' : BRAND.textPrimary },
                    { label: 'Overdue',         val: fmt(billing.data.overdue_amount),      color: billing.data.overdue_amount > 0 ? '#DC2626' : BRAND.textPrimary },
                    { label: 'Billed Students', val: billing.data.billed_students,          color: BRAND.textPrimary },
                  ].map((item, i) => (
                    <Grid key={i} item xs={6} sm={3}>
                      <Box sx={{ pr: 2 }}>
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                          {item.label}
                        </Typography>
                        <Typography sx={{ fontSize: 20, fontWeight: 800, color: item.color }}>
                          {item.val}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* RIGHT */}
        <Grid item xs={12} lg={4}>
          <Section title="Needs Attention">
            <ActionRow
              icon={<CenterIcon sx={{ fontSize: 18 }} />}
              label="Center Applications"
              count={queueTotal}
              color={BRAND.primary}
              onClick={() => navigate('/centers')}
            />
            <ActionRow
              icon={<ContentIcon sx={{ fontSize: 18 }} />}
              label="Posts to Moderate"
              count={posts.data?.total}
              color={STATUS_COLORS.underReview}
              onClick={() => navigate('/content')}
            />
            <ActionRow
              icon={<MergeIcon sx={{ fontSize: 18 }} />}
              label="Duplicate Students"
              count={dupes.data?.total}
              color={BRAND.accent}
              onClick={() => navigate('/students')}
            />
            <ActionRow
              icon={<UnlinkIcon sx={{ fontSize: 18 }} />}
              label="Unlink Requests"
              count={unlinks.data?.total}
              color={STATUS_COLORS.suspended}
              onClick={() => navigate('/unlink-requests')}
            />
            {billing.data && billing.data.overdue_amount > 0 && (
              <ActionRow
                icon={<ReceiptIcon sx={{ fontSize: 18 }} />}
                label="Overdue Invoices"
                color={STATUS_COLORS.rejected}
                onClick={() => navigate('/billing/invoices')}
              />
            )}
          </Section>

          {/* Platform stats */}
          <Card sx={{ mt: 2.5, borderRadius: '16px' }}>
            <CardContent sx={{ p: '0 !important' }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${BRAND.divider}` }}>
                <Typography sx={{ fontWeight: 700, fontSize: 15, color: BRAND.textPrimary }}>
                  Platform Stats
                </Typography>
              </Box>
              <Box sx={{ px: 3, py: 2 }}>
                {[
                  { icon: <CenterIcon  sx={{ fontSize: 16 }} />, label: 'Total Centers',    val: statsLoading ? null : approvedCnt + suspendedCnt, color: BRAND.primary,          bg: BRAND.primaryBg },
                  { icon: <ApprovedIcon sx={{ fontSize: 16 }} />, label: 'Active',          val: statsLoading ? null : approvedCnt,  color: STATUS_COLORS.approved,  bg: '#F0FDF4' },
                  { icon: <BlockIcon   sx={{ fontSize: 16 }} />, label: 'Suspended',        val: statsLoading ? null : suspendedCnt, color: STATUS_COLORS.suspended, bg: '#FDF4FF' },
                  { icon: <PeopleIcon  sx={{ fontSize: 16 }} />, label: 'Billed Students',  val: billing.data?.billed_students ?? null, color: BRAND.accent, bg: `${BRAND.accent}18` },
                ].map((row, i) => (
                  <Box key={i}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25 }}>
                      <Avatar sx={{ width: 30, height: 30, bgcolor: row.bg, color: row.color, borderRadius: '8px' }}>
                        {row.icon}
                      </Avatar>
                      <Typography sx={{ flex: 1, fontSize: 13, color: BRAND.textSecondary, fontWeight: 500 }}>
                        {row.label}
                      </Typography>
                      {row.val === null
                        ? <Skeleton width={28} height={20} />
                        : <Typography sx={{ fontSize: 14, fontWeight: 700, color: BRAND.textPrimary }}>{row.val}</Typography>
                      }
                    </Box>
                    {i < 3 && <Divider sx={{ borderColor: BRAND.divider }} />}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
