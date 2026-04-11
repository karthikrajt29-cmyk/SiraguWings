import {
  Box,
  Button,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCenterDetail } from '../../api/centers.api';
import CenterDetailPanel from '../../components/center/CenterDetailPanel';
import StatusChip from '../../components/common/StatusChip';
import { BRAND } from '../../theme';

export default function CenterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['center', id],
    queryFn: () => getCenterDetail(id!),
    enabled: !!id,
  });

  return (
    <Box>
      {/* ── Breadcrumb header ── */}
      <Stack direction="row" alignItems="center" gap={1.5} mb={2.5}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate('/centers')}
          size="small"
          sx={{
            color: BRAND.textSecondary,
            fontWeight: 500,
            fontSize: 13,
            textTransform: 'none',
            px: 1.25,
            '&:hover': { bgcolor: BRAND.primaryBg, color: BRAND.primary },
          }}
        >
          Centers
        </Button>

        <Typography sx={{ color: BRAND.divider, fontSize: 16, lineHeight: 1 }}>/</Typography>

        {isLoading ? (
          <Skeleton variant="text" width={160} height={20} />
        ) : data ? (
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
              {data.name}
            </Typography>
            <StatusChip status={data.registration_status} />
          </Stack>
        ) : null}
      </Stack>

      {/* ── Content ── */}
      {isLoading && (
        <Box sx={{
          borderRadius: 3, border: `1px solid ${BRAND.divider}`,
          overflow: 'hidden',
          boxShadow: '0 1px 6px rgba(15,30,53,0.06)',
        }}>
          <Skeleton variant="rectangular" height={140} />
          <Box sx={{ p: 3 }}>
            <Stack direction="row" gap={2} mb={3}>
              <Skeleton variant="circular" width={72} height={72} />
              <Box flex={1}>
                <Skeleton variant="text" width="45%" height={26} />
                <Skeleton variant="text" width="30%" height={18} />
                <Skeleton variant="text" width="25%" height={18} />
              </Box>
            </Stack>
            <Skeleton variant="text" width="100%" height={14} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="85%" height={14} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="70%" height={14} />
          </Box>
        </Box>
      )}

      {isError && (
        <Box sx={{
          py: 8, textAlign: 'center',
          border: `1px solid ${BRAND.divider}`,
          borderRadius: 3,
        }}>
          <Typography sx={{ color: 'error.main', mb: 1.5 }}>Failed to load center details.</Typography>
          <Button variant="outlined" size="small" onClick={() => navigate('/centers')}>
            Back to Centers
          </Button>
        </Box>
      )}

      {data && (
        <Box sx={{
          borderRadius: 3,
          border: `1px solid ${BRAND.divider}`,
          overflow: 'hidden',
          boxShadow: '0 1px 6px rgba(15,30,53,0.06)',
        }}>
          <CenterDetailPanel
            center={data}
            onActionComplete={() => navigate('/centers')}
          />
        </Box>
      )}
    </Box>
  );
}
