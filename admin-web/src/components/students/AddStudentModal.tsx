import {
  Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle,
  Divider, Grid, IconButton, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import CloseRoundedIcon         from '@mui/icons-material/CloseRounded';
import SchoolRoundedIcon        from '@mui/icons-material/SchoolRounded';
import EditRoundedIcon          from '@mui/icons-material/EditRounded';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStudent, updateStudent, type Student, type StudentCreatePayload,
} from '../../api/students.api';
import { createStudentForParent } from '../../api/users.api';
import { getMasterData } from '../../api/masterData.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When provided, the new student is created under this parent (parent_id = parentId). */
  parentId?: string;
  /** When provided, the modal opens in edit mode. */
  editStudent?: Student | null;
}

interface FormState {
  name: string;
  date_of_birth: string;
  gender: string;
  parent_mobile: string;
  medical_notes: string;
}

const EMPTY: FormState = {
  name: '', date_of_birth: '', gender: '', parent_mobile: '', medical_notes: '',
};

type Errors = Partial<Record<keyof FormState, string>>;

export default function AddStudentModal({ open, onClose, parentId, editStudent }: Props) {
  const isEdit = !!editStudent;
  const isParentScoped = !!parentId;
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [errors, setErrors] = useState<Errors>({});
  const { showSnack } = useSnackbar();
  const qc = useQueryClient();

  useEffect(() => {
    if (open && editStudent) {
      setForm({
        name:           editStudent.name,
        date_of_birth:  editStudent.date_of_birth,
        gender:         editStudent.gender,
        parent_mobile:  editStudent.parent_mobile ?? '',
        medical_notes:  editStudent.medical_notes ?? '',
      });
    } else if (open) {
      setForm({ ...EMPTY });
    }
    setErrors({});
  }, [open, editStudent]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const { data: genders = [] } = useQuery({
    queryKey: ['master-data', 'gender'],
    queryFn: () => getMasterData('gender'),
    staleTime: 5 * 60 * 1000,
  });

  const validate = (): boolean => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = 'Required';
    if (!form.date_of_birth) next.date_of_birth = 'Required';
    if (!form.gender) next.gender = 'Required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (): StudentCreatePayload => ({
    name: form.name.trim(),
    date_of_birth: form.date_of_birth,
    gender: form.gender,
    parent_mobile: form.parent_mobile.trim() || null,
    medical_notes: form.medical_notes.trim() || null,
  });

  const createMut = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      if (isParentScoped) {
        return createStudentForParent(parentId!, {
          name: form.name.trim(),
          date_of_birth: form.date_of_birth,
          gender: form.gender,
          medical_notes: form.medical_notes.trim() || null,
        });
      }
      return createStudent(buildPayload());
    },
    onSuccess: () => {
      showSnack(isParentScoped ? 'Student added under parent' : 'Student created', 'success');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student-stats'] });
      if (parentId) qc.invalidateQueries({ queryKey: ['user-students', parentId] });
      handleClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const editMut = useMutation({
    mutationFn: () => updateStudent(editStudent!.id, {
      name: form.name.trim(),
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      medical_notes: form.medical_notes.trim() || null,
    }),
    onSuccess: () => {
      showSnack('Student updated', 'success');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student', editStudent!.id] });
      handleClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const isPending = createMut.isPending || editMut.isPending;

  const handleClose = () => {
    setForm({ ...EMPTY });
    setErrors({});
    onClose();
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (isEdit) editMut.mutate();
    else createMut.mutate();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>

      <DialogTitle sx={{ p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${BRAND.divider}` }}>
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px',
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isEdit
                ? <EditRoundedIcon sx={{ fontSize: 17, color: '#fff' }} />
                : <SchoolRoundedIcon sx={{ fontSize: 17, color: '#fff' }} />}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: BRAND.textPrimary }}>
                {isEdit ? 'Edit Student' : isParentScoped ? 'Add Student to Parent' : 'Add Student'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                {isEdit
                  ? `Editing: ${editStudent?.name}`
                  : isParentScoped
                    ? 'Linked to selected parent'
                    : 'Create a new student record'}
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={handleClose} disabled={isPending}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2.5, overflowY: 'auto' }}>
        <Stack gap={2.5}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Name *" size="small" fullWidth
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                error={!!errors.name} helperText={errors.name}
                placeholder="e.g. Anjali Kumar"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Date of Birth *" size="small" fullWidth type="date"
                value={form.date_of_birth}
                onChange={(e) => set('date_of_birth', e.target.value)}
                error={!!errors.date_of_birth} helperText={errors.date_of_birth}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Gender *" size="small" fullWidth select
                value={form.gender}
                onChange={(e) => set('gender', e.target.value)}
                error={!!errors.gender} helperText={errors.gender}
              >
                {genders.length === 0 && <MenuItem value="" disabled>Loading…</MenuItem>}
                {genders.map((g) => (
                  <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {!isParentScoped && !isEdit && (
              <Grid item xs={12}>
                <TextField
                  label="Parent Mobile (optional)" size="small" fullWidth
                  value={form.parent_mobile}
                  onChange={(e) => set('parent_mobile', e.target.value)}
                  placeholder="e.g. 9876543210"
                  helperText="If a Parent user with this mobile exists, the student will be linked to them."
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                label="Medical Notes (optional)" size="small" fullWidth multiline rows={3}
                value={form.medical_notes}
                onChange={(e) => set('medical_notes', e.target.value)}
                placeholder="e.g. Asthma, allergies"
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>

      <Divider />
      <Box sx={{
        px: 2.5, py: 2,
        display: 'flex', justifyContent: 'flex-end', gap: 1.5,
        bgcolor: BRAND.surface,
      }}>
        <Button variant="outlined" onClick={handleClose} disabled={isPending}
          sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary, fontSize: 13 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isPending}
          startIcon={
            isPending
              ? <CircularProgress size={13} sx={{ color: '#fff' }} />
              : isEdit ? <EditRoundedIcon /> : <SchoolRoundedIcon />
          }
          sx={{
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
            fontSize: 13, minWidth: 140,
          }}
        >
          {isPending ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save Changes' : 'Create Student'}
        </Button>
      </Box>
    </Dialog>
  );
}
