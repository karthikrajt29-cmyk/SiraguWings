import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RoomIcon from '@mui/icons-material/Room';
import WarningIcon from '@mui/icons-material/Warning';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  approveCenter,
  rejectCenter,
  reviewCenter,
  suspendCenter,
  reinstateCenter,
  type CenterDetail,
} from '../../api/centers.api';
import StatusChip from '../common/StatusChip';
import RejectReasonModal from './RejectReasonModal';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface Props {
  center: CenterDetail;
  onActionComplete?: () => void;
}

export default function CenterDetailPanel({ center, onActionComplete }: Props) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['centers'] });
    qc.invalidateQueries({ queryKey: ['center', center.id] });
    onActionComplete?.();
  };

  const reviewMut = useMutation({ mutationFn: () => reviewCenter(center.id), onSuccess: () => { showSnack('Moved to Under Review'); invalidate(); } });
  const approveMut = useMutation({ mutationFn: () => approveCenter(center.id), onSuccess: () => { showSnack('Center approved', 'success'); invalidate(); } });
  const rejectMut = useMutation({
    mutationFn: (d: { rejection_category: string; rejection_reason: string }) => rejectCenter(center.id, d),
    onSuccess: () => { showSnack('Center rejected'); invalidate(); setRejectOpen(false); },
  });
  const suspendMut = useMutation({
    mutationFn: (reason: string) => suspendCenter(center.id, { reason }),
    onSuccess: () => { showSnack('Center suspended'); invalidate(); setSuspendOpen(false); },
  });
  const reinstateMut = useMutation({ mutationFn: () => reinstateCenter(center.id), onSuccess: () => { showSnack('Center reinstated', 'success'); invalidate(); } });

  const isLoading =
    reviewMut.isPending || approveMut.isPending || rejectMut.isPending ||
    suspendMut.isPending || reinstateMut.isPending;

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2">{value ?? '—'}</Typography>
    </Box>
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{center.name}</Typography>
        <StatusChip status={center.status} />
      </Stack>

      {center.map_pin_warning && (
        <Box display="flex" alignItems="center" gap={1} mb={2} p={1.5}
          sx={{ bgcolor: '#FFF7ED', borderRadius: 2, border: '1px solid #F97316' }}>
          <WarningIcon sx={{ color: '#F97316', fontSize: 18 }} />
          <Typography variant="body2" color="#9A3412">No map pin set — owner must add location</Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        <Grid item xs={6}><Field label="Category" value={center.category} /></Grid>
        <Grid item xs={6}><Field label="Owner" value={center.owner_name} /></Grid>
        <Grid item xs={6}><Field label="Phone" value={center.phone} /></Grid>
        <Grid item xs={6}><Field label="Email" value={center.email} /></Grid>
        <Grid item xs={12}>
          <Field label="Address" value={`${center.address}, ${center.city} - ${center.pincode}`} />
        </Grid>
        {center.latitude && center.longitude && (
          <Grid item xs={12}>
            <Field label="Map" value={
              <Box display="flex" alignItems="center" gap={0.5}>
                <RoomIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                <Typography variant="body2">{center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}</Typography>
              </Box>
            } />
          </Grid>
        )}
        {center.description && (
          <Grid item xs={12}><Field label="Description" value={center.description} /></Grid>
        )}
      </Grid>

      {center.documents.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" mb={1}>Documents</Typography>
          <Stack gap={1}>
            {center.documents.map((doc, i) => (
              <Box key={i} display="flex" justifyContent="space-between" alignItems="center">
                <Link href={doc.url} target="_blank" rel="noopener" variant="body2">
                  {doc.type}
                </Link>
                {doc.verified ? (
                  <Chip icon={<CheckCircleIcon />} label="Verified" size="small"
                    sx={{ color: '#22C55E', bgcolor: '#22C55E22' }} />
                ) : (
                  <Chip label="Unverified" size="small" sx={{ color: '#9CA3AF', bgcolor: '#9CA3AF22' }} />
                )}
              </Box>
            ))}
          </Stack>
        </>
      )}

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" gap={1} flexWrap="wrap">
        {center.status === 'Submitted' && (
          <Button variant="outlined" size="small" onClick={() => reviewMut.mutate()} disabled={isLoading}>
            Mark Under Review
          </Button>
        )}
        {(center.status === 'Submitted' || center.status === 'UnderReview') && (
          <>
            <Button variant="contained" color="success" size="small"
              onClick={() => approveMut.mutate()} disabled={isLoading}>
              Approve
            </Button>
            <Button variant="contained" color="error" size="small"
              onClick={() => setRejectOpen(true)} disabled={isLoading}>
              Reject
            </Button>
          </>
        )}
        {center.status === 'Approved' && (
          <Button variant="outlined" color="warning" size="small"
            onClick={() => setSuspendOpen(true)} disabled={isLoading}>
            Suspend
          </Button>
        )}
        {center.status === 'Suspended' && (
          <Button variant="outlined" color="success" size="small"
            onClick={() => reinstateMut.mutate()} disabled={isLoading}>
            Reinstate
          </Button>
        )}
      </Stack>

      <RejectReasonModal
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onSubmit={(category, reason) => rejectMut.mutate({ rejection_category: category, rejection_reason: reason })}
        loading={rejectMut.isPending}
      />

      <RejectReasonModal
        open={suspendOpen}
        title="Suspend Center"
        onCancel={() => setSuspendOpen(false)}
        onSubmit={(_, reason) => suspendMut.mutate(reason)}
        loading={suspendMut.isPending}
      />
    </Box>
  );
}
