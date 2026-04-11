import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { type GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  extendTrial,
  getBillingCenters,
  waiveFee,
  type CenterBillingSummary,
} from '../../api/billing.api';
import PagedTable from '../../components/common/PagedTable';
import StatusChip from '../../components/common/StatusChip';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function CenterBillingPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [waiveTarget, setWaiveTarget] = useState<CenterBillingSummary | null>(null);
  const [trialTarget, setTrialTarget] = useState<CenterBillingSummary | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [trialDays, setTrialDays] = useState('14');
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const { data, isLoading } = useQuery({
    queryKey: ['billing-centers', statusFilter, page, pageSize],
    queryFn: () =>
      getBillingCenters({ subscription_status: statusFilter || undefined, page, size: pageSize }),
  });

  const waiveMut = useMutation({
    mutationFn: () =>
      waiveFee(waiveTarget!.center_id, { invoice_id: '', waive_reason: waiveReason }),
    onSuccess: () => { showSnack('Fee waived', 'success'); setWaiveTarget(null); setWaiveReason(''); qc.invalidateQueries({ queryKey: ['billing-centers'] }); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const trialMut = useMutation({
    mutationFn: () =>
      extendTrial(trialTarget!.center_id, { extension_days: Number(trialDays) }),
    onSuccess: () => { showSnack('Trial extended', 'success'); setTrialTarget(null); qc.invalidateQueries({ queryKey: ['billing-centers'] }); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const columns: GridColDef[] = [
    { field: 'center_name', headerName: 'Center', flex: 2 },
    {
      field: 'subscription_status',
      headerName: 'Subscription',
      flex: 1,
      renderCell: (p) => <StatusChip status={p.value as string} />,
    },
    { field: 'student_count', headerName: 'Students', flex: 0.8, type: 'number' },
    {
      field: 'monthly_amount',
      headerName: 'Monthly (₹)',
      flex: 1,
      type: 'number',
      valueFormatter: (v) => `₹${(v as number).toLocaleString('en-IN')}`,
    },
    {
      field: 'invoice_status',
      headerName: 'Invoice',
      flex: 1,
      renderCell: (p) => p.value ? <StatusChip status={p.value as string} /> : '—',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1.5,
      sortable: false,
      renderCell: (p) => {
        const row = p.row as CenterBillingSummary;
        return (
          <Stack direction="row" gap={1}>
            <Button size="small" variant="outlined"
              onClick={(e) => { e.stopPropagation(); setWaiveTarget(row); }}>
              Waive
            </Button>
            {row.subscription_status === 'Trial' && (
              <Button size="small" variant="outlined" color="secondary"
                onClick={(e) => { e.stopPropagation(); setTrialTarget(row); }}>
                Extend Trial
              </Button>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Center Billing</Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Subscription</InputLabel>
          <Select value={statusFilter} label="Subscription"
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Trial">Trial</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Overdue">Overdue</MenuItem>
            <MenuItem value="Suspended">Suspended</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <PagedTable
        rows={(data?.items ?? []).map((r) => ({ ...r, id: r.center_id }))}
        columns={columns}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        emptyMessage="No billing records."
      />

      {/* Waive dialog */}
      <Dialog open={!!waiveTarget} onClose={() => setWaiveTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Waive Fee — {waiveTarget?.center_name}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField label="Reason *" fullWidth size="small" value={waiveReason}
            onChange={(e) => setWaiveReason(e.target.value)} multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setWaiveTarget(null)}>Cancel</Button>
          <Button variant="contained" disabled={!waiveReason.trim() || waiveMut.isPending}
            onClick={() => waiveMut.mutate()}>
            {waiveMut.isPending ? 'Waiving…' : 'Waive Fee'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Extend trial dialog */}
      <Dialog open={!!trialTarget} onClose={() => setTrialTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Extend Trial — {trialTarget?.center_name}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField label="Additional days *" type="number" fullWidth size="small"
            value={trialDays} onChange={(e) => setTrialDays(e.target.value)}
            inputProps={{ min: 1, max: 90 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTrialTarget(null)}>Cancel</Button>
          <Button variant="contained" disabled={!trialDays || trialMut.isPending}
            onClick={() => trialMut.mutate()}>
            {trialMut.isPending ? 'Saving…' : 'Extend'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
