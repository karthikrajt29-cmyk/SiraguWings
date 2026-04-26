import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import PhoneRoundedIcon      from '@mui/icons-material/PhoneRounded';
import BusinessRoundedIcon   from '@mui/icons-material/BusinessRounded';
import { useNavigate }       from 'react-router-dom';
import StatusChip            from '../../components/common/StatusChip';
import { useOwnerCenter }    from '../../contexts/OwnerCenterContext';
import { BRAND }             from '../../theme';

export default function OwnerCentersPage() {
  const navigate = useNavigate();
  const { centers, loading, isError } = useOwnerCenter();

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: BRAND.textPrimary }}>
          My Centers
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
          Centers you own and manage
        </Typography>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size={32} sx={{ color: BRAND.primary }} />
        </Box>
      )}

      {isError && (
        <Card sx={{ borderRadius: '16px' }}>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ color: 'error.main' }}>Failed to load centers.</Typography>
          </CardContent>
        </Card>
      )}

      {!loading && !isError && centers.length === 0 && (
        <Card sx={{ borderRadius: '16px' }}>
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <Avatar sx={{
              width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
              bgcolor: BRAND.primaryBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BusinessRoundedIcon sx={{ fontSize: 28, color: BRAND.primary }} />
            </Avatar>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: BRAND.textPrimary }}>
              No centers linked yet
            </Typography>
            <Typography sx={{ fontSize: 13, color: BRAND.textSecondary, mt: 0.75 }}>
              You don't own any centers yet — please contact support.
            </Typography>
          </CardContent>
        </Card>
      )}

      {!loading && centers.length > 0 && (
        <Grid container spacing={2.5}>
          {centers.map((c) => {
            const initials = c.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
            return (
              <Grid item xs={12} sm={6} md={4} key={c.id}>
                <Box
                  onClick={() => navigate(`/owner/centers/${c.id}`)}
                  sx={{
                    cursor: 'pointer',
                    p: 2, borderRadius: 3, bgcolor: '#fff',
                    border: `1px solid ${BRAND.divider}`,
                    transition: 'all .15s',
                    '&:hover': {
                      borderColor: `${BRAND.primary}60`,
                      boxShadow: '0 4px 14px rgba(15,30,53,0.08)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Stack direction="row" gap={1.5} alignItems="center" mb={1.5}>
                    <Avatar sx={{
                      width: 44, height: 44, fontSize: 14, fontWeight: 800,
                      background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                      color: '#fff', flexShrink: 0,
                    }}>
                      {initials}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography sx={{
                        fontSize: 14.5, fontWeight: 700, color: BRAND.textPrimary,
                        lineHeight: 1.25,
                      }} noWrap>
                        {c.name}
                      </Typography>
                      <Chip
                        label={c.category}
                        size="small"
                        sx={{
                          mt: 0.5, height: 18, fontSize: 10.5, fontWeight: 600,
                          bgcolor: BRAND.primaryBg, color: BRAND.primary,
                        }}
                      />
                    </Box>
                  </Stack>

                  <Stack gap={0.75} mt={1.5}>
                    {c.city && (
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <LocationOnRoundedIcon sx={{ fontSize: 13, color: BRAND.textSecondary }} />
                        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                          {c.city}
                        </Typography>
                      </Stack>
                    )}
                    {c.mobile_number && (
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <PhoneRoundedIcon sx={{ fontSize: 13, color: BRAND.textSecondary }} />
                        <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                          {c.mobile_number}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>

                  <Stack direction="row" gap={0.75} mt={1.5} flexWrap="wrap">
                    <StatusChip status={c.registration_status} />
                    {c.subscription_status && c.subscription_status !== c.registration_status && (
                      <StatusChip status={c.subscription_status} />
                    )}
                  </Stack>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
