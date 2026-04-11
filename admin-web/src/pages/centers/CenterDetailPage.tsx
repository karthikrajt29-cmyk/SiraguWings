import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCenterDetail } from '../../api/centers.api';
import CenterDetailPanel from '../../components/center/CenterDetailPanel';

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
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">Center Detail</Typography>
      </Box>

      {isLoading && <CircularProgress />}
      {isError && <Typography color="error">Failed to load center.</Typography>}
      {data && <CenterDetailPanel center={data} onActionComplete={() => navigate(-1)} />}
    </Box>
  );
}
