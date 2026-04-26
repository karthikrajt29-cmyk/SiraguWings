import { Box, Typography } from '@mui/material';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import ComingSoon from '../../components/common/ComingSoon';
import { BRAND } from '../../theme';

export default function OwnerRolesPage() {
  return (
    <Box>
      <Box mb={3}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: BRAND.textPrimary }}>
          Roles &amp; Access
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
          Manage Teacher and Parent roles for your centers
        </Typography>
      </Box>

      <ComingSoon
        title="Owner-managed roles is coming"
        description="You'll be able to invite Teachers and Parents and manage their access at each of your centers. Owner and Admin role assignments stay platform-managed."
        icon={<ManageAccountsRoundedIcon sx={{ fontSize: 30 }} />}
      />
    </Box>
  );
}
