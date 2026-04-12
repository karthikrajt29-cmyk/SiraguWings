import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Avatar,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Paper, TextField, InputAdornment, Drawer, Divider, Button, Stack,
  CircularProgress, Alert, IconButton, Tooltip, LinearProgress,
  Tab, Tabs, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import UpgradeRoundedIcon from '@mui/icons-material/UpgradeRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  getSubscriptionDashboard, getSubscriptionPlans, getStorageAddOns,
  getCenterSubscriptions, getCenterSubscriptionDetail,
  assignPlan, purchaseStorage, refreshUsage, generateBill, updateBillingStatus,
  type CenterSubscriptionSummary, type SubscriptionPlan, type StorageAddOn,
} from '../../api/subscription.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtMB = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Free:     { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  Basic:    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Standard: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  Premium:  { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
};

const STATUS_COLOR: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  Paid: 'success', Pending: 'warning', Overdue: 'error', Waived: 'default',
};

function UsageBar({ value, max, label, color = BRAND.primary }: {
  value: number; max: number; label: string; color?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isOver = value > max;
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography fontSize={12} color="text.secondary">{label}</Typography>
        <Typography fontSize={12} fontWeight={600} color={isOver ? '#ef4444' : 'text.primary'}>
          {value} / {max}{isOver && ' ⚠'}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, pct)}
        sx={{
          height: 6, borderRadius: 3,
          bgcolor: isOver ? '#fee2e2' : '#f1f5f9',
          '& .MuiLinearProgress-bar': {
            bgcolor: isOver ? '#ef4444' : pct > 80 ? '#f59e0b' : color,
            borderRadius: 3,
          },
        }}
      />
    </Box>
  );
}

// ── Plan Card (catalogue display) ────────────────────────────────────────────

function PlanCard({
  name, price, studentLimit, storageMb, extraPrice, isCurrent, onSelect,
}: {
  name: string; price: number; studentLimit: number; storageMb: number;
  extraPrice: number; isCurrent: boolean; onSelect?: () => void;
}) {
  const c = PLAN_COLORS[name] ?? PLAN_COLORS.Basic;
  return (
    <Card sx={{
      borderRadius: 3, border: `2px solid ${isCurrent ? BRAND.primary : c.border}`,
      bgcolor: isCurrent ? BRAND.primaryBg : c.bg,
      position: 'relative', transition: 'all 0.15s',
      '&:hover': onSelect ? { boxShadow: '0 4px 20px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' } : {},
    }}>
      {isCurrent && (
        <Box sx={{
          position: 'absolute', top: 10, right: 10,
          bgcolor: BRAND.primary, color: '#fff',
          fontSize: 10, fontWeight: 700, px: 1, py: 0.3, borderRadius: 1,
        }}>
          CURRENT
        </Box>
      )}
      <CardContent>
        <Typography fontWeight={800} fontSize={18} color={c.text}>{name}</Typography>
        <Typography fontSize={26} fontWeight={800} sx={{ my: 1 }}>
          {price === 0 ? 'Free' : fmt(price)}
          {price > 0 && <Typography component="span" fontSize={13} color="text.secondary">/mo</Typography>}
        </Typography>
        <Stack spacing={0.8}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <PeopleRoundedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
            <Typography fontSize={13}>{studentLimit} students included</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <StorageRoundedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
            <Typography fontSize={13}>{fmtMB(storageMb)} storage</Typography>
          </Box>
          {extraPrice > 0 && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <PeopleRoundedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography fontSize={13}>₹{extraPrice}/extra student</Typography>
            </Box>
          )}
          {extraPrice === 0 && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <WarningRoundedIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
              <Typography fontSize={13} color="#f59e0b">No extra students (upgrade required)</Typography>
            </Box>
          )}
        </Stack>
        {onSelect && !isCurrent && (
          <Button
            fullWidth
            variant="contained"
            size="small"
            sx={{ mt: 2, bgcolor: c.text, '&:hover': { bgcolor: c.text, opacity: 0.9 } }}
            onClick={onSelect}
          >
            {price === 0 ? 'Downgrade to Free' : 'Assign Plan'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Center Detail Drawer ──────────────────────────────────────────────────────

function CenterSubscriptionDrawer({
  center, onClose,
}: {
  center: CenterSubscriptionSummary | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [storageDialog, setStorageDialog] = useState(false);
  const [selectedAddonId, setSelectedAddonId] = useState('');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['subscription-center', center?.center_id],
    queryFn: () => getCenterSubscriptionDetail(center!.center_id),
    enabled: !!center,
    staleTime: 30_000,
  });

  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans'],
    queryFn: () => getSubscriptionPlans(false),
    staleTime: 300_000,
  });

  const { data: addons = [] } = useQuery<StorageAddOn[]>({
    queryKey: ['storage-addons'],
    queryFn: () => getStorageAddOns(false),
    staleTime: 300_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['subscription-center', center!.center_id] });
    qc.invalidateQueries({ queryKey: ['subscription-centers'] });
    qc.invalidateQueries({ queryKey: ['subscription-dashboard'] });
  };

  const assignMutation = useMutation({
    mutationFn: () => assignPlan(center!.center_id, {
      plan_id: selectedPlanId,
      effective_date: effectiveDate || undefined,
      notes: assignNotes || undefined,
    }),
    onSuccess: (d) => {
      invalidate();
      setAssignDialog(false);
      setEffectiveDate('');
      setAssignNotes('');
      showSnack(d.message, 'success');
    },
    onError: () => showSnack('Failed to assign plan.', 'error'),
  });

  const storageMutation = useMutation({
    mutationFn: () => purchaseStorage(center!.center_id, { add_on_id: selectedAddonId }),
    onSuccess: () => { invalidate(); setStorageDialog(false); showSnack('Storage add-on purchased.', 'success'); },
    onError: () => showSnack('Failed to purchase storage.', 'error'),
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshUsage(center!.center_id),
    onSuccess: (d) => { invalidate(); showSnack(`Usage refreshed. ${d.data?.student_count} students.`, 'success'); },
    onError: () => showSnack('Failed to refresh usage.', 'error'),
  });

  const billMutation = useMutation({
    mutationFn: () => generateBill(center!.center_id),
    onSuccess: (d) => { invalidate(); showSnack(`Bill generated: ${fmt(d.data?.total_amount ?? 0)}`, 'success'); },
    onError: () => showSnack('Bill for this month may already exist.', 'warning'),
  });

  const billingStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateBillingStatus(id, { payment_status: status }),
    onSuccess: () => { invalidate(); showSnack('Status updated.', 'success'); },
    onError: () => showSnack('Failed to update status.', 'error'),
  });

  return (
    <Drawer
      anchor="right"
      open={!!center}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, p: 0 } }}
    >
      {!center ? null : (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box sx={{
            px: 3, py: 2,
            background: `linear-gradient(135deg, ${BRAND.navyDark} 0%, #1e3a5f 100%)`,
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            <Avatar sx={{
              width: 44, height: 44,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              fontWeight: 700, fontSize: 16,
            }}>
              {center.center_name.charAt(0).toUpperCase()}
            </Avatar>
            <Box flex={1} minWidth={0}>
              <Typography fontWeight={700} fontSize={15} color="#fff" noWrap>
                {center.center_name}
              </Typography>
              <Chip
                size="small"
                label={center.plan_name}
                sx={{
                  fontSize: 11, height: 20, mt: 0.3, fontWeight: 700,
                  bgcolor: (PLAN_COLORS[center.plan_name]?.text ?? BRAND.primary) + '33',
                  color: PLAN_COLORS[center.plan_name]?.text ?? BRAND.primary,
                }}
              />
            </Box>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Refresh usage">
                <IconButton
                  size="small"
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  sx={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  <RefreshRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
          </Box>

          {/* Tabs */}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid #f0f0f0' }}>
            <Tab label="Overview" sx={{ fontSize: 13 }} />
            <Tab label="Plans" sx={{ fontSize: 13 }} />
            <Tab label="Storage Add-ons" sx={{ fontSize: 13 }} />
            <Tab label="Billing" sx={{ fontSize: 13 }} />
          </Tabs>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
            {isLoading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : !detail ? null : (

              /* ── TAB 0: OVERVIEW ── */
              tab === 0 ? (
                <Stack spacing={2.5}>
                  {/* Usage */}
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography fontWeight={700} fontSize={13} sx={{ mb: 2 }}>Usage</Typography>
                      <Stack spacing={1.5}>
                        <UsageBar
                          label="Students"
                          value={detail.current_student_count}
                          max={detail.student_limit}
                        />
                        <UsageBar
                          label={`Storage (${fmtMB(detail.storage_used_mb)} of ${fmtMB(detail.total_storage_mb)})`}
                          value={Math.round(detail.storage_used_mb)}
                          max={detail.total_storage_mb}
                          color="#3b82f6"
                        />
                      </Stack>
                    </CardContent>
                  </Card>

                  {/* Billing estimate */}
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography fontWeight={700} fontSize={13} sx={{ mb: 1.5 }}>
                        Estimated Bill This Month
                      </Typography>
                      <Stack spacing={0.8}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography fontSize={13} color="text.secondary">Plan ({detail.plan_name})</Typography>
                          <Typography fontSize={13}>{fmt(detail.plan_price)}</Typography>
                        </Box>
                        {detail.extra_students > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography fontSize={13} color="#f59e0b">
                              Extra students ({detail.extra_students} × ₹{detail.extra_student_price})
                            </Typography>
                            <Typography fontSize={13} color="#f59e0b">{fmt(detail.extra_amount)}</Typography>
                          </Box>
                        )}
                        {detail.storage_addon_amount > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography fontSize={13} color="text.secondary">Storage add-ons</Typography>
                            <Typography fontSize={13}>{fmt(detail.storage_addon_amount)}</Typography>
                          </Box>
                        )}
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography fontWeight={700} fontSize={14}>Total</Typography>
                          <Typography fontWeight={800} fontSize={16} color={BRAND.primary}>
                            {fmt(detail.estimated_total)}
                          </Typography>
                        </Box>
                      </Stack>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={<ReceiptRoundedIcon />}
                        sx={{ mt: 1.5 }}
                        onClick={() => billMutation.mutate()}
                        disabled={billMutation.isPending}
                      >
                        {billMutation.isPending ? 'Generating…' : 'Generate Bill'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Active storage add-ons */}
                  {detail.storage_purchases.length > 0 && (
                    <Box>
                      <Typography fontWeight={700} fontSize={13} sx={{ mb: 1 }}>Active Storage Add-ons</Typography>
                      {detail.storage_purchases.map((p: any) => (
                        <Box key={p.id} sx={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          p: 1.2, borderRadius: 1.5, bgcolor: '#f8fafc', mb: 0.8,
                        }}>
                          <Box>
                            <Typography fontSize={13} fontWeight={600}>{p.name}</Typography>
                            <Typography fontSize={11} color="text.secondary">
                              {fmtMB(p.storage_mb)} · {fmt(p.price)}/mo
                            </Typography>
                          </Box>
                          <Chip size="small" label={p.status} color={p.status === 'Active' ? 'success' : 'default'} />
                        </Box>
                      ))}
                    </Box>
                  )}
                </Stack>

              /* ── TAB 1: PLANS ── */
              ) : tab === 1 ? (
                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<UpgradeRoundedIcon />}
                    onClick={() => { setSelectedPlanId(detail.plan_id); setAssignDialog(true); }}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Change Plan
                  </Button>
                  <Grid container spacing={1.5}>
                    {plans.map((p) => (
                      <Grid item xs={12} sm={6} key={p.id}>
                        <PlanCard
                          name={p.name}
                          price={p.price}
                          studentLimit={p.student_limit}
                          storageMb={p.storage_limit_mb}
                          extraPrice={p.extra_student_price}
                          isCurrent={p.id === detail.plan_id}
                          onSelect={() => {
                            setSelectedPlanId(p.id);
                            setAssignDialog(true);
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Stack>

              /* ── TAB 2: STORAGE ADD-ONS ── */
              ) : tab === 2 ? (
                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => { setSelectedAddonId(''); setStorageDialog(true); }}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Purchase Add-on
                  </Button>
                  <Grid container spacing={1.5}>
                    {addons.map((a) => (
                      <Grid item xs={12} sm={4} key={a.id}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <StorageRoundedIcon sx={{ fontSize: 32, color: '#3b82f6', mb: 0.5 }} />
                            <Typography fontWeight={700}>{a.name}</Typography>
                            <Typography fontSize={22} fontWeight={800} color="#3b82f6">
                              {fmt(a.price)}
                            </Typography>
                            <Typography fontSize={11} color="text.secondary">/month</Typography>
                            <Typography fontSize={12} sx={{ mt: 1 }}>{fmtMB(a.storage_mb)} extra</Typography>
                            <Button
                              fullWidth
                              variant="outlined"
                              size="small"
                              sx={{ mt: 1.5 }}
                              onClick={() => {
                                setSelectedAddonId(a.id);
                                setStorageDialog(true);
                              }}
                            >
                              Purchase
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>

              /* ── TAB 3: BILLING ── */
              ) : (
                <Stack spacing={1.5}>
                  {detail.billing_history.length === 0 ? (
                    <Alert severity="info">No billing records yet.</Alert>
                  ) : (
                    detail.billing_history.map((b: any) => (
                      <Card key={b.id} variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography fontWeight={600} fontSize={14}>
                                {new Date(b.billing_month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                              </Typography>
                              <Typography fontSize={12} color="text.secondary">
                                {b.plan_name} · {b.student_count} students
                                {b.extra_students > 0 && ` (+${b.extra_students} extra)`}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography fontWeight={800} fontSize={15}>{fmt(b.total_amount)}</Typography>
                              <Chip
                                size="small"
                                label={b.payment_status}
                                color={STATUS_COLOR[b.payment_status] ?? 'default'}
                                sx={{ fontSize: 11, height: 20, mt: 0.5 }}
                              />
                            </Box>
                          </Box>
                          {b.payment_status === 'Pending' && (
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              <Button size="small" variant="outlined" color="success"
                                onClick={() => billingStatusMutation.mutate({ id: b.id, status: 'Paid' })}>
                                Mark Paid
                              </Button>
                              <Button size="small" variant="outlined" color="warning"
                                onClick={() => billingStatusMutation.mutate({ id: b.id, status: 'Waived' })}>
                                Waive
                              </Button>
                              <Button size="small" variant="outlined" color="error"
                                onClick={() => billingStatusMutation.mutate({ id: b.id, status: 'Overdue' })}>
                                Mark Overdue
                              </Button>
                            </Stack>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </Stack>
              )
            )}
          </Box>
        </Box>
      )}

      {/* Assign Plan Dialog */}
      <Dialog open={assignDialog} onClose={() => { setAssignDialog(false); setEffectiveDate(''); setAssignNotes(''); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Change Subscription Plan</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Plan</InputLabel>
              <Select
                label="Plan"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                {plans.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    <Box>
                      <Typography fontSize={13} fontWeight={600}>{p.name}</Typography>
                      <Typography fontSize={11} color="text.secondary">
                        {p.price === 0 ? 'Free' : fmt(p.price) + '/mo'}
                        {' · '}{p.student_limit} students · {fmtMB(p.storage_limit_mb)}
                        {p.extra_student_price > 0 && ` · ₹${p.extra_student_price}/extra student`}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Effective Date"
              type="date"
              size="small"
              fullWidth
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText={
                effectiveDate
                  ? (() => {
                      const d = new Date(effectiveDate);
                      const now = new Date();
                      const sameMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                      return sameMonth
                        ? `Applies immediately. Current month bill will be prorated from ${effectiveDate}.`
                        : `Plan activates on ${effectiveDate}. No billing change for current month.`;
                    })()
                  : 'Leave blank to apply today. If within current month, existing bill is prorated.'
              }
            />

            <TextField
              label="Notes (optional)"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="Reason for change, special arrangement, etc."
            />

            {/* Summary card */}
            {selectedPlanId && (() => {
              const p = plans.find((x) => x.id === selectedPlanId);
              if (!p) return null;
              return (
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Typography fontSize={12} color="text.secondary" fontWeight={600} gutterBottom>NEW PLAN SUMMARY</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography fontSize={13}>{p.name} plan</Typography>
                    <Typography fontSize={13} fontWeight={700}>{p.price === 0 ? 'Free' : fmt(p.price) + '/mo'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography fontSize={12} color="text.secondary">Student limit</Typography>
                    <Typography fontSize={12}>{p.student_limit}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography fontSize={12} color="text.secondary">Storage</Typography>
                    <Typography fontSize={12}>{fmtMB(p.storage_limit_mb)}</Typography>
                  </Box>
                  {p.extra_student_price > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography fontSize={12} color="text.secondary">Extra students</Typography>
                      <Typography fontSize={12}>₹{p.extra_student_price}/student</Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setAssignDialog(false); setEffectiveDate(''); setAssignNotes(''); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => assignMutation.mutate()}
            disabled={!selectedPlanId || assignMutation.isPending}
          >
            {assignMutation.isPending ? 'Assigning…' : 'Assign Plan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Purchase Storage Dialog */}
      <Dialog open={storageDialog} onClose={() => setStorageDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Purchase Storage Add-on</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Add-on Pack</InputLabel>
            <Select
              label="Add-on Pack"
              value={selectedAddonId}
              onChange={(e) => setSelectedAddonId(e.target.value)}
            >
              {addons.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name} — {fmt(a.price)}/mo ({fmtMB(a.storage_mb)})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStorageDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => storageMutation.mutate()}
            disabled={!selectedAddonId || storageMutation.isPending}
          >
            {storageMutation.isPending ? 'Purchasing…' : 'Purchase'}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PLAN_FILTER_OPTIONS = ['All', 'Free', 'Basic', 'Standard', 'Premium'];

export default function SubscriptionPage() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [selected, setSelected] = useState<CenterSubscriptionSummary | null>(null);
  const navigate = useNavigate();

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['subscription-dashboard'],
    queryFn: getSubscriptionDashboard,
    staleTime: 60_000,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['subscription-centers', { search, planFilter }],
    queryFn: () => getCenterSubscriptions({
      search: search || undefined,
      plan_name: planFilter !== 'All' ? planFilter : undefined,
      size: 100,
    }),
    staleTime: 30_000,
  });

  const centers = data?.items ?? [];

  return (
    <Box sx={{ p: 3 }}>
      {/* Page header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>Subscription</Typography>
          <Typography color="text.secondary" fontSize={14}>
            Manage center subscription plans, usage limits, and billing.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<SettingsRoundedIcon />}
          onClick={() => navigate('/subscription/manage')}
        >
          Manage Plans & Add-ons
        </Button>
      </Box>

      {/* Dashboard stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'TOTAL CENTERS', value: dashboard?.total_centers, color: BRAND.primary },
          { label: 'PAID PLANS', value: dashboard?.paid_plan_count, color: '#22c55e' },
          { label: 'FREE PLAN', value: dashboard?.free_plan_count, color: '#94a3b8' },
          { label: 'MRR', value: dashboard ? fmt(dashboard.mrr) : '—', color: '#3b82f6', raw: true },
        ].map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography color="text.secondary" fontSize={12} fontWeight={600}>{s.label}</Typography>
                <Typography fontSize={26} fontWeight={800} color={s.color}>
                  {dashLoading ? '—' : (s.raw ? s.value : s.value)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Plan breakdown */}
      {!dashLoading && dashboard && (
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {dashboard.plan_breakdown.map((p) => {
            const c = PLAN_COLORS[p.name] ?? PLAN_COLORS.Basic;
            return (
              <Grid item xs={6} sm={3} key={p.name}>
                <Card sx={{ borderRadius: 2.5, border: `1px solid ${c.border}`, bgcolor: c.bg }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography fontWeight={700} fontSize={13} color={c.text}>{p.name}</Typography>
                    <Typography fontSize={22} fontWeight={800}>{p.count}</Typography>
                    <Typography fontSize={12} color="text.secondary">
                      {p.revenue > 0 ? fmt(p.revenue) + '/mo' : 'Free'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Filters */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Search center..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>,
          }}
          sx={{ width: 260 }}
        />
        <Stack direction="row" spacing={0.5}>
          {PLAN_FILTER_OPTIONS.map((p) => (
            <Chip
              key={p}
              label={p}
              size="small"
              clickable
              variant={planFilter === p ? 'filled' : 'outlined'}
              color={planFilter === p ? 'primary' : 'default'}
              onClick={() => setPlanFilter(p)}
              sx={{ fontSize: 12 }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Table */}
      {isError ? (
        <Alert severity="error">Failed to load subscriptions.</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>CENTER</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>PLAN</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STUDENTS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STORAGE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>EST. BILL</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STATUS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : centers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No subscriptions found.
                  </TableCell>
                </TableRow>
              ) : (
                centers.map((c) => {
                  const planC = PLAN_COLORS[c.plan_name] ?? PLAN_COLORS.Basic;
                  const studentOver = c.current_student_count > c.student_limit;
                  const storageOver = c.storage_used_mb > c.total_storage_mb;
                  return (
                    <TableRow key={c.center_id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{
                            width: 30, height: 30, fontSize: 12, fontWeight: 700,
                            bgcolor: planC.bg, color: planC.text,
                          }}>
                            {c.center_name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography fontSize={13} fontWeight={600}>{c.center_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={c.plan_name}
                          sx={{
                            fontSize: 11, height: 22, fontWeight: 700,
                            bgcolor: planC.bg, color: planC.text, border: `1px solid ${planC.border}`,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {studentOver && <WarningRoundedIcon sx={{ fontSize: 14, color: '#f59e0b' }} />}
                          <Typography fontSize={12} color={studentOver ? '#f59e0b' : 'inherit'}>
                            {c.current_student_count} / {c.student_limit}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {storageOver && <WarningRoundedIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
                          <Typography fontSize={12} color={storageOver ? '#ef4444' : 'inherit'}>
                            {fmtMB(Math.round(c.storage_used_mb))} / {fmtMB(c.total_storage_mb)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography fontSize={13} fontWeight={700} color={c.estimated_total > 0 ? BRAND.primary : 'text.secondary'}>
                          {fmt(c.estimated_total)}
                        </Typography>
                        {c.extra_students > 0 && (
                          <Typography fontSize={11} color="#f59e0b">
                            +{c.extra_students} extra
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={c.status}
                          color={c.status === 'Active' ? 'success' : 'default'}
                          sx={{ fontSize: 11, height: 22 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CenterSubscriptionDrawer center={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
