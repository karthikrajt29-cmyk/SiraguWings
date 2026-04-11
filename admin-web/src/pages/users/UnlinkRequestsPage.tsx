import { Box, Typography, Stack, Button } from '@mui/material';
import { type GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveUnlinkRequest,
  getUnlinkRequests,
  rejectUnlinkRequest,
  type UnlinkRequestSummary,
} from '../../api/users.api';
import PagedTable from '../../components/common/PagedTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function UnlinkRequestsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [target, setTarget] = useState<{ req: UnlinkRequestSummary; action: 'approve' | 'reject' } | null>(null);
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const { data, isLoading } = useQuery({
    queryKey: ['unlink-requests', page, pageSize],
    queryFn: () => getUnlinkRequests({ page, size: pageSize }),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveUnlinkRequest(id),
    onSuccess: () => { showSnack('Unlink request approved', 'success'); setTarget(null); qc.invalidateQueries({ queryKey: ['unlink-requests'] }); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectUnlinkRequest(id, { rejection_reason: 'Rejected by admin' }),
    onSuccess: () => { showSnack('Unlink request rejected'); setTarget(null); qc.invalidateQueries({ queryKey: ['unlink-requests'] }); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const columns: GridColDef[] = [
    { field: 'parent_name', headerName: 'Parent', flex: 1.5 },
    { field: 'center_name', headerName: 'Center', flex: 1.5 },
    { field: 'student_name', headerName: 'Student', flex: 1.5 },
    { field: 'reason', headerName: 'Reason', flex: 2, valueFormatter: (v) => v ?? '—' },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1.2,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" gap={1}>
          <Button size="small" color="success" variant="outlined"
            onClick={(e) => { e.stopPropagation(); setTarget({ req: p.row as UnlinkRequestSummary, action: 'approve' }); }}>
            Approve
          </Button>
          <Button size="small" color="error" variant="outlined"
            onClick={(e) => { e.stopPropagation(); setTarget({ req: p.row as UnlinkRequestSummary, action: 'reject' }); }}>
            Reject
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" mb={2}>Unlink Requests</Typography>

      <PagedTable
        rows={data?.items ?? []}
        columns={columns}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        emptyMessage="No pending unlink requests."
      />

      <ConfirmDialog
        open={!!target}
        title={target?.action === 'approve' ? 'Approve Unlink Request' : 'Reject Unlink Request'}
        message={
          target?.action === 'approve'
            ? `Remove ${target?.req.student_name} from ${target?.req.center_name}? This cannot be undone.`
            : `Reject unlink request for ${target?.req.student_name}?`
        }
        confirmLabel={target?.action === 'approve' ? 'Approve' : 'Reject'}
        confirmColor={target?.action === 'approve' ? 'primary' : 'error'}
        loading={approveMut.isPending || rejectMut.isPending}
        onConfirm={() => {
          if (!target) return;
          target.action === 'approve'
            ? approveMut.mutate(target.req.id)
            : rejectMut.mutate(target.req.id);
        }}
        onCancel={() => setTarget(null)}
      />
    </Box>
  );
}
