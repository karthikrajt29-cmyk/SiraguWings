import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ReceiptRoundedIcon        from '@mui/icons-material/ReceiptRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import WarningAmberRoundedIcon   from '@mui/icons-material/WarningAmberRounded';
import TrendingUpRoundedIcon     from '@mui/icons-material/TrendingUpRounded';
import BoltRoundedIcon           from '@mui/icons-material/BoltRounded';
import EmailRoundedIcon          from '@mui/icons-material/EmailRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import FilterListRoundedIcon     from '@mui/icons-material/FilterListRounded';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  generateAllBills,
  getBillingHistory,
  getBillingSummary,
  sendInvoiceEmail,
  updateBillingStatus,
  type BillingHistoryEntry,
  type BillingSummary,
} from '../../api/subscription.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function currentMonthLabel() {
  return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
}

const STATUS_COLOR: Record<string, string> = {
  Paid:    '#22c55e',
  Pending: '#f59e0b',
  Overdue: '#ef4444',
  Waived:  '#8b5cf6',
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? '#64748b';
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        bgcolor: color + '18',
        color,
        fontWeight: 700,
        fontSize: 11,
        height: 22,
        borderRadius: '6px',
      }}
    />
  );
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color, loading, prefix = '',
}: {
  label: string; value: number; icon: React.ReactNode;
  color: string; loading: boolean; prefix?: string;
}) {
  return (
    <Card sx={{ border: `1px solid ${BRAND.divider}` }}>
      <CardContent sx={{ py: 2, px: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" mb={0.5}>{label}</Typography>
            {loading
              ? <Skeleton width={96} height={36} />
              : <Typography variant="h5" fontWeight={700}>{prefix}{value.toLocaleString('en-IN')}</Typography>
            }
          </Box>
          <Box sx={{ bgcolor: color + '18', color, borderRadius: '10px', p: 1, display: 'flex' }}>
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── invoice modal ─────────────────────────────────────────────────────────────

function InvoiceModal({
  bill,
  onClose,
}: {
  bill: BillingHistoryEntry | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const [newStatus, setNewStatus] = useState('');

  const sendMut = useMutation({
    mutationFn: () => sendInvoiceEmail(bill!.id),
    onSuccess: (d) => { showSnack(d.message, 'success'); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const statusMut = useMutation({
    mutationFn: () => updateBillingStatus(bill!.id, { payment_status: newStatus }),
    onSuccess: () => {
      showSnack('Status updated', 'success');
      qc.invalidateQueries({ queryKey: ['billing-history'] });
      qc.invalidateQueries({ queryKey: ['billing-summary'] });
      onClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  if (!bill) return null;

  const lines = [
    { desc: `${bill.plan_name} Plan`, qty: 1, unit: bill.plan_amount, total: bill.plan_amount },
    ...(bill.extra_students > 0
      ? [{ desc: 'Extra Students', qty: bill.extra_students, unit: bill.plan_amount / bill.student_count || 0, total: bill.extra_amount }]
      : []),
    ...(bill.storage_amount > 0
      ? [{ desc: 'Storage Add-on', qty: 1, unit: bill.storage_amount, total: bill.storage_amount }]
      : []),
  ];

  return (
    <Dialog open={!!bill} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight={700}>Invoice</Typography>
            <Typography variant="body2" color="text.secondary">
              {bill.center_name} — {new Date(bill.billing_month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Typography>
          </Box>
          <StatusBadge status={bill.payment_status} />
        </Stack>
      </DialogTitle>

      <DialogContent>
        {/* Line items */}
        <Typography variant="subtitle2" mb={1} color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6 }}>
          Line Items
        </Typography>
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600, fontSize: 12, color: 'text.secondary', py: 0.75 } }}>
              <TableCell>Description</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Unit (₹)</TableCell>
              <TableCell align="right">Total (₹)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((l, i) => (
              <TableRow key={i} sx={{ '& td': { py: 0.75, fontSize: 13 } }}>
                <TableCell>{l.desc}</TableCell>
                <TableCell align="right">{l.qty}</TableCell>
                <TableCell align="right">{l.unit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{l.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Divider sx={{ mb: 1.5 }} />
        <Stack direction="row" justifyContent="flex-end" mb={2}>
          <Box>
            <Stack direction="row" gap={2}>
              <Typography variant="body2" color="text.secondary">Students billed:</Typography>
              <Typography variant="body2" fontWeight={600}>{bill.student_count}</Typography>
            </Stack>
            <Stack direction="row" gap={2}>
              <Typography variant="body2" color="text.secondary">Total Amount:</Typography>
              <Typography variant="body1" fontWeight={700} color={BRAND.primary}>{fmt(bill.total_amount)}</Typography>
            </Stack>
          </Box>
        </Stack>

        {bill.notes && (
          <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>{bill.notes}</Alert>
        )}

        {/* Update status */}
        <Divider sx={{ mb: 1.5 }} />
        <Typography variant="subtitle2" mb={1}>Update Payment Status</Typography>
        <Stack direction="row" gap={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={newStatus || bill.payment_status}
              label="Status"
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Overdue">Overdue</MenuItem>
              <MenuItem value="Waived">Waived</MenuItem>
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="contained"
            disabled={!newStatus || newStatus === bill.payment_status || statusMut.isPending}
            startIcon={<CheckCircleOutlineRoundedIcon />}
            onClick={() => statusMut.mutate()}
          >
            Update
          </Button>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button
          startIcon={sendMut.isPending ? <CircularProgress size={14} /> : <EmailRoundedIcon />}
          variant="outlined"
          size="small"
          onClick={() => sendMut.mutate()}
          disabled={sendMut.isPending}
        >
          Send Invoice Email
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── generate confirmation dialog ──────────────────────────────────────────────

function GenerateConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Generate Bills — {currentMonthLabel()}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          This will create billing records for <strong>all active centers</strong> that do not
          already have a bill for {currentMonthLabel()}.
        </Typography>
        <Alert severity="info" sx={{ mt: 1.5, fontSize: 12 }}>
          Each bill is calculated based on the center's current subscription plan, student count,
          and active storage add-ons. Centers with an existing bill this month are skipped.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} /> : <BoltRoundedIcon />}
        >
          Generate
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function BillingDashboardPage() {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const [selectedMonth, setSelectedMonth] = useState('');   // YYYY-MM filter
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewBill, setViewBill] = useState<BillingHistoryEntry | null>(null);

  // Summary stats
  const { data: summary, isLoading: sumLoading } = useQuery<BillingSummary>({
    queryKey: ['billing-summary', selectedMonth],
    queryFn: () => getBillingSummary(selectedMonth || undefined),
  });

  // Billing rows
  const { data: histData, isLoading: histLoading } = useQuery({
    queryKey: ['billing-history', selectedMonth, statusFilter, page],
    queryFn: () => getBillingHistory({
      month: selectedMonth || undefined,
      payment_status: statusFilter || undefined,
      page,
      size: PAGE_SIZE,
    }),
  });

  const bills = histData?.items ?? [];
  const total = histData?.total ?? 0;

  // Generate all bills
  const genMut = useMutation({
    mutationFn: generateAllBills,
    onSuccess: (d) => {
      showSnack(d.message, 'success');
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ['billing-summary'] });
      qc.invalidateQueries({ queryKey: ['billing-history'] });
    },
    onError: (e: Error) => { showSnack(e.message, 'error'); setConfirmOpen(false); },
  });

  // Month picker options (last 6 months)
  const monthOptions: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <Box>
      {/* ── header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Billing Overview</Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedMonth
              ? new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })
              : currentMonthLabel()}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<BoltRoundedIcon />}
          onClick={() => setConfirmOpen(true)}
          sx={{ fontWeight: 700, borderRadius: '10px', px: 2.5 }}
        >
          Generate Bills
        </Button>
      </Stack>

      {/* ── stat cards ── */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard label="MRR" value={summary?.mrr ?? 0} prefix="₹"
            icon={<TrendingUpRoundedIcon />} color="#3b82f6" loading={sumLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard label="Total Billed" value={summary?.total_amount ?? 0} prefix="₹"
            icon={<ReceiptRoundedIcon />} color={BRAND.primary} loading={sumLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard label="Collected" value={summary?.collected ?? 0} prefix="₹"
            icon={<AccountBalanceRoundedIcon />} color="#22c55e" loading={sumLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard label="Outstanding" value={summary?.outstanding ?? 0} prefix="₹"
            icon={<HourglassEmptyRoundedIcon />} color="#f59e0b" loading={sumLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard label="Overdue" value={summary?.overdue ?? 0} prefix="₹"
            icon={<WarningAmberRoundedIcon />} color="#ef4444" loading={sumLoading} />
        </Grid>
      </Grid>

      {/* ── status mini pills ── */}
      <Stack direction="row" gap={1.5} mb={2.5} flexWrap="wrap">
        {[
          { label: 'Bills Generated', val: summary?.total_bills ?? 0, color: '#3b82f6' },
          { label: 'Paid', val: summary?.paid_count ?? 0, color: '#22c55e' },
          { label: 'Pending', val: summary?.pending_count ?? 0, color: '#f59e0b' },
          { label: 'Overdue', val: summary?.overdue_count ?? 0, color: '#ef4444' },
        ].map((s) => (
          <Box key={s.label} sx={{
            px: 2, py: 0.75, borderRadius: '20px',
            bgcolor: s.color + '12', border: `1px solid ${s.color}30`,
            display: 'flex', gap: 1, alignItems: 'center',
          }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.val}</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{s.label}</Typography>
          </Box>
        ))}
      </Stack>

      {/* ── filters ── */}
      <Card sx={{ mb: 2, border: `1px solid ${BRAND.divider}` }}>
        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
            <FilterListRoundedIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Month</InputLabel>
              <Select value={selectedMonth} label="Month"
                onChange={(e) => { setSelectedMonth(e.target.value); setPage(0); }}>
                <MenuItem value="">Current Month</MenuItem>
                {monthOptions.map((m) => (
                  <MenuItem key={m} value={m}>
                    {new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status"
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
                <MenuItem value="Waived">Waived</MenuItem>
              </Select>
            </FormControl>
            {(selectedMonth || statusFilter) && (
              <Button size="small" onClick={() => { setSelectedMonth(''); setStatusFilter(''); setPage(0); }}>
                Clear
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* ── billing table ── */}
      <Card sx={{ border: `1px solid ${BRAND.divider}` }}>
        {histLoading ? (
          <Box p={3}><Stack gap={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} height={40} />)}</Stack></Box>
        ) : bills.length === 0 ? (
          <Box p={4} textAlign="center">
            <ReceiptRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No billing records found.</Typography>
            <Typography variant="body2" color="text.disabled" mt={0.5}>
              Click "Generate Bills" to create this month's billing records.
            </Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: BRAND.primaryBg }}>
                  {['Center', 'Month', 'Plan', 'Students', 'Extra', 'Storage', 'Total', 'Status', ''].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary', py: 1.25 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {bills.map((b) => (
                  <TableRow
                    key={b.id}
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: BRAND.primaryBg } }}
                    onClick={() => setViewBill(b)}
                  >
                    <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{b.center_name}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      {new Date(b.billing_month + '-01').toLocaleString('default', { month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{b.plan_name}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{b.student_count}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: b.extra_amount > 0 ? '#f59e0b' : 'text.secondary' }}>
                      {b.extra_amount > 0 ? fmt(b.extra_amount) : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: b.storage_amount > 0 ? '#3b82f6' : 'text.secondary' }}>
                      {b.storage_amount > 0 ? fmt(b.storage_amount) : '—'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 13, color: BRAND.primary }}>{fmt(b.total_amount)}</TableCell>
                    <TableCell><StatusBadge status={b.payment_status} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="View Invoice">
                        <IconButton size="small" onClick={() => setViewBill(b)}>
                          <ReceiptRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Send Email">
                        <IconButton size="small" onClick={() => {
                          sendInvoiceEmail(b.id)
                            .then((d) => showSnack(d.message, 'success'))
                            .catch((e: Error) => showSnack(e.message, 'error'));
                        }}>
                          <EmailRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <Stack direction="row" justifyContent="flex-end" alignItems="center" gap={1.5} p={1.5}>
                <Typography variant="body2" color="text.secondary">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </Typography>
                <Button size="small" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="small" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
              </Stack>
            )}
          </>
        )}
      </Card>

      {/* ── dialogs ── */}
      <GenerateConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => genMut.mutate()}
        loading={genMut.isPending}
      />
      <InvoiceModal bill={viewBill} onClose={() => setViewBill(null)} />
    </Box>
  );
}
