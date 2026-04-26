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
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon         from '@mui/icons-material/AddRounded';
import EditRoundedIcon        from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon      from '@mui/icons-material/DeleteRounded';
import GroupsRoundedIcon      from '@mui/icons-material/GroupsRounded';
import PeopleAltRoundedIcon   from '@mui/icons-material/PeopleAltRounded';
import ScheduleRoundedIcon    from '@mui/icons-material/ScheduleRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import PersonRoundedIcon      from '@mui/icons-material/PersonRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

function BatchForm({
  initial,
  teachers,
  isEdit,
  saving,
  onClose,
  onSubmit,
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
    initial?.strength_limit !== undefined && initial?.strength_limit !== null
      ? String(initial.strength_limit)
      : '',
  );
  const [fee, setFee]               = useState(String(initial?.fee_amount ?? 0));
  const [teacherId, setTeacherId]   = useState(initial?.teacher_id ?? '');
  const [isActive, setIsActive]     = useState(initial?.is_active ?? true);

  const valid = courseName.trim() && batchName.trim() && classDays && startTime && endTime;

  const submit = () => {
    if (!valid) return;
    const base = {
      course_name: courseName.trim(),
      batch_name: batchName.trim(),
      class_days: classDays,
      start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
      end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
      strength_limit: strength ? Number(strength) : null,
      fee_amount: Number(fee) || 0,
      teacher_id: teacherId || null,
    };
    if (isEdit) {
      onSubmit({ ...base, is_active: isActive });
    } else {
      onSubmit(base as OwnerBatchCreatePayload);
    }
  };

  return (
    <>
      <DialogHeader
        icon={isEdit
          ? <EditRoundedIcon sx={{ fontSize: 20 }} />
          : <GroupsRoundedIcon sx={{ fontSize: 20 }} />}
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
            <TextField label="Strength limit (optional)" size="small" type="number" value={strength} onChange={(e) => setStrength(e.target.value)} fullWidth />
            <TextField label="Fee amount (₹)" size="small" type="number" value={fee} onChange={(e) => setFee(e.target.value)} fullWidth />
          </Stack>
          <TextField select size="small" label="Teacher (optional)" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} fullWidth>
            <MenuItem value="">Unassigned</MenuItem>
            {teachers.map((t) => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </TextField>
          {isEdit && (
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{
              border: `1px solid ${BRAND.divider}`, borderRadius: 2, px: 2, py: 1,
            }}>
              <Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Active</Typography>
                <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
                  Inactive batches stop accepting new attendance.
                </Typography>
              </Box>
              <Switch checked={isActive} onChange={(_, v) => setIsActive(v)} />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose} disabled={saving} sx={{ color: BRAND.textSecondary, fontSize: 13 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving
            ? <CircularProgress size={13} color="inherit" />
            : isEdit ? <EditRoundedIcon /> : <AddRoundedIcon />}
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

function BatchCard({
  batch,
  onEdit,
  onDelete,
  onManageStudents,
}: {
  batch: OwnerBatch;
  onEdit: () => void;
  onDelete: () => void;
  onManageStudents: () => void;
}) {
  return (
    <Card sx={{
      borderRadius: '14px',
      transition: 'all .15s',
      opacity: batch.is_active ? 1 : 0.7,
      '&:hover': {
        boxShadow: '0 4px 14px rgba(15,30,53,0.08)',
        transform: 'translateY(-1px)',
      },
    }}>
      <CardContent sx={{ p: '20px !important' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: BRAND.textPrimary }} noWrap>
              {batch.course_name}
            </Typography>
            <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
              {batch.batch_name}
            </Typography>
          </Box>
          <Chip
            label={batch.is_active ? 'Active' : 'Inactive'}
            size="small"
            sx={{
              height: 22, fontSize: 11, fontWeight: 700,
              bgcolor: batch.is_active ? '#ECFDF5' : BRAND.surface,
              color: batch.is_active ? STATUS_COLORS.approved : BRAND.textSecondary,
            }}
          />
        </Stack>

        <Divider sx={{ my: 1 }} />

        <Stack gap={0.75}>
          <Stack direction="row" alignItems="center" gap={1}>
            <CalendarMonthRoundedIcon sx={{ fontSize: 14, color: BRAND.textSecondary }} />
            <Typography sx={{ fontSize: 12.5, color: BRAND.textPrimary }}>
              {batch.class_days}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <ScheduleRoundedIcon sx={{ fontSize: 14, color: BRAND.textSecondary }} />
            <Typography sx={{ fontSize: 12.5, color: BRAND.textPrimary }}>
              {batch.start_time.slice(0, 5)} – {batch.end_time.slice(0, 5)}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <CurrencyRupeeRoundedIcon sx={{ fontSize: 14, color: BRAND.textSecondary }} />
            <Typography sx={{ fontSize: 12.5, color: BRAND.textPrimary }}>
              ₹{batch.fee_amount.toLocaleString('en-IN')}
              {batch.strength_limit != null && (
                <span style={{ color: BRAND.textSecondary }}> &middot; cap {batch.strength_limit}</span>
              )}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <PersonRoundedIcon sx={{ fontSize: 14, color: BRAND.textSecondary }} />
            <Typography sx={{ fontSize: 12.5, color: batch.teacher_name ? BRAND.textPrimary : BRAND.textSecondary }}>
              {batch.teacher_name ?? 'Unassigned'}
            </Typography>
          </Stack>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={0.5}>
          <Button
            size="small"
            startIcon={<PeopleAltRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={onManageStudents}
            sx={{
              fontSize: 12, fontWeight: 600,
              color: BRAND.primary,
              '&:hover': { bgcolor: BRAND.primaryBg },
            }}
          >
            Students
          </Button>
          <Stack direction="row" gap={0.5}>
            <Tooltip title="Edit batch">
              <IconButton size="small" onClick={onEdit}>
                <EditRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete batch">
              <IconButton size="small" onClick={onDelete}>
                <DeleteRoundedIcon sx={{ fontSize: 18, color: STATUS_COLORS.rejected }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function OwnerBatchesPage() {
  const { centerId, centers } = useOwnerCenter();
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<OwnerBatch | null>(null);
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
    const list = batchesQuery.data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((b) =>
      b.course_name.toLowerCase().includes(q) ||
      b.batch_name.toLowerCase().includes(q) ||
      (b.teacher_name ?? '').toLowerCase().includes(q),
    );
  }, [batchesQuery.data, search]);

  const createMut = useMutation({
    mutationFn: (data: OwnerBatchCreatePayload) => createOwnerBatch(centerId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'batches', centerId] });
      showSnack('Batch created', 'success');
      setAdding(false);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: OwnerBatchUpdatePayload }) =>
      updateOwnerBatch(centerId!, vars.id, vars.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'batches', centerId] });
      showSnack('Batch updated', 'success');
      setEditing(null);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeOwnerBatch(centerId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'batches', centerId] });
      showSnack('Batch removed', 'success');
      setDeleteTarget(null);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  if (!centerId) {
    return (
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: '32px !important', textAlign: 'center' }}>
          <Typography sx={{ color: BRAND.textSecondary }}>
            Select a center to manage its batches.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const total = batchesQuery.data?.length ?? 0;
  const active = (batchesQuery.data ?? []).filter((b) => b.is_active).length;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: BRAND.textPrimary }}>
            Batches
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
            {centerName} &middot; {active}/{total} active
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setAdding(true)}>
          Create Batch
        </Button>
      </Stack>

      {/* Search */}
      <Card sx={{ borderRadius: '16px', mb: 2 }}>
        <CardContent sx={{ p: '16px !important' }}>
          <TextField
            size="small"
            placeholder="Search by course, batch, or teacher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <GroupsRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Grid */}
      {batchesQuery.isLoading ? (
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress size={28} sx={{ color: BRAND.primary }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Card sx={{ borderRadius: '16px' }}>
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <Avatar sx={{
              width: 56, height: 56, bgcolor: BRAND.primaryBg, color: BRAND.primary,
              mx: 'auto', mb: 1.5, borderRadius: '14px',
            }}>
              <GroupsRoundedIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: BRAND.textPrimary }}>
              {total === 0 ? 'No batches yet' : 'No batches match your search'}
            </Typography>
            {total === 0 && (
              <Typography sx={{ fontSize: 13, color: BRAND.textSecondary, mt: 0.75 }}>
                Click "Create Batch" to add your first class.
              </Typography>
            )}
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((b) => (
            <Grid key={b.id} item xs={12} sm={6} md={4}>
              <BatchCard
                batch={b}
                onEdit={() => setEditing(b)}
                onDelete={() => setDeleteTarget(b)}
                onManageStudents={() => setStudentsTarget(b)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add */}
      <Dialog open={adding} onClose={() => setAdding(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        <BatchForm
          isEdit={false}
          teachers={teacherOptions}
          saving={createMut.isPending}
          onClose={() => setAdding(false)}
          onSubmit={(data) => createMut.mutate(data as OwnerBatchCreatePayload)}
        />
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        {editing && (
          <BatchForm
            isEdit
            initial={editing}
            teachers={teacherOptions}
            saving={updateMut.isPending}
            onClose={() => setEditing(null)}
            onSubmit={(data) => updateMut.mutate({ id: editing.id, payload: data as OwnerBatchUpdatePayload })}
          />
        )}
      </Dialog>

      {/* Manage students */}
      <BatchStudentsModal
        open={!!studentsTarget}
        onClose={() => setStudentsTarget(null)}
        centerId={centerId}
        batchId={studentsTarget?.id ?? null}
        batchName={studentsTarget ? `${studentsTarget.course_name} — ${studentsTarget.batch_name}` : ''}
      />

      {/* Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete batch?"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.course_name} – ${deleteTarget.batch_name}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        confirmColor="error"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeMut.mutate(deleteTarget.id)}
        loading={removeMut.isPending}
      />
    </Box>
  );
}
