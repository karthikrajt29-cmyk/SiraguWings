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
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon       from '@mui/icons-material/AddRounded';
import SearchRoundedIcon    from '@mui/icons-material/SearchRounded';
import DeleteRoundedIcon    from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon      from '@mui/icons-material/EditRounded';
import SchoolRoundedIcon    from '@mui/icons-material/SchoolRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import {
  listOwnerStudents,
  createOwnerStudent,
  updateOwnerStudent,
  removeOwnerStudent,
  type OwnerStudent,
  type OwnerStudentCreatePayload,
  type OwnerStudentUpdatePayload,
} from '../../api/owner.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { BRAND, STATUS_COLORS } from '../../theme';

const GENDERS = ['Male', 'Female', 'Other'];

function StudentForm({
  initial,
  onSubmit,
  onClose,
  saving,
  isEdit,
}: {
  initial?: Partial<OwnerStudent>;
  onSubmit: (data: OwnerStudentCreatePayload | OwnerStudentUpdatePayload) => void;
  onClose: () => void;
  saving: boolean;
  isEdit: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [dob, setDob] = useState(initial?.date_of_birth ?? '');
  const [gender, setGender] = useState(initial?.gender ?? 'Male');
  const [parentMobile, setParentMobile] = useState(initial?.parent_mobile ?? '');
  const [medical, setMedical] = useState(initial?.medical_notes ?? '');

  const valid = name.trim() && dob && gender;

  const submit = () => {
    if (!valid) return;
    if (isEdit) {
      const update: OwnerStudentUpdatePayload = {};
      if (name !== initial?.name) update.name = name.trim();
      if (dob !== initial?.date_of_birth) update.date_of_birth = dob;
      if (gender !== initial?.gender) update.gender = gender;
      if ((medical || '') !== (initial?.medical_notes || '')) {
        update.medical_notes = medical || null;
      }
      onSubmit(update);
    } else {
      onSubmit({
        name: name.trim(),
        date_of_birth: dob,
        gender,
        parent_mobile: parentMobile.trim() || null,
        medical_notes: medical.trim() || null,
      });
    }
  };

  return (
    <>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {isEdit ? 'Edit Student' : 'Add Student'}
      </DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={0.5}>
          <TextField
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
          />
          <Stack direction="row" gap={2}>
            <TextField
              label="Date of birth"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Gender"
              select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              fullWidth
            >
              {GENDERS.map((g) => (
                <MenuItem key={g} value={g}>{g}</MenuItem>
              ))}
            </TextField>
          </Stack>
          {!isEdit && (
            <TextField
              label="Parent mobile (optional)"
              value={parentMobile}
              onChange={(e) => setParentMobile(e.target.value)}
              helperText="If a parent with this mobile is registered, the student is auto-linked."
              fullWidth
            />
          )}
          <TextField
            label="Medical notes (optional)"
            value={medical}
            onChange={(e) => setMedical(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add student'}
        </Button>
      </DialogActions>
    </>
  );
}

export default function OwnerStudentsPage() {
  const { centerId, centers } = useOwnerCenter();
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [editing, setEditing] = useState<OwnerStudent | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OwnerStudent | null>(null);

  const centerName = centers.find((c) => c.id === centerId)?.name ?? '';

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['owner', 'students', centerId],
    queryFn: () => listOwnerStudents(centerId!),
    enabled: !!centerId,
  });

  const filtered = useMemo(() => {
    let out = students;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.parent_name ?? '').toLowerCase().includes(q) ||
        (s.parent_mobile ?? '').includes(q),
      );
    }
    if (genderFilter) out = out.filter((s) => s.gender === genderFilter);
    return out;
  }, [students, search, genderFilter]);

  const createMut = useMutation({
    mutationFn: (payload: OwnerStudentCreatePayload) => createOwnerStudent(centerId!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'students', centerId] });
      showSnack('Student added', 'success');
      setAdding(false);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: OwnerStudentUpdatePayload }) =>
      updateOwnerStudent(centerId!, vars.id, vars.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'students', centerId] });
      showSnack('Student updated', 'success');
      setEditing(null);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeOwnerStudent(centerId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'students', centerId] });
      showSnack('Student removed', 'success');
      setDeleteTarget(null);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  if (!centerId) {
    return (
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: '32px !important', textAlign: 'center' }}>
          <Typography sx={{ color: BRAND.textSecondary }}>
            Select a center to manage its students.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: BRAND.textPrimary }}>
            Students
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
            {centerName} &middot; {students.length} enrolled
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setAdding(true)}
        >
          Add Student
        </Button>
      </Stack>

      {/* Filters */}
      <Card sx={{ borderRadius: '16px', mb: 2 }}>
        <CardContent sx={{ p: '16px !important' }}>
          <Stack direction="row" gap={2} flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search by name, parent, or mobile…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 280 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              size="small"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              label="Gender"
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">All</MenuItem>
              {GENDERS.map((g) => (
                <MenuItem key={g} value={g}>{g}</MenuItem>
              ))}
            </TextField>
          </Stack>
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
                <SchoolRoundedIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
                {students.length === 0 ? 'No students enrolled yet' : 'No students match your filters'}
              </Typography>
              {students.length === 0 && (
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                  Click "Add Student" to enroll your first student.
                </Typography>
              )}
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Date of birth</TableCell>
                  <TableCell>Gender</TableCell>
                  <TableCell>Parent</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1.25}>
                        <Avatar sx={{
                          width: 32, height: 32,
                          bgcolor: BRAND.primaryBg, color: BRAND.primary,
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {s.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                        </Avatar>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                          {s.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{s.date_of_birth ?? '—'}</TableCell>
                    <TableCell>
                      <Chip label={s.gender ?? '—'} size="small" sx={{ height: 22, fontSize: 11 }} />
                    </TableCell>
                    <TableCell>
                      {s.parent_name ? (
                        <Box>
                          <Typography sx={{ fontSize: 13 }}>{s.parent_name}</Typography>
                          <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                            {s.parent_mobile}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                          Not linked
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={s.status}
                        size="small"
                        sx={{
                          height: 22, fontSize: 11, fontWeight: 600,
                          bgcolor: s.status === 'Active' ? '#ECFDF5' : BRAND.surface,
                          color: s.status === 'Active' ? STATUS_COLORS.approved : BRAND.textSecondary,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => setEditing(s)}>
                          <EditRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove from center">
                        <IconButton size="small" onClick={() => setDeleteTarget(s)}>
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

      {/* Add dialog */}
      <Dialog open={adding} onClose={() => setAdding(false)} maxWidth="sm" fullWidth>
        <StudentForm
          isEdit={false}
          onSubmit={(data) => createMut.mutate(data as OwnerStudentCreatePayload)}
          onClose={() => setAdding(false)}
          saving={createMut.isPending}
        />
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        {editing && (
          <StudentForm
            isEdit
            initial={editing}
            onSubmit={(data) => updateMut.mutate({ id: editing.id, payload: data as OwnerStudentUpdatePayload })}
            onClose={() => setEditing(null)}
            saving={updateMut.isPending}
          />
        )}
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove student?"
        message={
          deleteTarget
            ? `Remove ${deleteTarget.name} from ${centerName}? The student record stays in the system, but they'll no longer be enrolled at this center.`
            : ''
        }
        confirmLabel="Remove"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeMut.mutate(deleteTarget.id)}
        loading={removeMut.isPending}
        confirmColor="error"
      />
    </Box>
  );
}
