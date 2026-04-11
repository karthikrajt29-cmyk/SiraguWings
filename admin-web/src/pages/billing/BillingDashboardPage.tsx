import {
  Box,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useQuery } from '@tanstack/react-query';
import { getBillingDashboard } from '../../api/billing.api';
import { STATUS_COLORS } from '../../theme';

function StatCard({
  label,
  value,
  icon,
  color,
  loading,
  prefix = '',
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
  prefix?: string;
}) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {label}
            </Typography>
            {loading ? (
              <Skeleton width={80} height={36} />
            ) : (
              <Typography variant="h5" fontWeight={700}>
                {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}
              </Typography>
            )}
          </Box>
          <Box
            sx={{ bgcolor: color + '22', color, borderRadius: 2, p: 1, display: 'flex' }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function BillingDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['billing-dashboard'],
    queryFn: getBillingDashboard,
  });

  return (
    <Box>
      <Typography variant="h5" mb={3}>
        Billing Overview
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Monthly Recurring Revenue"
            value={data?.mrr ?? 0}
            icon={<AttachMoneyIcon />}
            color={STATUS_COLORS.approved}
            loading={isLoading}
            prefix="₹"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Billed Students"
            value={data?.billed_students ?? 0}
            icon={<PeopleIcon />}
            color={STATUS_COLORS.underReview}
            loading={isLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Outstanding Amount"
            value={data?.outstanding_amount ?? 0}
            icon={<HourglassEmptyIcon />}
            color={STATUS_COLORS.slaWarning}
            loading={isLoading}
            prefix="₹"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Overdue Amount"
            value={data?.overdue_amount ?? 0}
            icon={<ErrorOutlineIcon />}
            color={STATUS_COLORS.rejected}
            loading={isLoading}
            prefix="₹"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
