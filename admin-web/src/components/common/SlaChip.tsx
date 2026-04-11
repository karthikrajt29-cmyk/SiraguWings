import { Chip, Tooltip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { STATUS_COLORS } from '../../theme';

interface Props {
  hours: number;
  breachHours?: number;
}

export default function SlaChip({ hours, breachHours = 24 }: Props) {
  const isBreached = hours >= breachHours;
  const color = isBreached ? STATUS_COLORS.rejected : STATUS_COLORS.slaWarning;
  const label = `${Math.round(hours)}h`;
  const tip = isBreached
    ? `SLA breached — ${Math.round(hours)}h since submission`
    : `Approaching SLA — ${Math.round(hours)}h / ${breachHours}h`;

  return (
    <Tooltip title={tip}>
      <Chip
        icon={<WarningAmberIcon sx={{ fontSize: 14, color: `${color} !important` }} />}
        label={label}
        size="small"
        sx={{
          bgcolor: color + '22',
          color,
          border: `1px solid ${color}55`,
          fontWeight: 600,
          cursor: 'default',
        }}
      />
    </Tooltip>
  );
}
