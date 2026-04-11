import { createTheme } from '@mui/material/styles';

// Status colors from SiraguWings PRD Design System
export const STATUS_COLORS = {
  pending:      '#FACC15',
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

const theme = createTheme({
  palette: {
    primary: {
      main: '#4F46E5',
      dark: '#2C5A85',
    },
    background: {
      default: '#F5F7FA',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #E5E7EB',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
  },
});

export default theme;
