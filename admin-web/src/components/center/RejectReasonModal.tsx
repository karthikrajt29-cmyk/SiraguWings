import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { useState } from 'react';

const REJECTION_CATEGORIES = [
  'IncompleteDocuments',
  'InvalidDocuments',
  'LocationMismatch',
  'DuplicateRegistration',
  'PolicyViolation',
  'Other',
];

interface Props {
  open: boolean;
  title?: string;
  onSubmit: (category: string, reason: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function RejectReasonModal({
  open,
  title = 'Reject Center',
  onSubmit,
  onCancel,
  loading = false,
}: Props) {
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!category || !reason.trim()) return;
    onSubmit(category, reason.trim());
  };

  const handleClose = () => {
    setCategory('');
    setReason('');
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <FormControl fullWidth size="small">
          <InputLabel>Rejection Category *</InputLabel>
          <Select
            value={category}
            label="Rejection Category *"
            onChange={(e) => setCategory(e.target.value)}
          >
            {REJECTION_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c.replace(/([A-Z])/g, ' $1').trim()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Rejection Reason *"
          multiline
          rows={3}
          fullWidth
          size="small"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          inputProps={{ maxLength: 500 }}
          helperText={`${reason.length}/500`}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!category || !reason.trim() || loading}
          onClick={handleSubmit}
        >
          {loading ? 'Submitting…' : 'Reject'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
