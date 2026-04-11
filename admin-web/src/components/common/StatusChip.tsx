import { Chip } from '@mui/material';
import { STATUS_COLORS } from '../../theme';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  Pending:       { label: 'Pending',        color: STATUS_COLORS.pending },
  Submitted:     { label: 'Submitted',      color: STATUS_COLORS.pending },
  PendingReview: { label: 'Pending Review', color: STATUS_COLORS.pending },
  UnderReview:   { label: 'Under Review',   color: STATUS_COLORS.underReview },
  Approved:      { label: 'Approved',       color: STATUS_COLORS.approved },
  Active:        { label: 'Active',         color: STATUS_COLORS.approved },
  Live:          { label: 'Live',           color: STATUS_COLORS.approved },
  Rejected:      { label: 'Rejected',       color: STATUS_COLORS.rejected },
  Suspended:     { label: 'Suspended',      color: STATUS_COLORS.suspended },
  Archived:      { label: 'Archived',       color: STATUS_COLORS.archived },
  Trial:         { label: 'Trial',          color: STATUS_COLORS.underReview },
  Waived:        { label: 'Waived',         color: STATUS_COLORS.approved },
  Overdue:       { label: 'Overdue',        color: STATUS_COLORS.rejected },
  Outstanding:   { label: 'Outstanding',    color: STATUS_COLORS.slaWarning },
  Paid:          { label: 'Paid',           color: STATUS_COLORS.approved },
};

interface Props {
  status: string;
  size?: 'small' | 'medium';
}

export default function StatusChip({ status, size = 'small' }: Props) {
  const entry = STATUS_MAP[status] ?? { label: status, color: STATUS_COLORS.archived };
  return (
    <Chip
      label={entry.label}
      size={size}
      sx={{
        bgcolor: entry.color + '22',
        color: entry.color,
        border: `1px solid ${entry.color}55`,
        fontWeight: 600,
      }}
    />
  );
}
