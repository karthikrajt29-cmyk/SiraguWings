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
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import BlockRoundedIcon    from '@mui/icons-material/BlockRounded';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMasterData, type MasterDataGroup } from '../../api/masterData.api';
import { BRAND } from '../../theme';

interface Props {
  open: boolean;
  mode?: 'reject' | 'suspend';
  onSubmit: (category: string, reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function RejectReasonModal({
  open,
  mode = 'reject',
  onSubmit,
  onCancel,
  loading = false,
}: Props) {
  const [category, setCategory] = useState('');
  const [reason,   setReason]   = useState('');

  const isReject  = mode === 'reject';
  const group: MasterDataGroup = isReject ? 'rejection_category' : 'suspension_reason';
  const accentColor = isReject ? '#DC2626' : '#D97706';

  const { data: categories = [] } = useQuery({
    queryKey: ['master-data', group, false],
    queryFn: () => getMasterData(group),
    enabled: open,
  });

  useEffect(() => {
    if (!open) { setCategory(''); setReason(''); }
  }, [open]);

  const handleSubmit = () => {
    if (!category || !reason.trim()) return;
    onSubmit(category, reason.trim());
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${BRAND.divider}` }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px',
              bgcolor: `${accentColor}12`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isReject
                ? <WarningAmberRoundedIcon sx={{ fontSize: 18, color: accentColor }} />
                : <BlockRoundedIcon       sx={{ fontSize: 18, color: accentColor }} />}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: BRAND.textPrimary }}>
                {isReject ? 'Reject Center' : 'Suspend Center'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                {isReject
                  ? 'Provide a reason — the center owner will be notified'
                  : 'Center will be disabled immediately'}
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={onCancel} disabled={loading}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 2.5 }}>
        <Stack spacing={2.5}>
          <FormControl fullWidth size="small">
            <InputLabel>{isReject ? 'Rejection Category *' : 'Reason Category *'}</InputLabel>
            <Select
              value={category}
              label={isReject ? 'Rejection Category *' : 'Reason Category *'}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={isReject ? 'Rejection Reason *' : 'Suspension Reason *'}
            multiline
            rows={4}
            fullWidth
            size="small"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            inputProps={{ maxLength: 500 }}
            placeholder={isReject
              ? 'Describe the issue clearly so the center owner can resubmit correctly…'
              : 'Describe why the center is being suspended…'}
            helperText={`${reason.length}/500 characters`}
          />

          {/* Warning banner */}
          <Box sx={{
            p: 1.5, borderRadius: 1.5,
            bgcolor: `${accentColor}08`,
            border: `1px solid ${accentColor}25`,
          }}>
            <Typography sx={{ fontSize: 12, color: accentColor, lineHeight: 1.6 }}>
              {isReject
                ? 'The center will be moved to Rejected status. The owner can edit and resubmit for review.'
                : 'The center will be suspended and parents will see a "temporarily unavailable" message. Reinstate at any time.'}
            </Typography>
          </Box>

          <Stack direction="row" gap={1.5} justifyContent="flex-end">
            <Button variant="outlined" onClick={onCancel} disabled={loading}
              sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary, fontSize: 13 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={!category || !reason.trim() || loading}
              onClick={handleSubmit}
              startIcon={loading
                ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                : isReject ? <WarningAmberRoundedIcon /> : <BlockRoundedIcon />}
              sx={{
                bgcolor: accentColor,
                '&:hover': { bgcolor: accentColor, filter: 'brightness(0.88)' },
                '&:disabled': { bgcolor: `${accentColor}50` },
                boxShadow: 'none',
                fontSize: 13,
              }}
            >
              {loading
                ? (isReject ? 'Rejecting…' : 'Suspending…')
                : (isReject ? 'Confirm Reject' : 'Confirm Suspend')}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
