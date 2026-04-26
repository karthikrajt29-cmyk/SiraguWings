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
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon          from '@mui/icons-material/AddRounded';
import SearchRoundedIcon       from '@mui/icons-material/SearchRounded';
import DeleteRoundedIcon       from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon         from '@mui/icons-material/EditRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import {
  listOwnerTeachers,
  createOwnerTeacher,
  updateOwnerTeacher,
  removeOwnerTeacher,
  type OwnerTeacher,
} from '../../api/owner.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { BRAND, STATUS_COLORS } from '../../theme';

function AddTeacherDialog({
  open,
  onClose,
  onSubmit,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (mobile: string, specialisation: string) => void;
  saving: boolean;
}) {
  const [mobile, setMobile] = useState('');
  const [spec, setSpec] = useState('');

  const valid = mobile.trim().length >= 6;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Teacher</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={0.5}>
          <Typography sx={{ fontSize: 12.5, color: BRAND.textSecondary }}>
            Enter the teacher's mobile number — they must be a registered SiraguWings user.
            Their existing profile will be linked to this center.
          </Typography>
          <TextField
            label="Mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="Specialisation (optional)"
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            fullWidth
            placeholder="e.g. Mathematics, Bharatanatyam"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => valid && onSubmit(mobile.trim(), spec.trim())}
          disabled={!valid || saving}
        >
          {saving ? 'Adding…' : 'Add teacher'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditTeacherDialog({
  teacher,
  onClose,
  onSubmit,
  saving,
}: {
  teacher: OwnerTeacher | null;
  onClose: () => void;
  onSubmit: (specialisation: string | null, isActive: boolean) => void;
  saving: boolean;
}) {
  const [spec, setSpec] = useState(teacher?.specialisation ?? '');
  const [active, setActive] = useState(teacher?.is_active ?? true);

  if (!teacher) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Edit Teacher</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={0.5}>
          <Box sx={{
            border: `1px solid ${BRAND.divider}`, borderRadius: 2, p: 1.5,
            bgcolor: BRAND.surface,
          }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{teacher.name}</Typography>
            <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
              {teacher.mobile_number}{teacher.email ? ` · ${teacher.email}` : ''}
            </Typography>
          </Box>
          <TextField
            label="Specialisation"
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            fullWidth
          />
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{
            border: `1px solid ${BRAND.divider}`, borderRadius: 2, px: 2, py: 1,
          }}>
            <Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>Active</Typography>
              <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
                Inactive teachers can't be assigned to new batches.
              </Typography>
            </Box>
            <Switch checked={active} onChange={(_, v) => setActive(v)} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={() => onSubmit(spec.trim() || null, active)} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function OwnerTeachersPage() {
  const { centerId, centers } = useOwnerCenter();
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<OwnerTeacher | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OwnerTeacher | null>(null);

  const centerName = centers.find((c) => c.id === centerId)?.name ?? '';

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['owner', 'teachers', centerId],
    queryFn: () => listOwnerTeachers(centerId!),
    enabled: !!centerId,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      (t.email ?? '').toLowerCase().includes(q) ||
      t.mobile_number.includes(q) ||
      (t.specialisation ?? '').toLowerCase().includes(q),
    );
  }, [teachers, search]);

  const createMut = useMutation({
    mutationFn: (vars: { mobile: string; spec: string }) =>
      createOwnerTeacher(centerId!, {
        mobile_number: vars.mobile,
        specialisation: vars.spec || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'teachers', centerId] });
      showSnack('Teacher added', 'success');
      setAdding(false);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; spec: string | null; isActive: boolean }) =>
      updateOwnerTeacher(centerId!, vars.id, {
        specialisation: vars.spec,
        is_active: vars.isActive,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'teachers', centerId] });
      showSnack('Teacher updated', 'success');
      setEditing(null);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeOwnerTeacher(centerId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'teachers', centerId] });
      showSnack('Teacher removed', 'success');
      setDeleteTarget(null);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  if (!centerId) {
    return (
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: '32px !important', textAlign: 'center' }}>
          <Typography sx={{ color: BRAND.textSecondary }}>
            Select a center to manage its teachers.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const active = teachers.filter((t) => t.is_active).length;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: BRAND.textPrimary }}>
            Teachers
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
            {centerName} &middot; {active}/{teachers.length} active
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setAdding(true)}>
          Add Teacher
        </Button>
      </Stack>

      {/* Search */}
      <Card sx={{ borderRadius: '16px', mb: 2 }}>
        <CardContent sx={{ p: '16px !important' }}>
          <TextField
            size="small"
            placeholder="Search by name, mobile, email, or specialisation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Table */}
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress size={28} sx={{ color: BRAND.primary }} />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Avatar sx={{
                width: 56, height: 56, bgcolor: BRAND.primaryBg, color: BRAND.primary,
                mx: 'auto', mb: 1.5, borderRadius: '14px',
              }}>
                <SupervisorAccountRoundedIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
                {teachers.length === 0 ? 'No teachers yet' : 'No teachers match your search'}
              </Typography>
              {teachers.length === 0 && (
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                  Add a teacher by their registered mobile number.
                </Typography>
              )}
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Specialisation</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} hover sx={{ opacity: t.is_active ? 1 : 0.6 }}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1.25}>
                        <Avatar sx={{
                          width: 32, height: 32,
                          bgcolor: BRAND.primaryBg, color: BRAND.primary,
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {t.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                        </Avatar>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{t.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{t.mobile_number}</TableCell>
                    <TableCell>{t.email ?? '—'}</TableCell>
                    <TableCell>{t.specialisation ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={t.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          height: 22, fontSize: 11, fontWeight: 600,
                          bgcolor: t.is_active ? '#ECFDF5' : BRAND.surface,
                          color: t.is_active ? STATUS_COLORS.approved : BRAND.textSecondary,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => setEditing(t)}>
                          <EditRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove from center">
                        <IconButton size="small" onClick={() => setDeleteTarget(t)}>
                          <DeleteRoundedIcon sx={{ fontSize: 18, color: STATUS_COLORS.rejected }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddTeacherDialog
        open={adding}
        onClose={() => setAdding(false)}
        saving={createMut.isPending}
        onSubmit={(mobile, spec) => createMut.mutate({ mobile, spec })}
      />

      <EditTeacherDialog
        teacher={editing}
        onClose={() => setEditing(null)}
        saving={updateMut.isPending}
        onSubmit={(spec, isActive) =>
          editing && updateMut.mutate({ id: editing.id, spec, isActive })
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove teacher?"
        message={
          deleteTarget
            ? `Remove ${deleteTarget.name} from ${centerName}? Their user account stays but they won't have Teacher access at this center.`
            : ''
        }
        confirmLabel="Remove"
        confirmColor="error"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeMut.mutate(deleteTarget.id)}
        loading={removeMut.isPending}
      />
    </Box>
  );
}
