import { Avatar, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import { BRAND } from '../../theme';

export default function ComingSoon({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card sx={{ borderRadius: '16px' }}>
      <CardContent sx={{ p: '48px !important' }}>
        <Stack alignItems="center" gap={2}>
          <Avatar
            sx={{
              width: 64, height: 64,
              bgcolor: BRAND.primaryBg, color: BRAND.primary,
              borderRadius: '16px',
            }}
          >
            {icon ?? <ConstructionRoundedIcon sx={{ fontSize: 30 }} />}
          </Avatar>
          <Typography sx={{ fontSize: 19, fontWeight: 700, color: BRAND.textPrimary }}>
            {title}
          </Typography>
          <Box sx={{ maxWidth: 480, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, lineHeight: 1.6 }}>
              {description}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
