import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  Checkbox,
  CircularProgress,
  Grid,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchRoundedIcon       from '@mui/icons-material/SearchRounded';
import ChecklistRoundedIcon    from '@mui/icons-material/ChecklistRounded';
import AddRoundedIcon          from '@mui/icons-material/AddRounded';
import LocationOnRoundedIcon   from '@mui/icons-material/LocationOnRounded';
import PersonRoundedIcon       from '@mui/icons-material/PersonRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bulkApproveCenters, getCenters, type CenterSummary } from '../../api/centers.api';
import StatusChip    from '../../components/common/StatusChip';
import SlaChip       from '../../components/common/SlaChip';
import AddCenterModal from '../../components/center/AddCenterModal';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND }     from '../../theme';

const PAGE_SIZE = 12;

/* order: pending-first, All at the end */
const STATUS_TABS = [
  { key: 'Submitted',   label: 'Submitted' },
  { key: 'UnderReview', label: 'Under Review' },
  { key: 'Approved',    label: 'Approved' },
  { key: 'Rejected',    label: 'Rejected' },
  { key: 'Suspended',   label: 'Suspended' },
  { key: 'All',         label: 'All' },
] as const;

type StatusKey = typeof STATUS_TABS[number]['key'];

/* ── Category → gradient ── */
const CAT_COLORS: Record<string, [string, string]> = {
  Tuition:          ['#1E3A5F', '#2D5282'],
  Daycare:          ['#065F46', '#0D7857'],
  KidsSchool:       ['#4C1D95', '#6D28D9'],
  PlaySchool:       ['#7C3AED', '#A855F7'],
  Dance:            ['#9D174D', '#DB2777'],
  Bharatanatyam:    ['#9D174D', '#BE185D'],
  Music:            ['#1E40AF', '#3B82F6'],
  CarnaticMusic:    ['#1E40AF', '#2563EB'],
  WesternMusic:     ['#1D4ED8', '#3B82F6'],
  KeyboardPiano:    ['#0F172A', '#1E3A5F'],
  Guitar:           ['#78350F', '#D97706'],
  ArtPainting:      ['#92400E', '#D97706'],
  DrawingSketching: ['#92400E', '#B45309'],
  Abacus:           ['#1F2937', '#374151'],
  VedicMaths:       ['#1F2937', '#4B5563'],
  SpokenEnglish:    ['#0369A1', '#0EA5E9'],
  LanguageClasses:  ['#0369A1', '#0284C7'],
  YogaActivity:     ['#065F46', '#059669'],
  Karate:           ['#7F1D1D', '#DC2626'],
  Swimming:         ['#0C4A6E', '#0284C7'],
  Chess:            ['#1C1917', '#44403C'],
  RoboticsCoding:   ['#1E1B4B', '#4338CA'],
  Phonics:          ['#164E63', '#0891B2'],
  Montessori:       ['#14532D', '#16A34A'],
  CookingClasses:   ['#7C2D12', '#EA580C'],
  CraftDIY:         ['#4A1D96', '#7C3AED'],
  TheatreDrama:     ['#831843', '#BE185D'],
};

/* ── Grid skeleton ── */
function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
          <Box sx={{ borderRadius: 3, overflow: 'hidden', border: `1px solid ${BRAND.divider}` }}>
            <Skeleton variant="rectangular" height={88} />
            <Box sx={{ p: 2 }}>
              <Skeleton variant="circular" width={44} height={44} sx={{ mt: -2.75, mb: 1 }} />
              <Skeleton variant="text" width="72%" height={16} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="52%" height={13} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="40%" height={13} sx={{ mb: 1.25 }} />
              <Skeleton variant="rectangular" height={22} width={76} sx={{ borderRadius: 3 }} />
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

/* ── Single center card ── */
function CenterCard({
  center, checked, onCheck, onClick,
}: {
  center: CenterSummary;
  checked: boolean;
  onCheck: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const [c1, c2] = CAT_COLORS[center.category] ?? ['#1E3A5F', '#2D5282'];
  const initials = center.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const isSubmitted = center.registration_status === 'Submitted';

  return (
    <Card sx={{
      borderRadius: 3,
      border: `1.5px solid ${checked ? BRAND.primary + '70' : BRAND.divider}`,
      boxShadow: checked ? `0 0 0 3px ${BRAND.primary}20` : '0 1px 4px rgba(15,30,53,0.06)',
      transition: 'all 0.15s',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      height: '100%',
      '&:hover': {
        boxShadow: '0 6px 24px rgba(15,30,53,0.13)',
        transform: 'translateY(-2px)',
        borderColor: checked ? BRAND.primary + '70' : `${BRAND.primary}30`,
      },
    }}>
      {/* Colour banner */}
      <Box sx={{
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
        px: 2, pt: 1.5, pb: 3.5,
        position: 'relative', minHeight: 80,
      }}>
        {isSubmitted && (
          <Box onClick={onCheck} sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
            <Checkbox
              size="small" checked={checked}
              sx={{
                p: 0.25,
                bgcolor: checked ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)',
                borderRadius: 1,
                color: checked ? BRAND.primary : 'rgba(255,255,255,0.7)',
                '&.Mui-checked': { color: BRAND.primary },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' },
              }}
            />
          </Box>
        )}

        {center.is_approaching_sla && (
          <Tooltip title={`Approaching SLA — ${center.hours_since_submission}h elapsed`}>
            <Box sx={{
              position: 'absolute', top: 8, right: 8,
              bgcolor: 'rgba(245,158,11,0.28)', borderRadius: '50%',
              width: 26, height: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <WarningAmberRoundedIcon sx={{ fontSize: 14, color: '#FCD34D' }} />
            </Box>
          </Tooltip>
        )}

        <Box sx={{ position: 'absolute', bottom: 8, left: 12 }}>
          <Typography sx={{
            fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.65)',
            textTransform: 'uppercase', letterSpacing: 0.7,
          }}>
            {center.category.replace(/([A-Z])/g, ' $1').trim()}
          </Typography>
        </Box>
      </Box>

      {/* Body */}
      <CardActionArea onClick={onClick} sx={{ flex: 1, alignItems: 'flex-start', '&:hover': { bgcolor: 'transparent' } }}>
        <Box sx={{ px: 2, pt: 0, pb: 2 }}>
          <Avatar sx={{
            width: 44, height: 44,
            border: '3px solid #fff',
            boxShadow: '0 2px 10px rgba(15,30,53,0.18)',
            background: `linear-gradient(135deg, ${c1}, ${c2})`,
            fontSize: 14, fontWeight: 800, color: '#fff',
            mt: -2.75, mb: 1,
          }}>
            {initials}
          </Avatar>

          <Typography sx={{
            fontSize: 13, fontWeight: 700, color: BRAND.textPrimary, lineHeight: 1.35, mb: 0.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {center.name}
          </Typography>

          <Stack direction="row" alignItems="center" gap={0.5} mb={0.4}>
            <PersonRoundedIcon sx={{ fontSize: 11, color: BRAND.textSecondary, flexShrink: 0 }} />
            <Typography sx={{
              fontSize: 11, color: BRAND.textSecondary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {center.owner_name}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" gap={0.5} mb={1.25}>
            <LocationOnRoundedIcon sx={{ fontSize: 11, color: BRAND.textSecondary, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
              {center.city}
            </Typography>
          </Stack>

          <Stack direction="row" gap={0.6} flexWrap="wrap">
            <StatusChip status={center.registration_status} />
            {center.is_approaching_sla && <SlaChip hours={center.hours_since_submission ?? 0} />}
          </Stack>
        </Box>
      </CardActionArea>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */
export default function CenterQueuePage() {
  const [activeStatus, setActiveStatus] = useState<StatusKey>('Submitted');
  const [checked, setChecked]           = useState<string[]>([]);
  const [search, setSearch]             = useState('');
  const [addOpen, setAddOpen]           = useState(false);
  const navigate      = useNavigate();
  const { showSnack } = useSnackbar();
  const qc            = useQueryClient();
  const sentinelRef   = useRef<HTMLDivElement>(null);

  const statusFilter = activeStatus === 'All' ? undefined : activeStatus;

  /* ── Infinite query: page=0,1,2… each PAGE_SIZE ── */
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['centers-inf', statusFilter],
    queryFn: ({ pageParam = 0 }) =>
      getCenters({ status: statusFilter, page: pageParam as number, size: PAGE_SIZE }),
    getNextPageParam: (last) =>
      last.page + 1 < last.total_pages ? last.page + 1 : undefined,
    initialPageParam: 0,
  });

  /* ── Submitted count for badge (single lightweight query) ── */
  const { data: submittedData } = useQuery({
    queryKey: ['centers', 'Submitted'],
    queryFn: () => getCenters({ status: 'Submitted', size: 1 }),
  });
  const submittedCount = submittedData?.total ?? 0;

  /* Flatten all pages */
  const allCenters: CenterSummary[] = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const totalCount = data?.pages[0]?.total ?? 0;

  /* Client-side search filter */
  const centers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCenters;
    return allCenters.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.owner_name.toLowerCase().includes(q) ||
      (c.city ?? '').toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q),
    );
  }, [allCenters, search]);

  /* ── Intersection observer for infinite scroll ── */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /* Reset checked on status change */
  const handleStatusChange = (s: StatusKey) => {
    setActiveStatus(s);
    setChecked([]);
    setSearch('');
  };

  /* Bulk approve */
  const bulkMut = useMutation({
    mutationFn: () => bulkApproveCenters(checked),
    onSuccess: () => {
      showSnack(`${checked.length} center(s) approved`, 'success');
      setChecked([]);
      qc.invalidateQueries({ queryKey: ['centers-inf'] });
      qc.invalidateQueries({ queryKey: ['centers'] });
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const toggleCheck = (id: string) =>
    setChecked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <Box>
      {/* ── Page header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5} flexWrap="wrap" gap={1.5}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.25 }}>Centers</Typography>
          <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>
            {isLoading ? '…' : totalCount} total · {submittedCount} pending review
          </Typography>
        </Box>
        <Stack direction="row" gap={1.5}>
          {checked.length > 0 && (
            <Button
              variant="contained"
              startIcon={<ChecklistRoundedIcon />}
              onClick={() => bulkMut.mutate()}
              disabled={bulkMut.isPending}
              sx={{
                background: 'linear-gradient(135deg, #16A34A, #15803D)',
                '&:hover': { background: 'linear-gradient(135deg, #15803D, #166534)' },
              }}
            >
              {bulkMut.isPending ? 'Approving…' : `Bulk Approve (${checked.length})`}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setAddOpen(true)}
            sx={{
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
            }}
          >
            Add Center
          </Button>
        </Stack>
      </Stack>

      {/* ── Filter bar ── */}
      <Stack direction="row" alignItems="center" gap={1.5} mb={2.5} flexWrap="wrap">

        {/* Pill tabs */}
        <Stack direction="row" gap={0.75} flexWrap="wrap">
          {STATUS_TABS.map(({ key, label }) => {
            const isActive = activeStatus === key;
            const showBadge = key === 'Submitted' && submittedCount > 0;
            return (
              <Box
                key={key}
                onClick={() => handleStatusChange(key)}
                sx={{
                  position: 'relative',
                  display: 'inline-flex', alignItems: 'center',
                  px: 1.75, py: 0.6,
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#fff' : BRAND.textSecondary,
                  bgcolor: isActive
                    ? BRAND.primary
                    : 'transparent',
                  border: `1.5px solid ${isActive ? BRAND.primary : BRAND.divider}`,
                  transition: 'all 0.15s',
                  userSelect: 'none',
                  '&:hover': {
                    bgcolor: isActive ? BRAND.primaryDark : BRAND.primaryBg,
                    borderColor: BRAND.primary,
                    color: isActive ? '#fff' : BRAND.primary,
                  },
                }}
              >
                {label}
                {showBadge && (
                  <Box sx={{
                    ml: 0.75,
                    minWidth: 18, height: 18,
                    borderRadius: '9px',
                    bgcolor: isActive ? 'rgba(255,255,255,0.3)' : BRAND.primary,
                    color: '#fff',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    px: 0.5,
                  }}>
                    {submittedCount}
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search name, owner, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 15, color: BRAND.textSecondary }} />
              </InputAdornment>
            ),
          }}
          sx={{
            ml: 'auto',
            width: 240,
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px', fontSize: 13, bgcolor: '#fff',
              '& fieldset': { borderColor: BRAND.divider },
              '&:hover fieldset': { borderColor: `${BRAND.primary}50` },
              '&.Mui-focused fieldset': { borderColor: BRAND.primary },
            },
            '& .MuiInputBase-input': { py: '6px' },
          }}
        />
      </Stack>

      {/* Bulk approve hint */}
      {activeStatus === 'Submitted' && submittedCount > 0 && checked.length === 0 && !isLoading && (
        <Box sx={{
          mb: 2, px: 2, py: 0.75, borderRadius: 2,
          bgcolor: `${BRAND.primary}08`, border: `1px dashed ${BRAND.primary}35`,
          display: 'inline-flex', alignItems: 'center', gap: 1,
        }}>
          <ChecklistRoundedIcon sx={{ fontSize: 13, color: BRAND.primary }} />
          <Typography sx={{ fontSize: 12, color: BRAND.primary }}>
            Tick the checkbox on cards to bulk approve
          </Typography>
        </Box>
      )}

      {/* ── Results count ── */}
      {!isLoading && centers.length > 0 && (
        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mb: 1.5 }}>
          Showing {centers.length} of {totalCount}{search && ` · filtered by "${search}"`}
        </Typography>
      )}

      {/* ── Grid ── */}
      {isLoading ? (
        <GridSkeleton count={12} />
      ) : centers.length === 0 ? (
        <Box sx={{ py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '16px', bgcolor: BRAND.primaryBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SearchRoundedIcon sx={{ fontSize: 24, color: BRAND.primary }} />
          </Box>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: BRAND.textPrimary }}>
            No centers found
          </Typography>
          <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>
            {search ? `No results for "${search}"` : `No centers with status "${activeStatus}".`}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {centers.map((center) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={center.id}>
              <CenterCard
                center={center}
                checked={checked.includes(center.id)}
                onCheck={(e) => { e.stopPropagation(); toggleCheck(center.id); }}
                onClick={() => navigate(`/centers/${center.id}`)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Infinite scroll sentinel ── */}
      <Box ref={sentinelRef} sx={{ mt: 3, display: 'flex', justifyContent: 'center', minHeight: 40 }}>
        {isFetchingNextPage && (
          <Stack direction="row" alignItems="center" gap={1.5}>
            <CircularProgress size={18} sx={{ color: BRAND.primary }} />
            <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>Loading more…</Typography>
          </Stack>
        )}
        {!hasNextPage && !isLoading && centers.length > 0 && (
          <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
            All {totalCount} centers loaded
          </Typography>
        )}
      </Box>

      <AddCenterModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(id) => { setAddOpen(false); navigate(`/centers/${id}`); }}
      />
    </Box>
  );
}
