import {
  Avatar,
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import PersonRoundedIcon         from '@mui/icons-material/PersonRounded';
import EmailRoundedIcon          from '@mui/icons-material/EmailRounded';
import BusinessRoundedIcon       from '@mui/icons-material/BusinessRounded';
import { useAuth } from '../../contexts/AuthContext';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import { BRAND } from '../../theme';

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Stack direction="row" gap={1.5} alignItems="center" py={1.25}>
      <Avatar sx={{
        width: 32, height: 32,
        bgcolor: BRAND.primaryBg, color: BRAND.primary,
        borderRadius: '10px',
      }}>
        {icon}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: BRAND.textPrimary, fontWeight: 500 }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function OwnerSettingsPage() {
  const { profile } = useAuth();
  const { centers } = useOwnerCenter();

  return (
    <Box>
      <Box mb={3}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: BRAND.textPrimary }}>
          Settings
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
          Your profile and centers
        </Typography>
      </Box>

      <Card sx={{ borderRadius: '16px', mb: 2.5 }}>
        <CardContent sx={{ p: '20px !important' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.5 }}>
            Profile
          </Typography>
          <InfoRow icon={<PersonRoundedIcon sx={{ fontSize: 18 }} />} label="Name"  value={profile?.name ?? '—'} />
          <Divider />
          <InfoRow icon={<EmailRoundedIcon  sx={{ fontSize: 18 }} />} label="Email" value={profile?.email ?? '—'} />
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: '20px !important' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.5 }}>
            Owned centers ({centers.length})
          </Typography>
          {centers.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>
              No centers linked yet.
            </Typography>
          ) : (
            <Stack divider={<Divider />}>
              {centers.map((c) => (
                <InfoRow
                  key={c.id}
                  icon={<BusinessRoundedIcon sx={{ fontSize: 18 }} />}
                  label={c.category}
                  value={`${c.name} · ${c.city}`}
                />
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
