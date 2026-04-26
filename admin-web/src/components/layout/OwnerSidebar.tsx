import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Tooltip,
} from '@mui/material';
import DashboardRoundedIcon          from '@mui/icons-material/DashboardRounded';
import BusinessRoundedIcon           from '@mui/icons-material/BusinessRounded';
import SchoolRoundedIcon             from '@mui/icons-material/SchoolRounded';
import GroupsRoundedIcon             from '@mui/icons-material/GroupsRounded';
import SupervisorAccountRoundedIcon  from '@mui/icons-material/SupervisorAccountRounded';
import EventAvailableRoundedIcon     from '@mui/icons-material/EventAvailableRounded';
import FamilyRestroomRoundedIcon     from '@mui/icons-material/FamilyRestroomRounded';
import AssessmentRoundedIcon         from '@mui/icons-material/AssessmentRounded';
import ManageAccountsRoundedIcon     from '@mui/icons-material/ManageAccountsRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import CurrencyRupeeRoundedIcon      from '@mui/icons-material/CurrencyRupeeRounded';
import SettingsRoundedIcon           from '@mui/icons-material/SettingsRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import LogoutRoundedIcon             from '@mui/icons-material/LogoutRounded';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BRAND } from '../../theme';

const NAV_ITEMS = [
  { label: 'Dashboard',       icon: <DashboardRoundedIcon />,           path: '/owner/dashboard' },
  { label: 'My Centers',      icon: <BusinessRoundedIcon />,            path: '/owner/centers' },
  { label: 'Students',        icon: <SchoolRoundedIcon />,              path: '/owner/students' },
  { label: 'Batches',         icon: <GroupsRoundedIcon />,              path: '/owner/batches' },
  { label: 'Teachers',        icon: <SupervisorAccountRoundedIcon />,   path: '/owner/teachers' },
  { label: 'Attendance',      icon: <EventAvailableRoundedIcon />,      path: '/owner/attendance' },
  { label: 'Fees',            icon: <CurrencyRupeeRoundedIcon />,       path: '/owner/fees' },
  { label: 'Parents',         icon: <FamilyRestroomRoundedIcon />,      path: '/owner/parents' },
  { label: 'Reports',         icon: <AssessmentRoundedIcon />,          path: '/owner/reports' },
  { label: 'Roles & Access',  icon: <ManageAccountsRoundedIcon />,      path: '/owner/roles' },
  { label: 'Notifications',   icon: <NotificationsActiveRoundedIcon />, path: '/owner/notifications' },
];

function NavItem({
  item,
  active,
  onClick,
}: {
  item: { label: string; icon: React.ReactNode; path?: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        borderRadius: '10px',
        mb: 0.5,
        px: 1.5,
        py: 1,
        minHeight: 44,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.15s ease',
        bgcolor: active ? BRAND.primaryBg : 'transparent',
        '&:hover': {
          bgcolor: active ? BRAND.primaryBgHover : 'rgba(255,255,255,0.06)',
        },
        '& .MuiListItemIcon-root': {
          color:    active ? BRAND.primary : BRAND.navyText,
          minWidth: 36,
          transition: 'color 0.15s',
        },
        '& .MuiListItemText-primary': {
          fontSize:   14,
          fontWeight: active ? 600 : 500,
          color:      active ? BRAND.navyTextActive : BRAND.navyText,
          transition: 'all 0.15s',
        },
      }}
    >
      {active && (
        <Box sx={{
          position: 'absolute', left: 0, top: '20%',
          height: '60%', width: 3,
          borderRadius: '0 3px 3px 0',
          bgcolor: BRAND.primary,
        }} />
      )}
      <ListItemIcon>{item.icon}</ListItemIcon>
      <ListItemText primary={item.label} />
    </ListItemButton>
  );
}

export default function OwnerSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout, isAdmin, isOwner, setActivePortal } = useAuth();
  const isDualRole = isAdmin && isOwner;

  const initials = profile?.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'O';

  const switchToAdmin = () => {
    setActivePortal('admin');
    navigate('/dashboard');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: BRAND.navyDark }}>

      {/* ── Brand ── */}
      <Box sx={{ px: 2.5, pt: 3, pb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 38, height: 38,
            borderRadius: '11px',
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 3px 10px rgba(232,93,4,0.4)`,
            flexShrink: 0,
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: -0.5 }}>
              SW
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#FFFFFF', lineHeight: 1.2 }}>
              SiraguWings
            </Typography>
            <Typography sx={{ fontSize: 11, color: BRAND.navyText, fontWeight: 500 }}>
              Owner Portal
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mx: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* ── Section label ── */}
      <Typography sx={{
        fontSize: 11, fontWeight: 600,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 0.8, textTransform: 'uppercase',
        px: 3, pt: 2.5, pb: 1,
      }}>
        Main Menu
      </Typography>

      {/* ── Nav list ── */}
      <List
        dense
        disablePadding
        sx={{ px: 1.5, flex: 1, overflowY: 'auto' }}
      >
        {NAV_ITEMS.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path !== '/owner/dashboard' && location.pathname.startsWith(item.path));
          return (
            <NavItem
              key={item.path}
              item={item}
              active={active}
              onClick={() => navigate(item.path)}
            />
          );
        })}
      </List>

      {/* ── Settings + Switch to Admin (dual-role only) ── */}
      <List dense disablePadding sx={{ px: 1.5 }}>
        <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
        <NavItem
          item={{ label: 'Settings', icon: <SettingsRoundedIcon />, path: '/owner/settings' }}
          active={location.pathname === '/owner/settings'}
          onClick={() => navigate('/owner/settings')}
        />
        {isDualRole && (
          <NavItem
            item={{ label: 'Switch to Admin Portal', icon: <AdminPanelSettingsRoundedIcon /> }}
            active={false}
            onClick={switchToAdmin}
          />
        )}
      </List>

      {/* ── User footer ── */}
      <Box sx={{
        mx: 1.5, mb: 2, mt: 1, p: 1.5,
        borderRadius: '12px',
        bgcolor: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Avatar sx={{
          width: 34, height: 34,
          background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>
          {initials}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>
            {profile?.name ?? 'Owner'}
          </Typography>
          <Typography sx={{ fontSize: 11, color: BRAND.navyText }}>
            Center Owner
          </Typography>
        </Box>
        <Tooltip title="Sign out">
          <Box onClick={logout} sx={{
            cursor: 'pointer', color: BRAND.navyText, display: 'flex', alignItems: 'center',
            flexShrink: 0, transition: 'color 0.15s',
            '&:hover': { color: BRAND.primary },
          }}>
            <LogoutRoundedIcon sx={{ fontSize: 18 }} />
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}
