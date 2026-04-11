import { createTheme } from '@mui/material/styles';

// Status colors — functional, kept neutral
export const STATUS_COLORS = {
  pending:      '#F59E0B',
  underReview:  '#3B82F6',
  slaWarning:   '#F97316',
  approved:     '#22C55E',
  rejected:     '#EF4444',
  archived:     '#9CA3AF',
  suspended:    '#7C3AED',
  sponsored:    '#F97316',
  conflict:     '#EF4444',
  verified:     '#0EA5E9',
} as const;

// Brand palette
export const BRAND = {
  primary:      '#E53E00',   // deep orange-red
  primaryDark:  '#BF3600',   // darker shade
  primaryLight: '#FF6B35',   // lighter
  accent:       '#F5A623',   // golden amber
  accentLight:  '#FFD166',   // pale gold
  surface:      '#FFF9F5',   // warm cream — page bg
  sidebarBg:    '#FFFBF8',   // sidebar
  primaryBg:    '#FFF3EE',   // tinted bg for active nav / chips
  primaryBgHover:'#FFE8DC',  // hover
  textPrimary:  '#1A0A00',   // very dark brown
  textSecondary:'#6B4C3B',   // medium brown
  divider:      '#F3EDE8',   // warm divider
} as const;

const theme = createTheme({
  palette: {
    primary: {
      main:  BRAND.primary,
      dark:  BRAND.primaryDark,
      light: BRAND.primaryLight,
    },
    secondary: {
      main: BRAND.accent,
    },
    background: {
      default: BRAND.surface,
      paper:   '#FFFFFF',
    },
    text: {
      primary:   BRAND.textPrimary,
      secondary: BRAND.textSecondary,
    },
    divider: BRAND.divider,
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h5:       { fontWeight: 700, color: BRAND.textPrimary },
    h6:       { fontWeight: 700, color: BRAND.textPrimary },
    subtitle1:{ fontWeight: 600 },
    subtitle2:{ fontWeight: 600 },
    body2:    { fontSize: 14 },
    caption:  { fontSize: 12 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow:    '0 1px 4px rgba(229,62,0,0.06)',
          border:       `1px solid ${BRAND.divider}`,
          borderRadius: 16,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 2px 8px rgba(229,62,0,0.3)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
    },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: BRAND.textSecondary,
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          borderBottom: `1px solid ${BRAND.divider}`,
        },
        body: { fontSize: 14, borderBottom: `1px solid #FBF7F4` },
      },
    },
    MuiDrawer: {
      styleOverrides: { paper: { border: 'none' } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 6 },
        bar:  { borderRadius: 6 },
      },
    },
  },
});

export default theme;
