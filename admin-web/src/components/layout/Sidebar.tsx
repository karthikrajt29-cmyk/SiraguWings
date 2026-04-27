import { useState, useEffect } from 'react';
import {
  Avatar,
  Box,
  Collapse,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import DashboardRoundedIcon          from '@mui/icons-material/DashboardRounded';
import BusinessRoundedIcon           from '@mui/icons-material/BusinessRounded';
import SchoolRoundedIcon             from '@mui/icons-material/SchoolRounded';
import PeopleRoundedIcon             from '@mui/icons-material/PeopleRounded';
import FamilyRestroomRoundedIcon     from '@mui/icons-material/FamilyRestroomRounded';
import ManageAccountsRoundedIcon     from '@mui/icons-material/ManageAccountsRounded';
import CardMembershipRoundedIcon     from '@mui/icons-material/CardMembershipRounded';
import ReceiptRoundedIcon            from '@mui/icons-material/ReceiptRounded';
import ArticleRoundedIcon            from '@mui/icons-material/ArticleRounded';
import LinkOffRoundedIcon            from '@mui/icons-material/LinkOffRounded';
import MergeRoundedIcon              from '@mui/icons-material/MergeRounded';
import SettingsRoundedIcon           from '@mui/icons-material/SettingsRounded';
import StorefrontRoundedIcon         from '@mui/icons-material/StorefrontRounded';
import LogoutRoundedIcon             from '@mui/icons-material/LogoutRounded';
import ExpandMoreRoundedIcon         from '@mui/icons-material/ExpandMoreRounded';
import { useNavigate, useLocation }  from 'react-router-dom';
import { useAuth }                   from '../../contexts/AuthContext';
import { BRAND }                     from '../../theme';

interface NavChild {
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface NavGroup {
  groupLabel: string;
  children: NavChild[];
}

// ── Sub-nav item ──────────────────────────────────────────────────────────────
function SubNavItem({
  item,
  active,
  onClick,
}: {
  item: NavChild;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        borderRadius: '8px',
        mb: 0.25,
        pl: 4.5,
        pr: 1.5,
        py: 0.75,
        minHeight: 38,
        position: 'relative',
        transition: 'all 0.15s ease',
        bgcolor: active ? BRAND.primaryBg : 'transparent',
        '&:hover': {
          bgcolor: active ? BRAND.primaryBgHover : 'rgba(255,255,255,0.05)',
        },
        '& .MuiListItemIcon-root': {
          color:    active ? BRAND.primary : 'rgba(255,255,255,0.4)',
          minWidth: 30,
          transition: 'color 0.15s',
        },
        '& .MuiListItemText-primary': {
          fontSize:   13,
          fontWeight: active ? 600 : 400,
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

// ── Group header (collapsible) ────────────────────────────────────────────────
function NavGroupHeader({
  label,
  isOpen,
  isGroupActive,
  onToggle,
}: {
  label: string;
  isOpen: boolean;
  isGroupActive: boolean;
  onToggle: () => void;
}) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2, py: 0.75, mt: 0.5, mb: 0.25,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
      }}
    >
      <Typography sx={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.9,
        textTransform: 'uppercase',
        color: isGroupActive ? 'rgba(232,93,4,0.85)' : 'rgba(255,255,255,0.3)',
        transition: 'color 0.15s',
      }}>
        {label}
      </Typography>
      <ExpandMoreRoundedIcon sx={{
        fontSize: 15,
        color: isGroupActive ? 'rgba(232,93,4,0.7)' : 'rgba(255,255,255,0.2)',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
      }} />
    </Box>
  );
}

// ── Standalone top-level item ─────────────────────────────────────────────────
function StandaloneNavItem({
  item,
  active,
  onClick,
}: {
  item: { label: string; icon: React.ReactNode };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        borderRadius: '10px',
        mb: 0.5, px: 1.5, py: 1,
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

// ── Nav groups ────────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: 'People',
    children: [
      { label: 'Users',              icon: <PeopleRoundedIcon sx={{ fontSize: 18 }} />,           path: '/users' },
      { label: 'Owner Management',   icon: <ManageAccountsRoundedIcon sx={{ fontSize: 18 }} />,   path: '/owners' },
      { label: 'Parent Management',  icon: <FamilyRestroomRoundedIcon sx={{ fontSize: 18 }} />,   path: '/parents' },
      { label: 'Student Management', icon: <SchoolRoundedIcon sx={{ fontSize: 18 }} />,           path: '/student-management' },
    ],
  },
  {
    groupLabel: 'Centers',
    children: [
      { label: 'Centers', icon: <BusinessRoundedIcon sx={{ fontSize: 18 }} />, path: '/centers' },
    ],
  },
  {
    groupLabel: 'Finance',
    children: [
      { label: 'Subscription', icon: <CardMembershipRoundedIcon sx={{ fontSize: 18 }} />, path: '/subscription' },
      { label: 'Billing',      icon: <ReceiptRoundedIcon sx={{ fontSize: 18 }} />,        path: '/billing' },
    ],
  },
  {
    groupLabel: 'Moderation',
    children: [
      { label: 'Feed Moderation',  icon: <ArticleRoundedIcon sx={{ fontSize: 18 }} />,  path: '/content' },
      { label: 'Unlink Requests',  icon: <LinkOffRoundedIcon sx={{ fontSize: 18 }} />,  path: '/unlink-requests' },
      { label: 'Student Merging',  icon: <MergeRoundedIcon sx={{ fontSize: 18 }} />,    path: '/students' },
    ],
  },
];

const SYSTEM_ITEMS: NavChild[] = [
  { label: 'Settings', icon: <SettingsRoundedIcon />, path: '/settings' },
];

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout, isAdmin, isOwner, setActivePortal } = useAuth();
  const isDualRole = isAdmin && isOwner;

  const activeGroups = NAV_GROUPS.reduce<Record<string, boolean>>((acc, group) => {
    acc[group.groupLabel] = group.children.some(
      (c) => location.pathname === c.path || location.pathname.startsWith(c.path + '/'),
    );
    return acc;
  }, {});

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    NAV_GROUPS.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.groupLabel] = group.children.some(
        (c) => location.pathname === c.path || location.pathname.startsWith(c.path + '/'),
      );
      return acc;
    }, {}),
  );

  useEffect(() => {
    NAV_GROUPS.forEach((group) => {
      const hasActive = group.children.some(
        (c) => location.pathname === c.path || location.pathname.startsWith(c.path + '/'),
      );
      if (hasActive) setOpenGroups((prev) => ({ ...prev, [group.groupLabel]: true }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

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

      {/* ── Scrollable nav area ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5, px: 1.5 }}>

        {/* Dashboard — standalone */}
        <List dense disablePadding sx={{ mb: 1 }}>
          <StandaloneNavItem
            item={{ label: 'Dashboard', icon: <DashboardRoundedIcon /> }}
            active={location.pathname === '/dashboard'}
            onClick={() => navigate('/dashboard')}
          />
        </List>

        <Divider sx={{ mx: 0.5, mb: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />

        {/* Grouped sections */}
        {NAV_GROUPS.map((group) => {
          const isOpen   = openGroups[group.groupLabel] ?? false;
          const isActive = activeGroups[group.groupLabel] ?? false;
          return (
            <Box key={group.groupLabel} sx={{ mb: 0.5 }}>
              <NavGroupHeader
                label={group.groupLabel}
                isOpen={isOpen}
                isGroupActive={isActive}
                onToggle={() => toggleGroup(group.groupLabel)}
              />
              <Collapse in={isOpen} timeout={180} unmountOnExit={false}>
                <List dense disablePadding>
                  {group.children.map((child) => {
                    const active =
                      location.pathname === child.path ||
                      location.pathname.startsWith(child.path + '/');
                    return (
                      <SubNavItem
                        key={child.path}
                        item={child}
                        active={active}
                        onClick={() => navigate(child.path)}
                      />
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}

        <Divider sx={{ mx: 0.5, my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />

        {/* System section */}
        <Typography sx={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)', px: 2, pb: 0.75,
        }}>
          System
        </Typography>
        <List dense disablePadding>
          {SYSTEM_ITEMS.map((item) => (
            <SubNavItem
              key={item.path}
              item={item}
              active={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            />
          ))}
        </List>

      </Box>

      {/* ── Switch to Owner (dual-role only) ── */}
      {isDualRole && (
        <Box sx={{ px: 1.5, pb: 0.5 }}>
          <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
          <ListItemButton
            onClick={() => { setActivePortal('owner'); navigate('/owner/dashboard'); }}
            sx={{
              borderRadius: '10px',
              px: 1.5, py: 0.875, mb: 0.5,
              '& .MuiListItemIcon-root': { color: BRAND.accent, minWidth: 36 },
              '& .MuiListItemText-primary': { fontSize: 13, fontWeight: 500, color: BRAND.accent },
              '&:hover': { bgcolor: 'rgba(245,166,35,0.08)' },
            }}
          >
            <ListItemIcon><StorefrontRoundedIcon /></ListItemIcon>
            <ListItemText primary="Switch to Owner Portal" />
          </ListItemButton>
        </Box>
      )}

      {/* ── User footer ── */}
      <Box sx={{
        mx: 1.5, mb: 2, mt: 0.5, p: 1.5,
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
