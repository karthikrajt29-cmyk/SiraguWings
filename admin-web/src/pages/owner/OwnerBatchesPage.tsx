import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon             from '@mui/icons-material/AddRounded';
import EditRoundedIcon            from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon          from '@mui/icons-material/DeleteRounded';
import GroupsRoundedIcon          from '@mui/icons-material/GroupsRounded';
import PeopleAltRoundedIcon       from '@mui/icons-material/PeopleAltRounded';
import ScheduleRoundedIcon        from '@mui/icons-material/ScheduleRounded';
import CalendarMonthRoundedIcon   from '@mui/icons-material/CalendarMonthRounded';
import CurrencyRupeeRoundedIcon   from '@mui/icons-material/CurrencyRupeeRounded';
import PersonRoundedIcon          from '@mui/icons-material/PersonRounded';
import SearchRoundedIcon          from '@mui/icons-material/SearchRounded';
import GridViewRoundedIcon        from '@mui/icons-material/GridViewRounded';
import TableRowsRoundedIcon       from '@mui/icons-material/TableRowsRounded';
import EventAvailableRoundedIcon  from '@mui/icons-material/EventAvailableRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import {
  listOwnerBatches,
  createOwnerBatch,
  updateOwnerBatch,
  removeOwnerBatch,
  listOwnerTeachers,
  type OwnerBatch,
  type OwnerBatchCreatePayload,
  type OwnerBatchUpdatePayload,
} from '../../api/owner.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import BatchStudentsModal from '../../components/owner/BatchStudentsModal';
import { DialogHeader, DialogFooter } from '../../components/common/DialogHeader';
import { BRAND, STATUS_COLORS } from '../../theme';

// ── Course colour palette (deterministic from name) ───────────────────────────

const COURSE_PALETTES = [
  { bg: '#eff6ff', accent: '#2563eb', border: '#bfdbfe' },
  { bg: '#f0fdf4', accent: '#16a34a', border: '#bbf7d0' },
  { bg: '#fdf4ff', accent: '#9333ea', border: '#e9d5ff' },
  { bg: '#fff7ed', accent: '#ea580c', border: '#fed7aa' },
  { bg: '#f0f9ff', accent: '#0284c7', border: '#bae6fd' },
  { bg: '#fff1f2', accent: '#e11d48', border: '#fecdd3' },
  { bg: '#f7fee7', accent: '#65a30d', border: '#d9f99d' },
  { bg: '#fefce8', accent: '#ca8a04', border: '#fef08a' },
];

function courseColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COURSE_PALETTES[h % COURSE_PALETTES.length];
}

const fmtTime = (t: string) => t.slice(0, 5);
const fmtFee  = (n: number) => n === 0 ? 'Free' : `₹${n.toLocaleString('en-IN')}`;

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2.5, flex: 1 }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography fontSize={22} fontWeight={800} color={color}>{value}</Typography>
        <Typography fontSize={11} fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ── Batch Card (grid view) ────────────────────────────────────────────────────

function BatchCard({
  batch, onEdit, onDelete, onManageStudents, onAttendance,
}: {
  batch: OwnerBatch;
  onEdit: () => void;
  onDelete: () => void;
  onManageStudents: () => void;
  onAttendance: () => void;
}) {
  const pal = courseColor(batch.course_name);
  const fillPct = batch.strength_limit
    ? Math.min(100, Math.round((batch.student_count / batch.strength_limit) * 100))
    : null;
  const isFull = fillPct !== null && fillPct >= 100;

  return (
    <Card sx={{
      borderRadius: '16px',
      border: `1px solid ${batch.is_active ? pal.border : BRAND.divider}`,
      opacity: batch.is_active ? 1 : 0.65,
      transition: 'all .15s',
      overflow: 'hidden',
      '&:hover': { boxShadow: '0 6px 20px rgba(15,30,53,0.09)', transform: 'translateY(-2px)' },
    }}>
      {/* Coloured header strip */}
      <Box sx={{ bgcolor: pal.bg, px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${pal.border}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1} minWidth={0} pr={1}>
            <Typography fontSize={15} fontWeight={700} color={pal.accent} noWrap>
              {batch.course_name}
            </Typography>
            <Typography fontSize={12} color="text.secondary" noWrap>{batch.batch_name}</Typography>
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {isFull && (
              <Chip label="Full" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#fee2e2', color: '#dc2626' }} />
            )}
            <Chip
              label={batch.is_active ? 'Active' : 'Inactive'}
              size="small"
              sx={{
                height: 20, fontSize: 10, fontWeight: 700,
                bgcolor: batch.is_active ? '#dcfce7' : BRAND.surface,
                color:   batch.is_active ? '#16a34a'  : BRAND.textSecondary,
              }}
            />
          </Stack>
        </Stack>

        {/* Student count + fill */}
        <Box mt={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Stack direction="row" alignItems="center" gap={0.75}>
              <PeopleAltRoundedIcon sx={{ fontSize: 13, color: pal.accent }} />
              <Typography fontSize={12} fontWeight={700} color={pal.accent}>
                {batch.student_count} student{batch.student_count !== 1 ? 's' : ''}
              </Typography>
            </Stack>
            {batch.strength_limit && (
              <Typography fontSize={11} color="text.secondary">
                cap {batch.strength_limit}
              </Typography>
            )}
          </Stack>
          {fillPct !== null && (
            <LinearProgress
              variant="determinate"
              value={fillPct}
              sx={{
                height: 5, borderRadius: 3,
                bgcolor: pal.border,
                '& .MuiLinearProgress-bar': {
                  bgcolor: isFull ? '#dc2626' : fillPct > 80 ? '#f59e0b' : pal.accent,
                  borderRadius: 3,
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* Details */}
      <CardContent sx={{ px: 2.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={0.8}>
          <Stack direction="row" alignItems="center" gap={1}>
            <CalendarMonthRoundedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
            <Typography fontSize={12.5} color="text.primary">{batch.class_days}</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <ScheduleRoundedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
            <Typography fontSize={12.5} color="text.primary">
              {fmtTime(batch.start_time)} – {fmtTime(batch.end_time)}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <CurrencyRupeeRoundedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
            <Typography fontSize={12.5} fontWeight={600} color={batch.fee_amount > 0 ? BRAND.primary : 'text.secondary'}>
              {fmtFee(batch.fee_amount)}
              <Typography component="span" fontSize={11} color="text.secondary"> /month</Typography>
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <PersonRoundedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
            <Typography fontSize={12.5} color={batch.teacher_name ? 'text.primary' : 'text.secondary'} noWrap>
              {batch.teacher_name ?? 'Unassigned'}
            </Typography>
          </Stack>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* Actions */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Take attendance">
              <Button
                size="small"
                startIcon={<EventAvailableRoundedIcon sx={{ fontSize: 15 }} />}
                onClick={onAttendance}
                sx={{ fontSize: 11.5, fontWeight: 600, color: '#22c55e', '&:hover': { bgcolor: '#f0fdf4' }, px: 1 }}
              >
                Attend
              </Button>
            </Tooltip>
            <Tooltip title="Manage students">
              <Button
                size="small"
                startIcon={<PeopleAltRoundedIcon sx={{ fontSize: 15 }} />}
                onClick={onManageStudents}
                sx={{ fontSize: 11.5, fontWeight: 600, color: BRAND.primary, '&:hover': { bgcolor: BRAND.primaryBg }, px: 1 }}
              >
                Students
              </Button>
            </Tooltip>
          </Stack>
          <Stack direction="row" spacing={0}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={onEdit}>
                <EditRoundedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" onClick={onDelete}>
                <DeleteRoundedIcon sx={{ fontSize: 17, color: STATUS_COLORS.rejected }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Batch Row (table/list view) ───────────────────────────────────────────────

function BatchRow({
  batch, onEdit, onDelete, onManageStudents, onAttendance,
}: {
  batch: OwnerBatch;
  onEdit: () => void;
  onDelete: () => void;
  onManageStudents: () => void;
  onAttendance: () => void;
}) {
  const pal = courseColor(batch.course_name);
  return (
    <TableRow hover sx={{ opacity: batch.is_active ? 1 : 0.6 }}>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 4, height: 36, borderRadius: 2, bgcolor: pal.accent, flexShrink: 0 }} />
          <Box>
            <Typography fontSize={13} fontWeight={700} color={pal.accent}>{batch.course_name}</Typography>
            <Typography fontSize={11} color="text.secondary">{batch.batch_name}</Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell>
        <Stack direction="row" alignItems="center" gap={0.5}>
          <PeopleAltRoundedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
          <Typography fontSize={12} fontWeight={600}>{batch.student_count}</Typography>
          {batch.strength_limit && (
            <Typography fontSize={11} color="text.secondary">/ {batch.strength_limit}</Typography>
          )}
        </Stack>
      </TableCell>
      <TableCell>
        <Typography fontSize={12}>{batch.class_days}</Typography>
      </TableCell>
      <TableCell>
        <Typography fontSize={12}>{fmtTime(batch.start_time)} – {fmtTime(batch.end_time)}</Typography>
      </TableCell>
      <TableCell>
        <Typography fontSize={12} fontWeight={600} color={batch.fee_amount > 0 ? BRAND.primary : 'text.secondary'}>
          {fmtFee(batch.fee_amount)}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography fontSize={12} color={batch.teacher_name ? 'text.primary' : 'text.secondary'}>
          {batch.teacher_name ?? '—'}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={batch.is_active ? 'Active' : 'Inactive'}
          sx={{
            height: 20, fontSize: 10, fontWeight: 700,
            bgcolor: batch.is_active ? '#dcfce7' : BRAND.surface,
            color:   batch.is_active ? '#16a34a' : BRAND.textSecondary,
          }}
        />
      </TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Attendance"><IconButton size="small" onClick={onAttendance}><EventAvailableRoundedIcon sx={{ fontSize: 16, color: '#22c55e' }} /></IconButton></Tooltip>
          <Tooltip title="Students"><IconButton size="small" onClick={onManageStudents}><PeopleAltRoundedIcon sx={{ fontSize: 16, color: BRAND.primary }} /></IconButton></Tooltip>
          <Tooltip title="Edit"><IconButton size="small" onClick={onEdit}><EditRoundedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" onClick={onDelete}><DeleteRoundedIcon sx={{ fontSize: 16, color: STATUS_COLORS.rejected }} /></IconButton></Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

// ── Batch Form ────────────────────────────────────────────────────────────────

function BatchForm({
  initial, teachers, isEdit, saving, onClose, onSubmit,
}: {
  initial?: Partial<OwnerBatch>;
  teachers: { id: string; name: string }[];
  isEdit: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: OwnerBatchCreatePayload | OwnerBatchUpdatePayload) => void;
}) {
  const [courseName, setCourseName] = useState(initial?.course_name ?? '');
  const [batchName, setBatchName]   = useState(initial?.batch_name ?? '');
  const [classDays, setClassDays]   = useState(initial?.class_days ?? 'Mon-Fri');
  const [startTime, setStartTime]   = useState(initial?.start_time?.slice(0, 5) ?? '09:00');
  const [endTime, setEndTime]       = useState(initial?.end_time?.slice(0, 5) ?? '10:00');
  const [strength, setStrength]     = useState<string>(
    initial?.strength_limit !== undefined && initial?.strength_limit !== null ? String(initial.strength_limit) : '',
  );
  const [fee, setFee]               = useState(String(initial?.fee_amount ?? 0));
  const [teacherId, setTeacherId]   = useState(initial?.teacher_id ?? '');
  const [isActive, setIsActive]     = useState(initial?.is_active ?? true);

  const valid = courseName.trim() && batchName.trim() && classDays && startTime && endTime;

  const submit = () => {
    if (!valid) return;
    const base = {
      course_name: courseName.trim(),
      batch_name:  batchName.trim(),
      class_days:  classDays,
      start_time:  startTime.length === 5 ? `${startTime}:00` : startTime,
      end_time:    endTime.length === 5   ? `${endTime}:00`   : endTime,
      strength_limit: strength ? Number(strength) : null,
      fee_amount:  Number(fee) || 0,
      teacher_id:  teacherId || null,
    };
    onSubmit(isEdit ? { ...base, is_active: isActive } : base as OwnerBatchCreatePayload);
  };

  return (
    <>
      <DialogHeader
        icon={isEdit ? <EditRoundedIcon sx={{ fontSize: 20 }} /> : <GroupsRoundedIcon sx={{ fontSize: 20 }} />}
        title={isEdit ? 'Edit Batch' : 'Create Batch'}
        onClose={onClose}
        disabled={saving}
      />
      <DialogContent sx={{ py: 2.5 }}>
        <Stack gap={2}>
          <Stack direction="row" gap={2}>
            <TextField label="Course name" size="small" value={courseName} onChange={(e) => setCourseName(e.target.value)} fullWidth autoFocus />
            <TextField label="Batch name"  size="small" value={batchName}  onChange={(e) => setBatchName(e.target.value)}  fullWidth />
          </Stack>
          <Stack direction="row" gap={2}>
            <TextField label="Class days" size="small" value={classDays} onChange={(e) => setClassDays(e.target.value)} fullWidth helperText="e.g. Mon-Fri or Sat,Sun" />
            <TextField label="Start time" size="small" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="End time"   size="small" type="time" value={endTime}   onChange={(e) => setEndTime(e.target.value)}   InputLabelProps={{ shrink: true }} fullWidth />
          </Stack>
          <Stack direction="row" gap={2}>
            <TextField label="Strength cap (optional)" size="small" type="number" value={strength} onChange={(e) => setStrength(e.target.value)} fullWidth />
            <TextField label="Fee amount (₹)"          size="small" type="number" value={fee}      onChange={(e) => setFee(e.target.value)}       fullWidth />
          </Stack>
          <TextField select size="small" label="Teacher (optional)" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} fullWidth>
            <MenuItem value="">Unassigned</MenuItem>
            {teachers.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </TextField>
          {isEdit && (
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ border: `1px solid ${BRAND.divider}`, borderRadius: 2, px: 2, py: 1 }}>
              <Box>
                <Typography fontSize={13.5} fontWeight={600}>Active</Typography>
                <Typography fontSize={11.5} color={BRAND.textSecondary}>Inactive batches stop accepting new attendance.</Typography>
              </Box>
              <Switch checked={isActive} onChange={(_, v) => setIsActive(v)} />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose} disabled={saving} sx={{ color: BRAND.textSecondary, fontSize: 13 }}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={13} color="inherit" /> : isEdit ? <EditRoundedIcon /> : <AddRoundedIcon />}
          onClick={submit}
          disabled={!valid || saving}
          sx={{
            fontSize: 13, fontWeight: 600, px: 2.5,
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
          }}
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create batch'}
        </Button>
      </DialogFooter>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OwnerBatchesPage() {
  const { centerId, centers } = useOwnerCenter();
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const navigate = useNavigate();

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode]         = useState<'grid' | 'list'>('grid');
  const [adding, setAdding]             = useState(false);
  const [editing, setEditing]           = useState<OwnerBatch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OwnerBatch | null>(null);
  const [studentsTarget, setStudentsTarget] = useState<OwnerBatch | null>(null);

  const centerName = centers.find((c) => c.id === centerId)?.name ?? '';

  const batchesQuery = useQuery({
    queryKey: ['owner', 'batches', centerId],
    queryFn: () => listOwnerBatches(centerId!),
    enabled: !!centerId,
  });

  const teachersQuery = useQuery({
    queryKey: ['owner', 'teachers', centerId],
    queryFn: () => listOwnerTeachers(centerId!),
    enabled: !!centerId,
  });

  const teacherOptions = useMemo(
    () => (teachersQuery.data ?? []).filter((t) => t.is_active).map((t) => ({ id: t.id, name: t.name })),
    [teachersQuery.data],
  );

  const filtered = useMemo(() => {
    let list = batchesQuery.data ?? [];
    if (statusFilter === 'active')   list = list.filter((b) => b.is_active);
    if (statusFilter === 'inactive') list = list.filter((b) => !b.is_active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.course_name.toLowerCase().includes(q) ||
        b.batch_name.toLowerCase().includes(q) ||
        (b.teacher_name ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [batchesQuery.data, search, statusFilter]);

  const createMut = useMutation({
    mutationFn: (data: OwnerBatchCreatePayload) => createOwnerBatch(centerId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner', 'batches', centerId] }); showSnack('Batch created', 'success'); setAdding(false); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: OwnerBatchUpdatePayload }) => updateOwnerBatch(centerId!, vars.id, vars.payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner', 'batches', centerId] }); showSnack('Batch updated', 'success'); setEditing(null); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeOwnerBatch(centerId!, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner', 'batches', centerId] }); showSnack('Batch removed', 'success'); setDeleteTarget(null); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  if (!centerId) {
    return (
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: '32px !important', textAlign: 'center' }}>
          <Typography color={BRAND.textSecondary}>Select a center to manage its batches.</Typography>
        </CardContent>
      </Card>
    );
  }

  const allBatches = batchesQuery.data ?? [];
  const totalStudents = allBatches.reduce((s, b) => s + b.student_count, 0);
  const monthlyRevenue = allBatches.filter((b) => b.is_active).reduce((s, b) => s + b.fee_amount * b.student_count, 0);
  const activeCount = allBatches.filter((b) => b.is_active).length;

  const goAttendance = (b: OwnerBatch) =>
    navigate(`/owner/attendance?batchId=${b.id}&batchName=${encodeURIComponent(b.course_name + ' — ' + b.batch_name)}`);

  return (
    <Box>
      {/* ── Header ── */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography fontSize={22} fontWeight={700} color={BRAND.textPrimary}>Batches</Typography>
          <Typography fontSize={13.5} color={BRAND.textSecondary} mt={0.5}>{centerName}</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setAdding(true)}
          sx={{
            fontWeight: 700, px: 2.5, borderRadius: '10px',
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
          }}
        >
          Create Batch
        </Button>
      </Stack>

      {/* ── Stats row ── */}
      {!batchesQuery.isLoading && allBatches.length > 0 && (
        <Stack direction="row" spacing={1.5} mb={3} flexWrap="wrap">
          <StatTile label="Total Batches"   value={allBatches.length} color={BRAND.primary} />
          <StatTile label="Active"          value={activeCount}       color="#22c55e" />
          <StatTile label="Total Students"  value={totalStudents}     color="#6366f1" />
          <StatTile label="Est. Revenue/mo" value={monthlyRevenue === 0 ? '—' : `₹${monthlyRevenue.toLocaleString('en-IN')}`} color="#f59e0b" />
        </Stack>
      )}

      {/* ── Filters + view toggle ── */}
      <Card variant="outlined" sx={{ borderRadius: '12px', mb: 2.5 }}>
        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search course, batch, teacher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 220 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
              }}
            />
            <Stack direction="row" spacing={0.5}>
              {(['all', 'active', 'inactive'] as const).map((s) => (
                <Chip
                  key={s}
                  label={s.charAt(0).toUpperCase() + s.slice(1)}
                  size="small"
                  clickable
                  variant={statusFilter === s ? 'filled' : 'outlined'}
                  color={statusFilter === s ? 'primary' : 'default'}
                  onClick={() => setStatusFilter(s)}
                  sx={{ fontSize: 12 }}
                />
              ))}
            </Stack>
            <Divider orientation="vertical" flexItem />
            <Stack direction="row" spacing={0}>
              <Tooltip title="Grid view">
                <IconButton size="small" onClick={() => setViewMode('grid')} sx={{ color: viewMode === 'grid' ? BRAND.primary : 'text.secondary' }}>
                  <GridViewRoundedIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="List view">
                <IconButton size="small" onClick={() => setViewMode('list')} sx={{ color: viewMode === 'list' ? BRAND.primary : 'text.secondary' }}>
                  <TableRowsRoundedIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Content ── */}
      {batchesQuery.isLoading ? (
        <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress size={28} sx={{ color: BRAND.primary }} /></Box>
      ) : filtered.length === 0 ? (
        <Card sx={{ borderRadius: '16px' }}>
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: BRAND.primaryBg, color: BRAND.primary, mx: 'auto', mb: 1.5, borderRadius: '14px' }}>
              <GroupsRoundedIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Typography fontSize={15} fontWeight={600} color={BRAND.textPrimary}>
              {allBatches.length === 0 ? 'No batches yet' : 'No batches match your filter'}
            </Typography>
            {allBatches.length === 0 && (
              <Typography fontSize={13} color={BRAND.textSecondary} mt={0.75}>
                Click "Create Batch" to add your first class.
              </Typography>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {filtered.map((b) => (
            <Grid key={b.id} item xs={12} sm={6} md={4}>
              <BatchCard
                batch={b}
                onEdit={() => setEditing(b)}
                onDelete={() => setDeleteTarget(b)}
                onManageStudents={() => setStudentsTarget(b)}
                onAttendance={() => goAttendance(b)}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card variant="outlined" sx={{ borderRadius: '14px', overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  {['Batch', 'Students', 'Days', 'Schedule', 'Fee', 'Teacher', 'Status', ''].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: 'text.secondary', py: 1.25 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((b) => (
                  <BatchRow
                    key={b.id}
                    batch={b}
                    onEdit={() => setEditing(b)}
                    onDelete={() => setDeleteTarget(b)}
                    onManageStudents={() => setStudentsTarget(b)}
                    onAttendance={() => goAttendance(b)}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* ── Dialogs ── */}
      <Dialog open={adding} onClose={() => setAdding(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <BatchForm isEdit={false} teachers={teacherOptions} saving={createMut.isPending} onClose={() => setAdding(false)} onSubmit={(d) => createMut.mutate(d as OwnerBatchCreatePayload)} />
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        {editing && (
          <BatchForm isEdit initial={editing} teachers={teacherOptions} saving={updateMut.isPending} onClose={() => setEditing(null)} onSubmit={(d) => updateMut.mutate({ id: editing.id, payload: d as OwnerBatchUpdatePayload })} />
        )}
      </Dialog>

      <BatchStudentsModal
        open={!!studentsTarget}
        onClose={() => setStudentsTarget(null)}
        centerId={centerId}
        batchId={studentsTarget?.id ?? null}
        batchName={studentsTarget ? `${studentsTarget.course_name} — ${studentsTarget.batch_name}` : ''}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete batch?"
        message={deleteTarget ? `Delete "${deleteTarget.course_name} – ${deleteTarget.batch_name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        confirmColor="error"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeMut.mutate(deleteTarget.id)}
        loading={removeMut.isPending}
      />
    </Box>
  );
}
