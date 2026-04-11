import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { type GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getInvoiceDetail,
  getInvoices,
  type InvoiceSummary,
} from '../../api/billing.api';
import PagedTable from '../../components/common/PagedTable';
import StatusChip from '../../components/common/StatusChip';

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, page, pageSize],
    queryFn: () => getInvoices({ status: statusFilter || undefined, page, size: pageSize }),
  });

  const { data: detail } = useQuery({
    queryKey: ['invoice', selectedId],
    queryFn: () => getInvoiceDetail(selectedId!),
    enabled: !!selectedId,
  });

  const columns: GridColDef[] = [
    { field: 'center_name', headerName: 'Center', flex: 1.5 },
    {
      field: 'billing_period_start',
      headerName: 'Period',
      flex: 1.5,
      valueGetter: (_, row) =>
        `${(row as InvoiceSummary).billing_period_start} → ${(row as InvoiceSummary).billing_period_end}`,
    },
    {
      field: 'total_amount',
      headerName: 'Amount (₹)',
      flex: 1,
      type: 'number',
      valueFormatter: (v) => `₹${(v as number).toLocaleString('en-IN')}`,
    },
    { field: 'due_date', headerName: 'Due Date', flex: 1 },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: (p) => <StatusChip status={p.value as string} />,
    },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Invoices</Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status"
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Outstanding">Outstanding</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
            <MenuItem value="Overdue">Overdue</MenuItem>
            <MenuItem value="Waived">Waived</MenuItem>
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
        onRowClick={(p) => setSelectedId((p.row as InvoiceSummary).id)}
        emptyMessage="No invoices found."
      />

      <Dialog open={!!selectedId} onClose={() => setSelectedId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Invoice Detail</DialogTitle>
        <DialogContent>
          {detail ? (
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Center</Typography>
                <Typography variant="body2">{detail.center_name}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <StatusChip status={detail.status} />
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle2" mb={1}>Line Items</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Unit (₹)</TableCell>
                    <TableCell align="right">Total (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.line_items.map((li, i) => (
                    <TableRow key={i}>
                      <TableCell>{li.description}</TableCell>
                      <TableCell align="right">{li.quantity}</TableCell>
                      <TableCell align="right">{li.unit_price}</TableCell>
                      <TableCell align="right">{li.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {detail.payments.length > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" mb={1}>Payments</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell align="right">Amount (₹)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.payments.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>{p.payment_date}</TableCell>
                          <TableCell>{p.method}</TableCell>
                          <TableCell align="right">{p.amount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </Box>
          ) : (
            <Typography color="text.secondary">Loading…</Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
