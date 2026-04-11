import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon     from '@mui/icons-material/CloseRounded';
import ClassRoundedIcon     from '@mui/icons-material/ClassRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBatch, getCenterUsers, type BatchCreatePayload } from '../../api/centers.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';

interface Props {
  open: boolean;
  centerId: string;
  onClose: () => void;
}

const DAYS_OPTIONS = [
  { label: 'Mon – Fri',          value: 'Mon,Tue,Wed,Thu,Fri' },
  { label: 'Mon, Wed, Fri',      value: 'Mon,Wed,Fri' },
  { label: 'Tue, Thu, Sat',      value: 'Tue,Thu,Sat' },
  { label: 'Sat & Sun',          value: 'Sat,Sun' },
  { label: 'All Days',           value: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
  { label: 'Custom',             value: 'Custom' },
];

const EMPTY: BatchCreatePayload = {
  course_name: '', batch_name: '', category_type: '',
  class_days: '', start_time: '', end_time: '',
  strength_limit: null, fee_amount: 0, teacher_id: null,
};

type Errors = Partial<Record<keyof BatchCreatePayload, string>>;

function SectionHead({ title }: { title: string }) {
  return (
    <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.6, mb: 1.5 }}>
      {title}
    </Typography>
  );
}

export default function AddBatchModal({ open, centerId, onClose }: Props) {
  const [form, setForm]     = useState<BatchCreatePayload>({ ...EMPTY });
  const [errors, setErrors] = useState<Errors>({});
  const [customDays, setCustomDays] = useState('');
  const { showSnack } = useSnackbar();
  const qc = useQueryClient();

  const set = <K extends keyof BatchCreatePayload>(k: K, v: BatchCreatePayload[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  /* Teachers for this center */
  const { data: users = [] } = useQuery({
    queryKey: ['center-users', centerId],
    queryFn: () => getCenterUsers(centerId),
    enabled: open,
  });
  const teachers = users.filter((u) => u.role === 'Teacher');

  const validate = (): boolean => {
    const next: Errors = {};
    if (!form.course_name.trim()) next.course_name = 'Required';
    if (!form.batch_name.trim())  next.batch_name  = 'Required';
    const days = form.class_days === 'Custom' ? customDays : form.class_days;
    if (!days.trim()) next.class_days = 'Select days';
    if (!form.start_time) next.start_time = 'Required';
    if (!form.end_time)   next.end_time   = 'Required';
    if (form.start_time && form.end_time && form.start_time >= form.end_time)
      next.end_time = 'End time must be after start time';
    if (!form.fee_amount || form.fee_amount <= 0) next.fee_amount = 'Enter a valid fee';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const mut = useMutation({
    mutationFn: () => {
      const days = form.class_days === 'Custom' ? customDays.trim() : form.class_days;
      return createBatch(centerId, {
        ...form,
        class_days: days,
        category_type: form.category_type || undefined,
        teacher_id: form.teacher_id || null,
        strength_limit: form.strength_limit || null,
      });
    },
    onSuccess: () => {
      showSnack('Batch created', 'success');
      qc.invalidateQueries({ queryKey: ['center-batches', centerId] });
      handleClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const handleClose = () => { setForm({ ...EMPTY }); setErrors({}); setCustomDays(''); onClose(); };

  const field = (
    key: keyof BatchCreatePayload, label: string,
    opts?: { type?: string; placeholder?: string; multiline?: boolean }
  ) => (
    <TextField
      label={label} size="small" fullWidth
      value={(form[key] as string | number) ?? ''}
      onChange={(e) => set(key, e.target.value as never)}
      error={!!errors[key]} helperText={errors[key]}
      type={opts?.type} placeholder={opts?.placeholder}
      multiline={opts?.multiline}
    />
  );

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
              <ClassRoundedIcon sx={{ fontSize: 17, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: BRAND.textPrimary }}>Add Batch</Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>Create a new class batch</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={handleClose} disabled={mut.isPending}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2.5, overflowY: 'auto' }}>
        <Stack gap={3}>

          {/* Course & Batch name */}
          <Box>
            <SectionHead title="Batch Details" />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={7}>
                {field('course_name', 'Course Name *', { placeholder: 'e.g. Mathematics Grade 10' })}
              </Grid>
              <Grid item xs={12} sm={5}>
                {field('batch_name', 'Batch Name *', { placeholder: 'e.g. Morning Batch A' })}
              </Grid>
              <Grid item xs={12} sm={6}>
                {field('category_type', 'Category Type', { placeholder: 'e.g. Tuition' })}
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" error={!!errors.teacher_id}>
                  <InputLabel>Teacher (optional)</InputLabel>
                  <Select
                    value={form.teacher_id ?? ''}
                    label="Teacher (optional)"
                    onChange={(e) => set('teacher_id', e.target.value || null)}
                  >
                    <MenuItem value=""><em>— None —</em></MenuItem>
                    {teachers.map((t) => (
                      <MenuItem key={t.user_id} value={t.user_id}>{t.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Schedule */}
          <Box>
            <SectionHead title="Schedule" />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" error={!!errors.class_days}>
                  <InputLabel>Class Days *</InputLabel>
                  <Select
                    value={form.class_days}
                    label="Class Days *"
                    onChange={(e) => set('class_days', e.target.value)}
                  >
                    {DAYS_OPTIONS.map((d) => (
                      <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                    ))}
                  </Select>
                  {errors.class_days && (
                    <Typography sx={{ fontSize: 11, color: 'error.main', mt: 0.5, ml: 1.75 }}>
                      {errors.class_days}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              {form.class_days === 'Custom' && (
                <Grid item xs={12}>
                  <TextField
                    label="Custom Days *" size="small" fullWidth
                    value={customDays}
                    onChange={(e) => { setCustomDays(e.target.value); setErrors((p) => ({ ...p, class_days: undefined })); }}
                    placeholder="e.g. Mon,Wed,Fri"
                    error={!!errors.class_days}
                    helperText={errors.class_days ?? 'Comma-separated: Mon,Wed,Fri'}
                  />
                </Grid>
              )}
              <Grid item xs={6}>
                <TextField
                  label="Start Time *" size="small" fullWidth type="time"
                  value={form.start_time}
                  onChange={(e) => set('start_time', e.target.value)}
                  error={!!errors.start_time} helperText={errors.start_time}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Time *" size="small" fullWidth type="time"
                  value={form.end_time}
                  onChange={(e) => set('end_time', e.target.value)}
                  error={!!errors.end_time} helperText={errors.end_time}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Fees & Capacity */}
          <Box>
            <SectionHead title="Fees & Capacity" />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Fee Amount *" size="small" fullWidth type="number"
                  value={form.fee_amount || ''}
                  onChange={(e) => set('fee_amount', parseFloat(e.target.value) || 0)}
                  error={!!errors.fee_amount} helperText={errors.fee_amount}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CurrencyRupeeRoundedIcon sx={{ fontSize: 15, color: BRAND.textSecondary }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Max Students" size="small" fullWidth type="number"
                  value={form.strength_limit ?? ''}
                  onChange={(e) => set('strength_limit', parseInt(e.target.value) || null)}
                  placeholder="No limit"
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>
          </Box>

        </Stack>
      </DialogContent>

      {/* Footer */}
      <Box sx={{
        px: 2.5, py: 2,
        borderTop: `1px solid ${BRAND.divider}`,
        display: 'flex', justifyContent: 'flex-end', gap: 1.5,
        bgcolor: BRAND.surface,
      }}>
        <Button variant="outlined" onClick={handleClose} disabled={mut.isPending}
          sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary, fontSize: 13 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => { if (validate()) mut.mutate(); }}
          disabled={mut.isPending}
          startIcon={mut.isPending ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <ClassRoundedIcon />}
          sx={{
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
            fontSize: 13, minWidth: 130,
          }}
        >
          {mut.isPending ? 'Creating…' : 'Create Batch'}
        </Button>
      </Box>
    </Dialog>
  );
}
