import { Box, Drawer, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { BRAND } from '../../theme';

const DRAWER_WIDTH = 256;

export default function AdminLayout() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: BRAND.surface }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: '2px 0 8px rgba(15,30,53,0.12)',
            bgcolor: BRAND.navyDark,
          },
        }}
      >
        <Sidebar />
      </Drawer>

      <TopBar />

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Toolbar sx={{ minHeight: '64px !important' }} />
        <Box sx={{ p: 3, flexGrow: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
