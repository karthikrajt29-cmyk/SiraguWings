import {
  AppBar,
  Box,
  Breadcrumbs,
  IconButton,
  Link,
  MenuItem,
  Select,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import HelpOutlineRoundedIcon       from '@mui/icons-material/HelpOutlineRounded';
import BusinessRoundedIcon          from '@mui/icons-material/BusinessRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import { BRAND } from '../../theme';

const DRAWER_WIDTH = 256;

const ROUTE_LABELS: Record<string, string> = {
  '/owner/dashboard':     'Dashboard',
  '/owner/centers':       'My Centers',
  '/owner/students':      'Students',
  '/owner/batches':       'Batches',
  '/owner/teachers':      'Teachers',
  '/owner/attendance':    'Attendance',
  '/owner/fees':          'Fees & Invoices',
  '/owner/parents':       'Parents',
  '/owner/reports':       'Reports',
  '/owner/roles':         'Roles & Access',
  '/owner/notifications': 'Notifications',
  '/owner/settings':      'Settings',
};

export default function OwnerTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { centers, centerId, setCenterId } = useOwnerCenter();

  const parts = location.pathname.split('/').filter(Boolean); // ['owner', 'students', ...]
  const base  = '/' + parts.slice(0, 2).join('/');           // '/owner/students'
  const isDetail = parts.length > 2;
  const title = ROUTE_LABELS[base] ?? 'Owner';

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
        <Box sx={{ flex: 1, minWidth: 0 }}>
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

        {/* Center selector — only when owner has > 1 center */}
        {centers.length > 1 && centerId && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
            <Select
              size="small"
              value={centerId}
              onChange={(e) => setCenterId(e.target.value)}
              sx={{
                minWidth: 200,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.divider },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: `${BRAND.primary}50` },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND.primary },
                fontSize: 13,
                bgcolor: BRAND.surface,
                borderRadius: '10px',
              }}
            >
              {centers.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}

        {/* Actions */}
        <Tooltip title="Help">
          <IconButton size="small" sx={{
            color: BRAND.textSecondary,
            '&:hover': { bgcolor: BRAND.primaryBg, color: BRAND.primary },
          }}>
            <HelpOutlineRoundedIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Notifications">
          <IconButton
            size="small"
            onClick={() => navigate('/owner/notifications')}
            sx={{
              color: BRAND.textSecondary,
              '&:hover': { bgcolor: BRAND.primaryBg, color: BRAND.primary },
            }}
          >
            <NotificationsNoneRoundedIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
