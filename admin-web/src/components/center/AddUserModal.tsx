import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon    from '@mui/icons-material/CloseRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addCenterUser } from '../../api/centers.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';

interface Props {
  open: boolean;
  centerId: string;
  onClose: () => void;
}

const ROLES = ['Owner', 'Teacher', 'Staff'];

export default function AddUserModal({ open, centerId, onClose }: Props) {
  const [mobile, setMobile] = useState('');
  const [role, setRole]     = useState('Teacher');
  const [mobileErr, setMobileErr] = useState('');
  const { showSnack } = useSnackbar();
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: () => addCenterUser(centerId, { mobile_number: mobile.trim(), role }),
    onSuccess: (data: { message: string }) => {
      showSnack(data.message ?? 'User added', 'success');
      qc.invalidateQueries({ queryKey: ['center-users', centerId] });
      handleClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const handleClose = () => {
    setMobile(''); setRole('Teacher'); setMobileErr('');
    onClose();
  };

  const handleSubmit = () => {
    if (!mobile.trim()) { setMobileErr('Mobile number is required'); return; }
    if (!/^\+?[\d\s\-]{7,15}$/.test(mobile.trim())) { setMobileErr('Invalid phone number'); return; }
    setMobileErr('');
    mut.mutate();
  };

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
              <PersonAddRoundedIcon sx={{ fontSize: 17, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: BRAND.textPrimary }}>Add User</Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>Link by mobile number</Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={handleClose} disabled={mut.isPending}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 3 }}>
        <Stack spacing={2.5}>
          <TextField
            label="Mobile Number *"
            size="small"
            fullWidth
            value={mobile}
            onChange={(e) => { setMobile(e.target.value); setMobileErr(''); }}
            error={!!mobileErr}
            helperText={mobileErr || 'User must already be registered in the system'}
            placeholder="+91 98765 43210"
            type="tel"
          />

          <FormControl fullWidth size="small">
            <InputLabel>Role *</InputLabel>
            <Select value={role} label="Role *" onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>

          <Box sx={{
            p: 1.5, borderRadius: 1.5,
            bgcolor: `${BRAND.primary}08`, border: `1px solid ${BRAND.primary}20`,
          }}>
            <Typography sx={{ fontSize: 12, color: BRAND.textPrimary, lineHeight: 1.6 }}>
              <strong>Owner</strong> — full center management access<br />
              <strong>Teacher</strong> — manages batches and attendance<br />
              <strong>Staff</strong> — view-only access
            </Typography>
          </Box>

          <Stack direction="row" gap={1.5} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleClose} disabled={mut.isPending}
              sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary, fontSize: 13 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={mut.isPending}
              startIcon={mut.isPending ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <PersonAddRoundedIcon />}
              sx={{
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
                fontSize: 13,
              }}
            >
              {mut.isPending ? 'Adding…' : 'Add User'}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
