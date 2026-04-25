import {
  Autocomplete, Box, Button, CircularProgress, Dialog, DialogContent,
  DialogTitle, Divider, IconButton, Stack, TextField, Typography,
} from '@mui/material';
import CloseRoundedIcon       from '@mui/icons-material/CloseRounded';
import BusinessRoundedIcon    from '@mui/icons-material/BusinessRounded';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllCenters } from '../../api/centers.api';
import { enrollStudents } from '../../api/students.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';

interface Props {
  open: boolean;
  studentIds: string[];
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EnrollStudentModal({ open, studentIds, onClose, onSuccess }: Props) {
  const [centerId, setCenterId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { showSnack } = useSnackbar();
  const qc = useQueryClient();

  const { data: centers = [] } = useQuery({
    queryKey: ['all-centers'],
    queryFn: getAllCenters,
    enabled: open,
  });

  const mut = useMutation({
    mutationFn: () => enrollStudents({ center_id: centerId, student_ids: studentIds }),
    onSuccess: (data) => {
      showSnack(data.message || 'Students enrolled', 'success');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student-stats'] });
      onSuccess?.();
      handleClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const handleClose = () => {
    setCenterId('');
    setError('');
    onClose();
  };

  const handleSubmit = () => {
    if (!centerId) { setError('Pick a center'); return; }
    mut.mutate();
  };

  const selectedCenter = centers.find((c) => c.id === centerId) ?? null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>

      <DialogTitle sx={{ p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${BRAND.divider}` }}>
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px',
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BusinessRoundedIcon sx={{ fontSize: 17, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: BRAND.textPrimary }}>
                Enroll in Center
              </Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                {studentIds.length} student{studentIds.length === 1 ? '' : 's'} selected
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={handleClose} disabled={mut.isPending}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2.5 }}>
        <Autocomplete
          options={centers}
          value={selectedCenter}
          onChange={(_, v) => { setCenterId(v?.id ?? ''); setError(''); }}
          getOptionLabel={(c) => `${c.name} · ${c.city}`}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Center *" size="small"
              error={!!error} helperText={error}
            />
          )}
        />
      </DialogContent>

      <Divider />
      <Box sx={{
        px: 2.5, py: 2,
        display: 'flex', justifyContent: 'flex-end', gap: 1.5,
        bgcolor: BRAND.surface,
      }}>
        <Button variant="outlined" onClick={handleClose} disabled={mut.isPending}
          sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary, fontSize: 13 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mut.isPending}
          startIcon={
            mut.isPending
              ? <CircularProgress size={13} sx={{ color: '#fff' }} />
              : <BusinessRoundedIcon />
          }
          sx={{
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
            fontSize: 13, minWidth: 130,
          }}
        >
          {mut.isPending ? 'Enrolling…' : 'Enroll'}
        </Button>
      </Box>
    </Dialog>
  );
}
