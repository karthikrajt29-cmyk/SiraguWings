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
import DashboardRoundedIcon    from '@mui/icons-material/DashboardRounded';
import BusinessRoundedIcon     from '@mui/icons-material/BusinessRounded';
import PeopleRoundedIcon       from '@mui/icons-material/PeopleRounded';
import ReceiptRoundedIcon      from '@mui/icons-material/ReceiptRounded';
import ArticleRoundedIcon      from '@mui/icons-material/ArticleRounded';
import SettingsRoundedIcon     from '@mui/icons-material/SettingsRounded';
import LinkOffRoundedIcon      from '@mui/icons-material/LinkOffRounded';
import MergeRoundedIcon        from '@mui/icons-material/MergeRounded';
import SchoolRoundedIcon       from '@mui/icons-material/SchoolRounded';
import LogoutRoundedIcon       from '@mui/icons-material/LogoutRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import FamilyRestroomRoundedIcon from '@mui/icons-material/FamilyRestroomRounded';
import CardMembershipRoundedIcon from '@mui/icons-material/CardMembershipRounded';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BRAND } from '../../theme';

const NAV_ITEMS = [
  { label: 'Dashboard',         icon: <DashboardRoundedIcon />,          path: '/dashboard' },
  { label: 'Users',             icon: <PeopleRoundedIcon />,             path: '/users' },
  { label: 'Owner Management',  icon: <ManageAccountsRoundedIcon />,     path: '/owners' },
  { label: 'Parent Management', icon: <FamilyRestroomRoundedIcon />,     path: '/parents' },
  { label: 'Student Management',icon: <SchoolRoundedIcon />,             path: '/student-management' },
  { label: 'Centers',           icon: <BusinessRoundedIcon />,           path: '/centers' },
  { label: 'Subscription',      icon: <CardMembershipRoundedIcon />,     path: '/subscription' },
  { label: 'Billing',           icon: <ReceiptRoundedIcon />,            path: '/billing' },
  { label: 'Feed Moderation',   icon: <ArticleRoundedIcon />,            path: '/content' },
  { label: 'Unlink Requests',   icon: <LinkOffRoundedIcon />,            path: '/unlink-requests' },
  { label: 'Student Merging',   icon: <MergeRoundedIcon />,              path: '/students' },
];

function NavItem({ item, active }: { item: typeof NAV_ITEMS[0]; active: boolean }) {
  const navigate = useNavigate();
  return (
    <ListItemButton
      onClick={() => navigate(item.path)}
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

export default function Sidebar() {
  const location = useLocation();
  const { profile, logout } = useAuth();

  const initials = profile?.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

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
              Admin Console
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
      <List dense disablePadding sx={{ px: 1.5, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return <NavItem key={item.path} item={item} active={active} />;
        })}
      </List>

      {/* ── Settings ── */}
      <List dense disablePadding sx={{ px: 1.5 }}>
        <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
        <NavItem
          item={{ label: 'Settings', icon: <SettingsRoundedIcon />, path: '/settings' }}
          active={location.pathname === '/settings'}
        />
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
            {profile?.name ?? 'Admin'}
          </Typography>
          <Typography sx={{ fontSize: 11, color: BRAND.navyText }}>
            Administrator
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
