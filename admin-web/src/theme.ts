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

// Brand palette — Option C: Navy + Orange
export const BRAND = {
  primary:        '#E85D04',   // vibrant orange
  primaryDark:    '#C94B00',   // darker orange
  primaryLight:   '#FF7C2A',   // lighter orange
  accent:         '#F5A623',   // golden amber

  // Navy sidebar palette
  navyDark:       '#0F1E35',   // deepest navy — drawer bg
  navyMid:        '#162840',   // slightly lighter — hover
  navyLight:      '#1E3A5F',   // active item bg
  navyBorder:     '#1E3A5F',   // divider inside sidebar
  navyText:       'rgba(255,255,255,0.55)',  // inactive nav label
  navyTextActive: '#FFFFFF',   // active nav label

  // Page / surface
  surface:        '#F8FAFC',   // cool light grey page bg
  sidebarBg:      '#0F1E35',   // sidebar bg (matches navyDark)
  primaryBg:      'rgba(232,93,4,0.12)',    // active nav tint
  primaryBgHover: 'rgba(232,93,4,0.18)',   // hover tint

  textPrimary:    '#0F1E35',   // near-navy for body text
  textSecondary:  '#64748B',   // slate grey
  divider:        '#E2E8F0',   // cool divider
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
    fontFamily: '"Inter", "Roboto", Arial, sans-serif',
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
          boxShadow:    '0 1px 4px rgba(15,30,53,0.06)',
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
          '&:hover': { boxShadow: '0 2px 8px rgba(232,93,4,0.3)' },
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
        body: { fontSize: 14, borderBottom: `1px solid #F1F5F9` },
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
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: `1px solid ${BRAND.divider}`,
        },
      },
    },
  },
});

export default theme;
