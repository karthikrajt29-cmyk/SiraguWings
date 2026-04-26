import {
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Typography,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import DeleteRoundedIcon        from '@mui/icons-material/DeleteRounded';
import CheckRoundedIcon         from '@mui/icons-material/CheckRounded';
import { DialogHeader, DialogFooter } from './DialogHeader';
import { BRAND } from '../../theme';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'error' | 'primary' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'error',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const icon =
    confirmColor === 'error'
      ? <DeleteRoundedIcon sx={{ fontSize: 20 }} />
      : confirmColor === 'warning'
        ? <WarningAmberRoundedIcon sx={{ fontSize: 20 }} />
        : <CheckRoundedIcon sx={{ fontSize: 20 }} />;

  const btnBg =
    confirmColor === 'error'
      ? { background: '#DC2626', '&:hover': { background: '#B91C1C' } }
      : confirmColor === 'warning'
        ? { background: '#D97706', '&:hover': { background: '#B45309' } }
        : {
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
          };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>

      <DialogHeader icon={icon} title={title} onClose={onCancel} disabled={loading} />

      <DialogContent sx={{ py: 2.5 }}>
        <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, lineHeight: 1.65 }}>
          {message}
        </Typography>
      </DialogContent>

      <DialogFooter>
        <Button onClick={onCancel} disabled={loading}
          sx={{ color: BRAND.textSecondary, fontSize: 13 }}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={13} color="inherit" /> : icon}
          sx={{ fontSize: 13, fontWeight: 600, px: 2.5, ...btnBg }}
        >
          {loading ? 'Please wait…' : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// Re-export the shared header/footer so other files can import from one place.
export { DialogHeader, DialogFooter } from './DialogHeader';
