import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Link,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon            from '@mui/icons-material/AddRounded';
import AutoFixHighRoundedIcon   from '@mui/icons-material/AutoFixHighRounded';
import GroupAddRoundedIcon       from '@mui/icons-material/GroupAddRounded';
import PaidRoundedIcon           from '@mui/icons-material/PaidRounded';
import DeleteRoundedIcon         from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon           from '@mui/icons-material/EditRounded';
import SearchRoundedIcon         from '@mui/icons-material/SearchRounded';
import CurrencyRupeeRoundedIcon  from '@mui/icons-material/CurrencyRupeeRounded';
import DownloadRoundedIcon       from '@mui/icons-material/DownloadRounded';
import ReceiptLongRoundedIcon    from '@mui/icons-material/ReceiptLongRounded';
import UndoRoundedIcon           from '@mui/icons-material/UndoRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  listOwnerFees,
  getOwnerFeesSummary,
  createOwnerFee,
  createOwnerFeesBulk,
  generateOwnerFeesFromBatches,
  updateOwnerFee,
  removeOwnerFee,
  recordOwnerPayment,
  listOwnerPayments,
  listOwnerStudents,
  listOwnerBatches,
  listOwnerPlatformInvoices,
  refundOwnerPayment,
  sendOwnerFeeReminder,
  getOwnerFeeInvoice,
  type OwnerFee,
  type OwnerBatch,
  type FeeStatus,
  type OwnerFeeFilters,
  type PaymentMode,
  type OwnerFeeInvoice,
  type OwnerPayment,
  type GenerateFromBatchesResult,
} from '../../api/owner.api';
import { downloadCsv } from '../../utils/csv';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { DialogHeader, DialogFooter } from '../../components/common/DialogHeader';
import { BRAND, STATUS_COLORS } from '../../theme';

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const todayIso = () => new Date().toISOString().slice(0, 10);

const STATUS_STYLE: Record<FeeStatus, { bg: string; color: string }> = {
  Paid:          { bg: '#ECFDF5', color: STATUS_COLORS.approved },
  Pending:       { bg: '#FEF3C7', color: '#D97706' },
  PartiallyPaid: { bg: '#EFF6FF', color: '#3B82F6' },
  Overdue:       { bg: '#FEF2F2', color: STATUS_COLORS.rejected },
};

function FeeStatusChip({ status }: { status: FeeStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <Chip
      label={status}
      size="small"
      sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: s.bg, color: s.color }}
    />
  );
}

/* ------------------------------------------------------------------ Create dialog */
function CreateFeeDialog({
  open,
  onClose,
  centerId,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
}) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const studentsQuery = useQuery({
    queryKey: ['owner', 'students', centerId],
    queryFn: () => listOwnerStudents(centerId),
    enabled: open,
  });
  const batchesQuery = useQuery({
    queryKey: ['owner', 'batches', centerId],
    queryFn: () => listOwnerBatches(centerId),
    enabled: open,
  });

  const [studentId, setStudentId] = useState('');
  const [batchId, setBatchId]     = useState('');
  const [amount, setAmount]       = useState('');
  const [dueDate, setDueDate]     = useState(todayIso());
  const [notes, setNotes]         = useState('');

  const valid = studentId && Number(amount) > 0 && dueDate;

  const mut = useMutation({
    mutationFn: () =>
      createOwnerFee(centerId, {
        student_id: studentId,
        batch_id: batchId || null,
        amount: Number(amount),
        due_date: dueDate,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'fees', centerId] });
      qc.invalidateQueries({ queryKey: ['owner', 'fees', 'summary', centerId] });
      showSnack('Fee created', 'success');
      setStudentId(''); setBatchId(''); setAmount(''); setNotes('');
      onClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  return (
    <Dialog open={open} onClose={() => !mut.isPending && onClose()} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogHeader
        icon={<AddRoundedIcon sx={{ fontSize: 20 }} />}
        title="Create Fee"
        onClose={() => !mut.isPending && onClose()}
        disabled={mut.isPending}
      />
      <DialogContent sx={{ py: 2.5 }}>
        <Stack gap={2}>
          <TextField
            select fullWidth required size="small" label="Student"
            value={studentId} onChange={(e) => setStudentId(e.target.value)}
            disabled={studentsQuery.isLoading}
          >
            {(studentsQuery.data?.items ?? []).map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select fullWidth size="small" label="Batch (optional)"
            value={batchId} onChange={(e) => setBatchId(e.target.value)}
          >
            <MenuItem value="">— none —</MenuItem>
            {(batchesQuery.data ?? []).map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.course_name} — {b.batch_name}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" gap={2}>
            <TextField
              fullWidth required size="small" label="Amount" type="number" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
            <TextField
              fullWidth required size="small" label="Due date" type="date"
              value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
          <TextField
            label="Notes (optional)" size="small" value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline minRows={2} fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose} disabled={mut.isPending} sx={{ color: BRAND.textSecondary, fontSize: 13 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={mut.isPending ? <CircularProgress size={13} color="inherit" /> : <AddRoundedIcon />}
          onClick={() => mut.mutate()}
          disabled={!valid || mut.isPending}
          sx={{
            fontSize: 13, fontWeight: 600, px: 2.5,
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
          }}
        >
          {mut.isPending ? 'Saving…' : 'Create fee'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Bulk dialog */
function BulkFeesDialog({
  open,
  onClose,
  centerId,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
}) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const batchesQuery = useQuery({
    queryKey: ['owner', 'batches', centerId],
    queryFn: () => listOwnerBatches(centerId),
    enabled: open,
  });

  const [batchId, setBatchId] = useState('');
  const [amount, setAmount]   = useState('');
  const [dueDate, setDueDate] = useState(todayIso());
  const [notes, setNotes]     = useState('');

  const valid = batchId && Number(amount) > 0 && dueDate;

  const mut = useMutation({
    mutationFn: () =>
      createOwnerFeesBulk(centerId, {
        batch_id: batchId,
        amount: Number(amount),
        due_date: dueDate,
        notes: notes.trim() || null,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['owner', 'fees', centerId] });
      qc.invalidateQueries({ queryKey: ['owner', 'fees', 'summary', centerId] });
      showSnack(`Created ${res.created} fees`, 'success');
      setBatchId(''); setAmount(''); setNotes('');
      onClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  return (
    <Dialog open={open} onClose={() => !mut.isPending && onClose()} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogHeader
        icon={<GroupAddRoundedIcon sx={{ fontSize: 20 }} />}
        title="Bill Entire Batch"
        subtitle="Creates one fee row per active student in the batch"
        onClose={() => !mut.isPending && onClose()}
        disabled={mut.isPending}
      />
      <DialogContent sx={{ py: 2.5 }}>
        <Stack gap={2}>
          <TextField
            select fullWidth required size="small" label="Batch"
            value={batchId} onChange={(e) => setBatchId(e.target.value)}
            disabled={batchesQuery.isLoading}
          >
            {(batchesQuery.data ?? []).filter((b) => b.is_active).map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.course_name} — {b.batch_name}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" gap={2}>
            <TextField
              fullWidth required size="small" label="Amount per student" type="number"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
            />
            <TextField
              fullWidth required size="small" label="Due date" type="date"
              value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
          <TextField
            label="Notes (optional)" size="small" value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline minRows={2} fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose} disabled={mut.isPending} sx={{ color: BRAND.textSecondary, fontSize: 13 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={mut.isPending ? <CircularProgress size={13} color="inherit" /> : <GroupAddRoundedIcon />}
          onClick={() => mut.mutate()}
          disabled={!valid || mut.isPending}
          sx={{
            fontSize: 13, fontWeight: 600, px: 2.5,
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
          }}
        >
          {mut.isPending ? 'Creating…' : 'Generate fees'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Edit dialog */
function EditFeeDialog({
  fee,
  centerId,
  onClose,
}: {
  fee: OwnerFee | null;
  centerId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const [amount, setAmount]   = useState(fee?.amount ? String(fee.amount) : '');
  const [dueDate, setDueDate] = useState(fee?.due_date ?? todayIso());
  const [notes, setNotes]     = useState(fee?.notes ?? '');

  // Reset when a different fee is opened
  useMemo(() => {
    if (fee) {
      setAmount(String(fee.amount));
      setDueDate(fee.due_date);
      setNotes(fee.notes ?? '');
    }
  }, [fee?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mut = useMutation({
    mutationFn: () =>
      updateOwnerFee(centerId, fee!.id, {
        amount: Number(amount),
        due_date: dueDate,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'fees', centerId] });
      qc.invalidateQueries({ queryKey: ['owner', 'fees', 'summary', centerId] });
      showSnack('Fee updated', 'success');
      onClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  if (!fee) return null;

  return (
    <Dialog open onClose={() => !mut.isPending && onClose()} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogHeader
        icon={<EditRoundedIcon sx={{ fontSize: 20 }} />}
        title="Edit Fee"
        subtitle={fee.student_name}
        onClose={() => !mut.isPending && onClose()}
        disabled={mut.isPending}
      />
      <DialogContent sx={{ py: 2.5 }}>
        <Stack gap={2}>
          <Stack direction="row" gap={2}>
            <TextField
              fullWidth size="small" label="Amount" type="number" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            />
            <TextField
              fullWidth size="small" label="Due date" type="date" value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
          <TextField
            label="Notes" size="small" value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline minRows={2} fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose} disabled={mut.isPending} sx={{ color: BRAND.textSecondary, fontSize: 13 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={mut.isPending ? <CircularProgress size={13} color="inherit" /> : <EditRoundedIcon />}
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          sx={{
            fontSize: 13, fontWeight: 600, px: 2.5,
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
          }}
        >
          {mut.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Record payment + view payments */
function PaymentDialog({
  fee,
  centerId,
  onClose,
  onInvoice,
}: {
  fee: OwnerFee | null;
  centerId: string;
  onClose: () => void;
  onInvoice: (fee: OwnerFee) => void;
}) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const paymentsQuery = useQuery({
    queryKey: ['owner', 'payments', centerId, fee?.id],
    queryFn: () => listOwnerPayments(centerId, fee!.id),
    enabled: !!fee,
  });

  const [mode, setMode]               = useState<PaymentMode>('UPI');
  const [amountPaid, setAmountPaid]   = useState('');
  const [txnId, setTxnId]             = useState('');

  const remaining = fee ? fee.amount - fee.paid_amount : 0;
  const valid = fee && Number(amountPaid) > 0 && Number(amountPaid) <= remaining;

  const mut = useMutation({
    mutationFn: () =>
      recordOwnerPayment(centerId, fee!.id, {
        mode,
        amount_paid: Number(amountPaid),
        transaction_id: txnId.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'fees', centerId] });
      qc.invalidateQueries({ queryKey: ['owner', 'fees', 'summary', centerId] });
      qc.invalidateQueries({ queryKey: ['owner', 'payments', centerId, fee?.id] });
      showSnack('Payment recorded', 'success');
      setAmountPaid(''); setTxnId('');
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  // Refund flow — caches the row + asks for an optional reason
  const [refundTarget, setRefundTarget] = useState<OwnerPayment | null>(null);
  const [refundReason, setRefundReason] = useState('');

  const refundMut = useMutation({
    mutationFn: () =>
      refundOwnerPayment(centerId, fee!.id, refundTarget!.id, refundReason.trim() || undefined),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['owner', 'fees', centerId] });
      qc.invalidateQueries({ queryKey: ['owner', 'fees', 'summary', centerId] });
      qc.invalidateQueries({ queryKey: ['owner', 'payments', centerId, fee?.id] });
      showSnack(`Refunded ${fmtINR(res.refunded_amount)}`, 'success');
      setRefundTarget(null); setRefundReason('');
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  if (!fee) return null;

  return (
    <Dialog open onClose={() => !mut.isPending && onClose()} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogHeader
        icon={<PaidRoundedIcon sx={{ fontSize: 20 }} />}
        title="Record Payment"
        subtitle={`${fee.student_name} · due ${fee.due_date}`}
        onClose={() => !mut.isPending && onClose()}
        disabled={mut.isPending}
      />
      <DialogContent sx={{ py: 2.5 }}>
        {/* Snapshot strip */}
        <Box sx={{
          mb: 2.5, p: 2, borderRadius: 2,
          border: `1px solid ${BRAND.divider}`, bgcolor: BRAND.surface,
        }}>
          <Stack direction="row" justifyContent="space-between" gap={2} flexWrap="wrap">
            <Snip label="Total"        value={fmtINR(fee.amount)} />
            <Snip label="Paid so far"  value={fmtINR(fee.paid_amount)} color={STATUS_COLORS.approved} />
            <Snip label="Remaining"    value={fmtINR(remaining)} color={remaining > 0 ? '#D97706' : STATUS_COLORS.approved} />
            <Box><FeeStatusChip status={fee.status} /></Box>
          </Stack>
        </Box>

        <Typography sx={{ fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
          textTransform: 'uppercase', letterSpacing: 0.6, mb: 1 }}>
          New payment
        </Typography>
        <Stack gap={2}>
          <Stack direction="row" gap={2}>
            <TextField
              select fullWidth label="Mode" value={mode}
              onChange={(e) => setMode(e.target.value as PaymentMode)}
            >
              {(['UPI','Cash','Card','NetBanking','BankTransfer'] as PaymentMode[]).map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth label="Amount" type="number" value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              helperText={`Max ${fmtINR(remaining)}`}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              disabled={remaining <= 0}
            />
          </Stack>
          <TextField
            fullWidth label="Transaction / reference (optional)"
            value={txnId} onChange={(e) => setTxnId(e.target.value)}
          />
          <Button
            variant="contained" startIcon={<PaidRoundedIcon />}
            disabled={!valid || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? 'Recording…' : 'Record payment'}
          </Button>
        </Stack>

        {(paymentsQuery.data ?? []).length > 0 && (
          <>
            <Divider sx={{ my: 2.5 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
              textTransform: 'uppercase', letterSpacing: 0.6, mb: 1 }}>
              Payment history
            </Typography>
            <Box>
              {(paymentsQuery.data ?? []).map((p) => {
                const refunded = p.status === 'Refunded';
                return (
                  <Stack
                    key={p.id} direction="row" alignItems="center" gap={1.5}
                    sx={{
                      py: 1,
                      opacity: refunded ? 0.7 : 1,
                      '&:not(:last-child)': { borderBottom: `1px dashed ${BRAND.divider}` },
                    }}
                  >
                    <Avatar sx={{
                      width: 28, height: 28,
                      bgcolor: refunded ? '#FEF2F2' : '#ECFDF5',
                      color: refunded ? STATUS_COLORS.rejected : STATUS_COLORS.approved,
                      fontSize: 13, borderRadius: '8px',
                    }}>
                      {refunded ? <UndoRoundedIcon sx={{ fontSize: 16 }} /> : <PaidRoundedIcon sx={{ fontSize: 16 }} />}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600,
                        textDecoration: refunded ? 'line-through' : 'none' }}>
                        {fmtINR(p.amount_paid)}{' '}
                        <span style={{ color: BRAND.textSecondary, fontWeight: 500 }}>· {p.mode}</span>
                        {refunded && (
                          <Chip
                            label="Refunded" size="small"
                            sx={{
                              ml: 1, height: 16, fontSize: 9.5, fontWeight: 700,
                              bgcolor: '#FEF2F2', color: STATUS_COLORS.rejected,
                            }}
                          />
                        )}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }} noWrap>
                        {p.paid_at ? new Date(p.paid_at).toLocaleString('en-IN') : '—'}
                        {p.transaction_id ? ` · ref ${p.transaction_id}` : ''}
                        {refunded && p.refunded_at ? ` · refunded ${new Date(p.refunded_at).toLocaleDateString('en-IN')}` : ''}
                      </Typography>
                      {refunded && p.refund_reason && (
                        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, fontStyle: 'italic' }}>
                          “{p.refund_reason}”
                        </Typography>
                      )}
                    </Box>
                    {!refunded && p.status === 'Success' && (
                      <Tooltip title="Refund this payment">
                        <IconButton size="small" onClick={() => setRefundTarget(p)}>
                          <UndoRoundedIcon sx={{ fontSize: 17, color: STATUS_COLORS.rejected }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                );
              })}
            </Box>
          </>
        )}

        {/* Refund confirm dialog (nested) */}
        <Dialog
          open={!!refundTarget}
          onClose={() => !refundMut.isPending && setRefundTarget(null)}
          maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
        >
          <DialogHeader
            icon={<UndoRoundedIcon sx={{ fontSize: 20 }} />}
            title="Refund Payment"
            subtitle={refundTarget ? `${fmtINR(refundTarget.amount_paid)} via ${refundTarget.mode}` : undefined}
            onClose={() => !refundMut.isPending && setRefundTarget(null)}
            disabled={refundMut.isPending}
          />
          <DialogContent sx={{ py: 2.5 }}>
            {refundTarget && (
              <Stack gap={2}>
                <Box sx={{
                  p: 1.5, borderRadius: 2,
                  border: `1px solid ${BRAND.divider}`, bgcolor: BRAND.surface,
                }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    {fmtINR(refundTarget.amount_paid)} via {refundTarget.mode}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
                    {refundTarget.paid_at ? new Date(refundTarget.paid_at).toLocaleString('en-IN') : '—'}
                  </Typography>
                </Box>
                <TextField
                  label="Reason (optional)"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  multiline minRows={2} size="small" fullWidth
                />
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                  The fee status will recalculate automatically. This action cannot be undone.
                </Typography>
              </Stack>
            )}
          </DialogContent>
          <DialogFooter>
            <Button onClick={() => setRefundTarget(null)} disabled={refundMut.isPending}
              sx={{ color: BRAND.textSecondary, fontSize: 13 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={refundMut.isPending ? <CircularProgress size={13} color="inherit" /> : <UndoRoundedIcon />}
              onClick={() => refundMut.mutate()}
              disabled={refundMut.isPending}
              sx={{ fontSize: 13, fontWeight: 600, px: 2.5, background: '#DC2626', '&:hover': { background: '#B91C1C' } }}
            >
              {refundMut.isPending ? 'Refunding…' : 'Confirm refund'}
            </Button>
          </DialogFooter>
        </Dialog>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose} sx={{ color: BRAND.textSecondary, fontSize: 13 }}>Close</Button>
        <Button
          variant="outlined"
          startIcon={<ReceiptLongRoundedIcon />}
          onClick={() => { onClose(); onInvoice(fee!); }}
          sx={{ fontSize: 13, fontWeight: 600, borderColor: BRAND.primary, color: BRAND.primary }}
        >
          Generate Invoice
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function Snip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: BRAND.textSecondary, letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 16, fontWeight: 800, color: color ?? BRAND.textPrimary }}>
        {value}
      </Typography>
    </Box>
  );
}

/* ------------------------------------------------------------------ Invoice modal (GST-aware) */
function InvoiceDialog({
  fee,
  centerId,
  onClose,
}: {
  fee: OwnerFee | null;
  centerId: string;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['owner', 'fee-invoice', centerId, fee?.id],
    queryFn: () => getOwnerFeeInvoice(centerId, fee!.id),
    enabled: !!fee,
  });

  if (!fee) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogHeader
        icon={<ReceiptLongRoundedIcon sx={{ fontSize: 20 }} />}
        title="Invoice"
        subtitle={data?.invoice_number}
        onClose={onClose}
      />
      <DialogContent sx={{ py: 2.5 }}>
        {isLoading && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={28} sx={{ color: BRAND.primary }} />
          </Box>
        )}
        {isError && (
          <Typography sx={{ color: STATUS_COLORS.rejected, py: 4, textAlign: 'center' }}>
            {(error as Error)?.message ?? 'Failed to load invoice.'}
          </Typography>
        )}
        {data && <InvoiceBody data={data} />}
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose} sx={{ color: BRAND.textSecondary, fontSize: 13 }}>Close</Button>
        <Button
          variant="contained"
          startIcon={<DownloadRoundedIcon />}
          onClick={() => window.print()}
          disabled={!data}
          sx={{
            fontSize: 13, fontWeight: 600, px: 2.5,
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
          }}
        >
          Print / save PDF
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function InvoiceBody({ data }: { data: OwnerFeeInvoice }) {
  const c = data.center;
  const f = data.fee;
  const t = data.tax;
  const s = data.student;

  const addressLine = [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ');

  return (
    <Box id={`invoice-${f.id}`} sx={{
      p: 3, border: `1px solid ${BRAND.divider}`, borderRadius: 2, bgcolor: '#fff',
    }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: BRAND.textPrimary }}>
            {c.name}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
            {addressLine}
          </Typography>
          {c.mobile_number && (
            <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
              Phone: {c.mobile_number}
            </Typography>
          )}
          {c.gstin && (
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: BRAND.textPrimary, mt: 0.5 }}>
              GSTIN: {c.gstin}
            </Typography>
          )}
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: BRAND.textSecondary,
            textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {t.has_gst ? 'Tax invoice' : 'Receipt'}
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: BRAND.textPrimary }}>
            {data.invoice_number}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Grid container spacing={2}>
        <Grid item xs={7}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: BRAND.textSecondary,
            textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Bill to
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: BRAND.textPrimary, mt: 0.25 }}>
            {s.name}
          </Typography>
          {s.parent_name && (
            <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
              c/o {s.parent_name}
              {s.parent_mobile ? ` · ${s.parent_mobile}` : ''}
            </Typography>
          )}
          {s.parent_email && (
            <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
              {s.parent_email}
            </Typography>
          )}
        </Grid>
        <Grid item xs={5} sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: BRAND.textSecondary,
            textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Due date
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: BRAND.textPrimary, mt: 0.25 }}>
            {f.due_date}
          </Typography>
        </Grid>
      </Grid>

      {/* Line items */}
      <Box sx={{ mt: 2.5, border: `1px solid ${BRAND.divider}`, borderRadius: 1.5 }}>
        <Stack direction="row" sx={{
          px: 2, py: 1, bgcolor: BRAND.surface, borderBottom: `1px solid ${BRAND.divider}`,
        }}>
          <Typography sx={{ flex: 1, fontSize: 11, fontWeight: 700, color: BRAND.textSecondary, letterSpacing: 0.5 }}>
            Description
          </Typography>
          <Typography sx={{ width: 110, textAlign: 'right', fontSize: 11, fontWeight: 700, color: BRAND.textSecondary, letterSpacing: 0.5 }}>
            Amount
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ px: 2, py: 1.25 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
              {data.batch
                ? `${data.batch.course_name} — ${data.batch.batch_name}`
                : 'Tuition fee'}
            </Typography>
            {f.notes && (
              <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
                {f.notes}
              </Typography>
            )}
          </Box>
          <Typography sx={{ width: 110, textAlign: 'right', fontSize: 13.5, fontWeight: 600 }}>
            {fmtINR(t.has_gst ? t.base_amount : f.amount)}
          </Typography>
        </Stack>
      </Box>

      {/* Totals */}
      <Stack direction="row" justifyContent="flex-end" mt={2}>
        <Box sx={{ width: 280 }}>
          {t.has_gst ? (
            <>
              <Row label="Sub-total"   value={fmtINR(t.base_amount)} />
              <Row label={`CGST @ ${t.half_rate}%`} value={fmtINR(t.cgst_amount)} />
              <Row label={`SGST @ ${t.half_rate}%`} value={fmtINR(t.sgst_amount)} />
              <Divider sx={{ my: 0.5 }} />
              <Row label="Total"       value={fmtINR(t.total_amount)} bold />
            </>
          ) : (
            <Row label="Total" value={fmtINR(f.amount)} bold />
          )}
          <Row label="Paid" value={fmtINR(f.paid_amount)} valueColor={STATUS_COLORS.approved} />
          <Divider sx={{ my: 0.5 }} />
          <Row
            label="Balance due" bold
            value={fmtINR(f.outstanding)}
            valueColor={f.outstanding > 0 ? STATUS_COLORS.rejected : STATUS_COLORS.approved}
            valueSize={15}
          />
        </Box>
      </Stack>

      <Box sx={{ mt: 2.5, pt: 1.5, borderTop: `1px dashed ${BRAND.divider}` }}>
        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, textAlign: 'center' }}>
          {t.has_gst
            ? 'This is a computer-generated tax invoice. GST is included in the amount above.'
            : 'Thank you. Generated by SiraguWings.'}
        </Typography>
      </Box>
    </Box>
  );
}

function Row({
  label, value, bold, valueColor, valueSize,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
  valueSize?: number;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" py={0.5}>
      <Typography sx={{
        fontSize: 12.5, color: bold ? BRAND.textPrimary : BRAND.textSecondary,
        fontWeight: bold ? 700 : 500,
      }}>
        {label}
      </Typography>
      <Typography sx={{
        fontSize: valueSize ?? 13, fontWeight: bold ? 800 : 700,
        color: valueColor ?? BRAND.textPrimary,
      }}>
        {value}
      </Typography>
    </Stack>
  );
}

/* ------------------------------------------------------------------ Reminder dialog */
function ReminderDialog({
  fee,
  centerId,
  onClose,
}: {
  fee: OwnerFee | null;
  centerId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const [message, setMessage] = useState('');

  const mut = useMutation({
    mutationFn: () => sendOwnerFeeReminder(centerId, fee!.id, message.trim() || undefined),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['owner', 'fees', centerId] });
      showSnack(`Reminder sent for ${fmtINR(res.outstanding)}`, 'success');
      setMessage('');
      onClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  if (!fee) return null;

  return (
    <Dialog open onClose={() => !mut.isPending && onClose()} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogHeader
        icon={<NotificationsActiveRoundedIcon sx={{ fontSize: 20 }} />}
        title="Send Fee Reminder"
        subtitle={`${fee.student_name} · ${fmtINR(fee.outstanding)} outstanding · due ${fee.due_date}`}
        onClose={() => !mut.isPending && onClose()}
        disabled={mut.isPending}
      />
      <DialogContent sx={{ py: 2.5 }}>
        {!fee.has_parent ? (
          <Box sx={{
            p: 2, borderRadius: 2, bgcolor: '#FEF2F2',
            border: `1px solid ${STATUS_COLORS.rejected}33`,
          }}>
            <Typography sx={{ fontSize: 13, color: STATUS_COLORS.rejected, fontWeight: 600 }}>
              No parent linked
            </Typography>
            <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
              Link a parent to {fee.student_name} from Students before sending a reminder.
            </Typography>
          </Box>
        ) : (
          <Stack gap={2}>
            <Typography sx={{ fontSize: 12.5, color: BRAND.textSecondary }}>
              The parent will receive an in-app notification. Leave the message blank to
              use the default reminder template.
            </Typography>
            <TextField
              label="Custom message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline minRows={3} size="small" fullWidth
              inputProps={{ maxLength: 1000 }}
              helperText={`${message.length} / 1000`}
            />
            {fee.reminder_count > 0 && (
              <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
                Previous reminders sent: {fee.reminder_count}
                {fee.reminder_sent_at
                  ? ` · last on ${new Date(fee.reminder_sent_at).toLocaleDateString('en-IN')}`
                  : ''}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose} disabled={mut.isPending} sx={{ color: BRAND.textSecondary, fontSize: 13 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={mut.isPending ? <CircularProgress size={13} color="inherit" /> : <NotificationsActiveRoundedIcon />}
          onClick={() => mut.mutate()}
          disabled={!fee.has_parent || mut.isPending}
          sx={{
            fontSize: 13, fontWeight: 600, px: 2.5,
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
          }}
        >
          {mut.isPending ? 'Sending…' : 'Send reminder'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Generate Bills dialog */
function GenerateBillsDialog({
  open,
  onClose,
  centerId,
}: {
  open: boolean;
  onClose: () => void;
  centerId: string;
}) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const batchesQuery = useQuery({
    queryKey: ['owner', 'batches', centerId],
    queryFn: () => listOwnerBatches(centerId),
    enabled: open,
  });

  const activeBatches: OwnerBatch[] = (batchesQuery.data ?? []).filter((b) => b.is_active);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate]   = useState(() => {
    // Default to last day of current month
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const [notes, setNotes]       = useState('');
  const [result, setResult]     = useState<GenerateFromBatchesResult | null>(null);

  // Select all when batches load
  useMemo(() => {
    if (open && activeBatches.length > 0 && selected.size === 0) {
      setSelected(new Set(activeBatches.map((b) => b.id)));
    }
  }, [open, activeBatches.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allChecked   = activeBatches.length > 0 && selected.size === activeBatches.length;
  const someChecked  = selected.size > 0 && !allChecked;
  const toggleAll    = () => setSelected(allChecked ? new Set() : new Set(activeBatches.map((b) => b.id)));

  const totalStudents = activeBatches.filter((b) => selected.has(b.id)).reduce((s, b) => s + b.student_count, 0);

  const mut = useMutation({
    mutationFn: () =>
      generateOwnerFeesFromBatches(centerId, {
        batch_ids: Array.from(selected),
        due_date: dueDate,
        notes: notes.trim() || null,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['owner', 'fees', centerId] });
      qc.invalidateQueries({ queryKey: ['owner', 'fees', 'summary', centerId] });
      setResult(res);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const handleClose = () => {
    setResult(null);
    setSelected(new Set());
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={() => !mut.isPending && handleClose()} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogHeader
        icon={<AutoFixHighRoundedIcon sx={{ fontSize: 20 }} />}
        title="Generate Bills"
        subtitle="Auto-raises one fee per student using each batch's set amount"
        onClose={() => !mut.isPending && handleClose()}
        disabled={mut.isPending}
      />
      <DialogContent sx={{ py: 2.5 }}>
        {result ? (
          /* Success summary */
          <Stack gap={2}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#ECFDF5', border: '1px solid #6EE7B7' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: STATUS_COLORS.approved }}>
                {result.created} bill{result.created !== 1 ? 's' : ''} generated
                {result.skipped > 0 ? `, ${result.skipped} skipped (already billed this month)` : ''}
              </Typography>
            </Box>
            {result.batches.map((b) => (
              <Stack key={b.batch_id} direction="row" justifyContent="space-between" alignItems="center"
                sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: BRAND.surface }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{b.batch_name}</Typography>
                <Typography sx={{ fontSize: 12.5, color: BRAND.textSecondary }}>
                  {b.created} created{b.skipped > 0 ? `, ${b.skipped} skipped` : ''}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Stack gap={2.5}>
            {/* Batch list */}
            <Box>
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <Checkbox
                  size="small" checked={allChecked} indeterminate={someChecked}
                  onChange={toggleAll} sx={{ p: 0.5 }}
                />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
                  textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {selected.size} of {activeBatches.length} batches selected · {totalStudents} students
                </Typography>
              </Stack>
              <Box sx={{ border: `1px solid ${BRAND.divider}`, borderRadius: 2, overflow: 'hidden' }}>
                {batchesQuery.isLoading ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <CircularProgress size={22} sx={{ color: BRAND.primary }} />
                  </Box>
                ) : activeBatches.length === 0 ? (
                  <Typography sx={{ p: 2.5, textAlign: 'center', fontSize: 13, color: BRAND.textSecondary }}>
                    No active batches. Add batches with a fee amount first.
                  </Typography>
                ) : (
                  activeBatches.map((b, i) => (
                    <Stack
                      key={b.id}
                      direction="row" alignItems="center" gap={1.5}
                      onClick={() => toggle(b.id)}
                      sx={{
                        px: 1.5, py: 1.25, cursor: 'pointer',
                        borderTop: i > 0 ? `1px solid ${BRAND.divider}` : 'none',
                        bgcolor: selected.has(b.id) ? BRAND.primary + '08' : 'transparent',
                        '&:hover': { bgcolor: BRAND.primary + '0D' },
                      }}
                    >
                      <Checkbox size="small" checked={selected.has(b.id)} onChange={() => toggle(b.id)}
                        onClick={(e) => e.stopPropagation()} sx={{ p: 0.5 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap>
                          {b.course_name} — {b.batch_name}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
                          {b.student_count} student{b.student_count !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: BRAND.primary, whiteSpace: 'nowrap' }}>
                        {fmtINR(b.fee_amount)}
                      </Typography>
                    </Stack>
                  ))
                )}
              </Box>
            </Box>

            {/* Due date */}
            <TextField
              fullWidth required size="small" label="Due date" type="date"
              value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Bills already raised for the same batch in the same month will be skipped."
            />

            <TextField
              label="Notes (optional)" size="small" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline minRows={2} fullWidth
            />
          </Stack>
        )}
      </DialogContent>
      <DialogFooter>
        <Button onClick={handleClose} disabled={mut.isPending} sx={{ color: BRAND.textSecondary, fontSize: 13 }}>
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && (
          <Button
            variant="contained"
            startIcon={mut.isPending ? <CircularProgress size={13} color="inherit" /> : <AutoFixHighRoundedIcon />}
            onClick={() => mut.mutate()}
            disabled={selected.size === 0 || !dueDate || mut.isPending}
            sx={{
              fontSize: 13, fontWeight: 600, px: 2.5,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
            }}
          >
            {mut.isPending ? 'Generating…' : `Generate for ${selected.size} batch${selected.size !== 1 ? 'es' : ''}`}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Page */
export default function OwnerFeesPage() {
  const { centerId, centers } = useOwnerCenter();
  const centerName = centers.find((c) => c.id === centerId)?.name ?? '';

  const [tab, setTab] = useState<'fees' | 'platform'>('fees');
  const [filters, setFilters] = useState<OwnerFeeFilters>({});
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(0);
  const PAGE_SIZE = 25;

  const [adding, setAdding]               = useState(false);
  const [generating, setGenerating]       = useState(false);
  const [bulking, setBulking]             = useState(false);
  const [editing, setEditing]             = useState<OwnerFee | null>(null);
  const [paying, setPaying]               = useState<OwnerFee | null>(null);
  const [invoicing, setInvoicing]         = useState<OwnerFee | null>(null);
  const [reminding, setReminding]         = useState<OwnerFee | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<OwnerFee | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['owner', 'fees', 'summary', centerId],
    queryFn: () => getOwnerFeesSummary(centerId!),
    enabled: !!centerId,
  });

  const feesQuery = useQuery({
    queryKey: ['owner', 'fees', centerId, filters, page],
    queryFn: () => listOwnerFees(centerId!, filters, page + 1, PAGE_SIZE),
    enabled: !!centerId && tab === 'fees',
    placeholderData: keepPreviousData,
  });

  const invoicesQuery = useQuery({
    queryKey: ['owner', 'platformInvoices', centerId],
    queryFn: () => listOwnerPlatformInvoices(centerId!),
    enabled: !!centerId && tab === 'platform',
  });

  const filtered = useMemo(() => {
    const list = feesQuery.data?.items ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((f) =>
      f.student_name.toLowerCase().includes(q) ||
      (f.batch_name ?? '').toLowerCase().includes(q) ||
      (f.course_name ?? '').toLowerCase().includes(q),
    );
  }, [feesQuery.data, search]);

  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const removeMut = useMutation({
    mutationFn: (id: string) => removeOwnerFee(centerId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'fees', centerId] });
      qc.invalidateQueries({ queryKey: ['owner', 'fees', 'summary', centerId] });
      showSnack('Fee deleted', 'success');
      setDeleteTarget(null);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const exportCsv = () => {
    const rows = filtered;
    if (rows.length === 0) {
      showSnack('Nothing to export', 'info');
      return;
    }
    downloadCsv(
      ['Student', 'Batch', 'Amount', 'Paid', 'Outstanding', 'Status', 'Due date', 'Notes'],
      rows.map((f) => [
        f.student_name,
        f.batch_name ?? '',
        f.amount,
        f.paid_amount,
        f.outstanding,
        f.status,
        f.due_date,
        f.notes ?? '',
      ]),
      `fees-${centerName}-${todayIso()}`,
    );
  };

  if (!centerId) {
    return (
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: '32px !important', textAlign: 'center' }}>
          <Typography sx={{ color: BRAND.textSecondary }}>
            Select a center to manage its fees.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const sum = summaryQuery.data;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: BRAND.textPrimary }}>
            Fees &amp; Invoices
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
            {centerName} &middot; bill students, record payments, view what SiraguWings bills you
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={exportCsv}>
            Export CSV
          </Button>
          <Button variant="outlined" startIcon={<GroupAddRoundedIcon />} onClick={() => setBulking(true)}>
            Bill batch
          </Button>
          <Button
            variant="contained"
            startIcon={<AutoFixHighRoundedIcon />}
            onClick={() => setGenerating(true)}
            sx={{
              fontWeight: 600,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
            }}
          >
            Generate Bills
          </Button>
          <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setAdding(true)}>
            New fee
          </Button>
        </Stack>
      </Stack>

      {/* Summary KPIs */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {[
          { label: 'Total billed',  value: fmtINR(sum?.total_billed ?? 0),    color: BRAND.primary },
          { label: 'Collected',     value: fmtINR(sum?.collected ?? 0),       color: STATUS_COLORS.approved },
          { label: 'Outstanding',   value: fmtINR(sum?.outstanding ?? 0),     color: '#D97706',
            sub: sum && sum.collection_pct ? `${sum.collection_pct}% collected` : undefined },
          { label: 'Overdue',       value: fmtINR(sum?.overdue_amount ?? 0),  color: STATUS_COLORS.rejected,
            sub: sum ? `${sum.overdue_count} fees` : undefined },
        ].map((k) => (
          <Grid key={k.label} item xs={6} md={3}>
            <Card sx={{ borderRadius: '14px' }}>
              <CardContent sx={{ p: '16px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Avatar sx={{
                    width: 32, height: 32,
                    bgcolor: k.color + '15', color: k.color,
                    borderRadius: '10px',
                  }}>
                    <CurrencyRupeeRoundedIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                </Stack>
                {summaryQuery.isLoading ? (
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: BRAND.textSecondary }}>—</Typography>
                ) : (
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: k.color, lineHeight: 1.1 }}>
                    {k.value}
                  </Typography>
                )}
                <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary, fontWeight: 600, mt: 0.5 }}>
                  {k.label}
                </Typography>
                {k.sub && (
                  <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, mt: 0.25 }}>
                    {k.sub}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {sum && sum.total_billed > 0 && (
        <Card sx={{ borderRadius: '14px', mb: 2.5 }}>
          <CardContent sx={{ p: '14px 18px !important' }}>
            <Stack direction="row" justifyContent="space-between" mb={0.75}>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: 600 }}>
                Collection progress
              </Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textPrimary, fontWeight: 700 }}>
                {fmtINR(sum.collected)} / {fmtINR(sum.total_billed)} ({sum.collection_pct}%)
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate" value={Math.min(100, sum.collection_pct)}
              sx={{
                height: 8, borderRadius: 4,
                bgcolor: BRAND.divider,
                '& .MuiLinearProgress-bar': { bgcolor: STATUS_COLORS.approved, borderRadius: 4 },
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Card sx={{ borderRadius: '16px', mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 } }}
        >
          <Tab value="fees"     label={`Student fees (${feesQuery.data?.total ?? 0})`} />
          <Tab value="platform" label="Platform invoices" icon={<ReceiptLongRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>
      </Card>

      {tab === 'fees' && (
        <>
          {/* Filters */}
          <Card sx={{ borderRadius: '16px', mb: 2 }}>
            <CardContent sx={{ p: '16px !important' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={5}>
                  <TextField
                    size="small" fullWidth
                    placeholder="Search student / batch / course…"
                    value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    select size="small" fullWidth label="Status"
                    value={filters.status ?? ''}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, status: (e.target.value || undefined) as FeeStatus | undefined }));
                      setPage(0);
                    }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="PartiallyPaid">Partially paid</MenuItem>
                    <MenuItem value="Paid">Paid</MenuItem>
                    <MenuItem value="Overdue">Overdue</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    size="small" fullWidth type="date" label="From"
                    value={filters.start ?? ''}
                    onChange={(e) => { setFilters((f) => ({ ...f, start: e.target.value || undefined })); setPage(0); }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField
                    size="small" fullWidth type="date" label="To"
                    value={filters.end ?? ''}
                    onChange={(e) => { setFilters((f) => ({ ...f, end: e.target.value || undefined })); setPage(0); }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Fees table */}
          <Card sx={{ borderRadius: '16px' }}>
            <CardContent sx={{ p: 0 }}>
              {feesQuery.isLoading ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <CircularProgress size={28} sx={{ color: BRAND.primary }} />
                </Box>
              ) : filtered.length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Avatar sx={{
                    width: 56, height: 56, bgcolor: BRAND.primaryBg, color: BRAND.primary,
                    mx: 'auto', mb: 1.5, borderRadius: '14px',
                  }}>
                    <CurrencyRupeeRoundedIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
                    No fees match these filters
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                    Click "New fee" to create one, or "Bill batch" to invoice everyone in a batch.
                  </Typography>
                </Box>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Batch</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="right">Paid</TableCell>
                      <TableCell align="right">Outstanding</TableCell>
                      <TableCell>Due</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((f) => (
                      <TableRow key={f.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" gap={1.25}>
                            <Avatar sx={{
                              width: 32, height: 32,
                              bgcolor: BRAND.primaryBg, color: BRAND.primary,
                              fontSize: 12, fontWeight: 700,
                            }}>
                              {f.student_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                            </Avatar>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                              {f.student_name}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {f.batch_name ? (
                            <Box>
                              <Typography sx={{ fontSize: 13 }}>{f.course_name}</Typography>
                              <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                                {f.batch_name}
                              </Typography>
                            </Box>
                          ) : <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>—</Typography>}
                        </TableCell>
                        <TableCell align="right">{fmtINR(f.amount)}</TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontSize: 13, color: STATUS_COLORS.approved, fontWeight: 600 }}>
                            {fmtINR(f.paid_amount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontSize: 13, fontWeight: 700,
                            color: f.outstanding > 0 ? '#D97706' : STATUS_COLORS.approved }}>
                            {fmtINR(f.outstanding)}
                          </Typography>
                        </TableCell>
                        <TableCell>{f.due_date}</TableCell>
                        <TableCell><FeeStatusChip status={f.status} /></TableCell>
                        <TableCell align="right">
                          <Tooltip title="Record payment">
                            <span>
                              <IconButton size="small" onClick={() => setPaying(f)} disabled={f.outstanding <= 0}>
                                <PaidRoundedIcon sx={{ fontSize: 18, color: STATUS_COLORS.approved }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip
                            title={
                              !f.has_parent
                                ? 'No parent linked'
                                : f.outstanding <= 0
                                  ? 'Fee is fully paid'
                                  : f.reminder_count > 0
                                    ? `Send reminder (${f.reminder_count} sent)`
                                    : 'Send reminder'
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => setReminding(f)}
                                disabled={!f.has_parent || f.outstanding <= 0}
                              >
                                <NotificationsActiveRoundedIcon
                                  sx={{
                                    fontSize: 18,
                                    color: f.reminder_count > 0 ? '#D97706' : BRAND.textSecondary,
                                  }}
                                />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Generate Invoice">
                            <IconButton size="small" onClick={() => setInvoicing(f)}>
                              <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => setEditing(f)}>
                              <EditRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <span>
                              <IconButton size="small" onClick={() => setDeleteTarget(f)} disabled={f.paid_amount > 0}>
                                <DeleteRoundedIcon sx={{ fontSize: 18, color: STATUS_COLORS.rejected }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!feesQuery.isLoading && filtered.length > 0 && (
                <TablePagination
                  component="div"
                  count={feesQuery.data?.total ?? 0}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  rowsPerPage={PAGE_SIZE}
                  rowsPerPageOptions={[PAGE_SIZE]}
                  sx={{ borderTop: `1px solid ${BRAND.divider}` }}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'platform' && (
        <Card sx={{ borderRadius: '16px' }}>
          <CardContent sx={{ p: 0 }}>
            {invoicesQuery.isLoading ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <CircularProgress size={28} sx={{ color: BRAND.primary }} />
              </Box>
            ) : (invoicesQuery.data ?? []).length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>
                  No platform invoices yet. SiraguWings bills appear here once a billing period closes.
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">Students</TableCell>
                    <TableCell align="right">Sub-total</TableCell>
                    <TableCell align="right">GST</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Due</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(invoicesQuery.data ?? []).map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {inv.gst_invoice_url ? (
                          <Link href={inv.gst_invoice_url} target="_blank" rel="noopener" underline="hover">
                            {inv.invoice_number}
                          </Link>
                        ) : inv.invoice_number}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 12.5 }}>{inv.billing_period_start} → {inv.billing_period_end}</Typography>
                      </TableCell>
                      <TableCell align="right">{inv.student_count}</TableCell>
                      <TableCell align="right">{fmtINR(inv.sub_total)}</TableCell>
                      <TableCell align="right">{fmtINR(inv.gst_amount)} <span style={{ color: BRAND.textSecondary }}>({inv.gst_rate}%)</span></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtINR(inv.total_amount)}</TableCell>
                      <TableCell>{inv.due_date}</TableCell>
                      <TableCell>
                        <Chip
                          label={inv.status}
                          size="small"
                          sx={{
                            height: 22, fontSize: 11, fontWeight: 700,
                            bgcolor: inv.status === 'Paid' ? '#ECFDF5'
                                   : inv.status === 'Overdue' ? '#FEF2F2'
                                   : inv.status === 'Waived' ? BRAND.surface
                                   : '#FEF3C7',
                            color: inv.status === 'Paid' ? STATUS_COLORS.approved
                                  : inv.status === 'Overdue' ? STATUS_COLORS.rejected
                                  : inv.status === 'Waived' ? BRAND.textSecondary
                                  : '#D97706',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CreateFeeDialog     open={adding}     onClose={() => setAdding(false)}     centerId={centerId} />
      <GenerateBillsDialog open={generating} onClose={() => setGenerating(false)} centerId={centerId} />
      <BulkFeesDialog      open={bulking}    onClose={() => setBulking(false)}    centerId={centerId} />
      <EditFeeDialog   fee={editing} centerId={centerId} onClose={() => setEditing(null)} />
      <PaymentDialog   fee={paying}  centerId={centerId} onClose={() => setPaying(null)} onInvoice={(f) => setInvoicing(f)} />
      <InvoiceDialog   fee={invoicing} centerId={centerId} onClose={() => setInvoicing(null)} />
      <ReminderDialog  fee={reminding} centerId={centerId} onClose={() => setReminding(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete fee?"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.student_name}'s fee of ${fmtINR(deleteTarget.amount)} due ${deleteTarget.due_date}?`
            : ''
        }
        confirmLabel="Delete"
        confirmColor="error"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeMut.mutate(deleteTarget.id)}
        loading={removeMut.isPending}
      />
    </Box>
  );
}
