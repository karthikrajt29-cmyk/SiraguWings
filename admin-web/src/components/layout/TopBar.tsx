import {
  AppBar,
  Box,
  Breadcrumbs,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import SearchRoundedIcon             from '@mui/icons-material/SearchRounded';
import HelpOutlineRoundedIcon        from '@mui/icons-material/HelpOutlineRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { BRAND } from '../../theme';

const DRAWER_WIDTH = 256;

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/centers':         'Centers',
  '/users':           'Users',
  '/unlink-requests': 'Unlink Requests',
  '/billing':         'Billing',
  '/content':         'Feed Moderation',
  '/students':        'Students',
  '/settings':        'Settings',
};

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const base     = '/' + location.pathname.split('/')[1];
  const isDetail = location.pathname.split('/').length > 2;
  const title    = ROUTE_LABELS[base] ?? 'Admin';

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width:  `calc(100% - ${DRAWER_WIDTH}px)`,
        ml:     `${DRAWER_WIDTH}px`,
        bgcolor: '#FFFFFF',
        borderBottom: `1px solid ${BRAND.divider}`,
        color: BRAND.textPrimary,
        zIndex: (t) => t.zIndex.drawer - 1,
      }}
    >
      <Toolbar sx={{ gap: 2, minHeight: '64px !important' }}>
        {/* Title / breadcrumb */}
        <Box sx={{ flex: 1 }}>
          {isDetail ? (
            <Breadcrumbs sx={{ fontSize: 13 }}>
              <Link
                underline="hover"
                sx={{ cursor: 'pointer', fontSize: 13, color: BRAND.textSecondary }}
                onClick={() => navigate(base)}
              >
                {ROUTE_LABELS[base]}
              </Link>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }}>
                Detail
              </Typography>
            </Breadcrumbs>
          ) : (
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: BRAND.textPrimary }}>
              {title}
            </Typography>
          )}
        </Box>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search…"
          sx={{
            width: 220,
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              fontSize: 13,
              bgcolor: BRAND.surface,
              '& fieldset': { borderColor: BRAND.divider },
              '&:hover fieldset': { borderColor: `${BRAND.primary}50` },
              '&.Mui-focused fieldset': { borderColor: BRAND.primary },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
              </InputAdornment>
            ),
          }}
        />

        {/* Actions */}
        <Tooltip title="Help">
          <IconButton size="small" sx={{ color: BRAND.textSecondary, '&:hover': { bgcolor: BRAND.primaryBg, color: BRAND.primary } }}>
            <HelpOutlineRoundedIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Notifications">
          <IconButton size="small" sx={{ color: BRAND.textSecondary, '&:hover': { bgcolor: BRAND.primaryBg, color: BRAND.primary } }}>
            <NotificationsNoneRoundedIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
