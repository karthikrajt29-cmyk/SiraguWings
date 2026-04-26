import { Box, Divider, IconButton, Stack, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { BRAND } from '../../theme';

interface DialogHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClose?: () => void;
  disabled?: boolean;
}

/**
 * Branded gradient header used across all owner-portal dialogs.
 * Navy gradient band + orange icon tile + white text + close button.
 */
export function DialogHeader({ icon, title, subtitle, onClose, disabled }: DialogHeaderProps) {
  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${BRAND.navyDark} 0%, ${BRAND.navyLight} 100%)`,
        px: 3,
        pt: 2.5,
        pb: 2.5,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <Stack direction="row" gap={1.5} alignItems="center">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 3px 10px rgba(232,93,4,0.4)`,
            flexShrink: 0,
            color: '#fff',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            sx={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.25 }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              sx={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', mt: 0.2, lineHeight: 1.4 }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>

      {onClose && (
        <IconButton
          size="small"
          onClick={onClose}
          disabled={disabled}
          sx={{
            color: 'rgba(255,255,255,0.5)',
            '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
            flexShrink: 0,
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      )}
    </Box>
  );
}

interface DialogFooterProps {
  children: React.ReactNode;
  hint?: string;
}

/**
 * Consistent footer bar with a subtle surface background and a divider on top.
 */
export function DialogFooter({ children, hint }: DialogFooterProps) {
  return (
    <>
      <Divider />
      <Box
        sx={{
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: hint ? 'space-between' : 'flex-end',
          gap: 1.25,
          bgcolor: BRAND.surface ?? '#fafafa',
          flexShrink: 0,
        }}
      >
        {hint && (
          <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>{hint}</Typography>
        )}
        <Stack direction="row" gap={1.25} alignItems="center">
          {children}
        </Stack>
      </Box>
    </>
  );
}
