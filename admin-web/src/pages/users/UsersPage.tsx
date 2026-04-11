import {
  Box,
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
import { getUsers, updateUserStatus, type UserSummary } from '../../api/users.api';
import PagedTable from '../../components/common/PagedTable';
import StatusChip from '../../components/common/StatusChip';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [actionUser, setActionUser] = useState<UserSummary | null>(null);
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, role, page, pageSize],
    queryFn: () => getUsers({ search, role: role || undefined, page, size: pageSize }),
  });

  const statusMut = useMutation({
    mutationFn: (user: UserSummary) =>
      updateUserStatus(user.id, {
        status: user.status === 'Active' ? 'Suspended' : 'Active',
      }),
    onSuccess: () => {
      showSnack('User status updated', 'success');
      setActionUser(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1.5 },
    { field: 'email', headerName: 'Email', flex: 2 },
    { field: 'mobile', headerName: 'Mobile', flex: 1, valueFormatter: (v) => v ?? '—' },
    {
      field: 'roles',
      headerName: 'Roles',
      flex: 1,
      renderCell: (p) => (p.value as string[]).join(', '),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: (p) => <StatusChip status={p.value as string} />,
    },
  ];

  return (
    <Box>
      <Typography variant="h5" mb={2}>Users</Typography>

      <Stack direction="row" gap={2} mb={2} flexWrap="wrap">
        <TextField
          label="Search name / email"
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Role</InputLabel>
          <Select value={role} label="Role" onChange={(e) => { setRole(e.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Admin">Admin</MenuItem>
            <MenuItem value="Owner">Owner</MenuItem>
            <MenuItem value="Teacher">Teacher</MenuItem>
            <MenuItem value="Parent">Parent</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <PagedTable
        rows={data?.items ?? []}
        columns={columns}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        onRowClick={(p) => setActionUser(p.row as UserSummary)}
        emptyMessage="No users found."
      />

      <ConfirmDialog
        open={!!actionUser}
        title={actionUser?.status === 'Active' ? 'Suspend User' : 'Activate User'}
        message={
          actionUser?.status === 'Active'
            ? `Suspend ${actionUser?.name}? They will lose access immediately.`
            : `Activate ${actionUser?.name}?`
        }
        confirmLabel={actionUser?.status === 'Active' ? 'Suspend' : 'Activate'}
        confirmColor={actionUser?.status === 'Active' ? 'error' : 'primary'}
        loading={statusMut.isPending}
        onConfirm={() => actionUser && statusMut.mutate(actionUser)}
        onCancel={() => setActionUser(null)}
      />
    </Box>
  );
}
