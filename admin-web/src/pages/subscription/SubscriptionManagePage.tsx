/**
 * Subscription Management — admin catalogue editor
 * • Plans tab: create / edit / deactivate subscription plans
 * • Storage Add-ons tab: create / edit / deactivate storage packs
 */
import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Stack,
  Button, IconButton, TextField, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Paper, Tab, Tabs, CircularProgress, Alert, Tooltip,
  InputAdornment,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSubscriptionPlans, createPlan, updatePlan, deletePlan,
  getStorageAddOns, createStorageAddOn, updateStorageAddOn, deleteStorageAddOn,
  type SubscriptionPlan, type StorageAddOn,
} from '../../api/subscription.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtMB = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Free:     { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  Basic:    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Standard: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  Premium:  { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
};

const DEFAULT_PLAN = {
  name: '', price: 0, student_limit: 50,
  storage_limit_mb: 1024, extra_student_price: 20, sort_order: 0, is_active: true,
};

const DEFAULT_ADDON = {
  name: '', storage_mb: 1024, price: 100, sort_order: 0, is_active: true,
};

// ── Plan Form Dialog ──────────────────────────────────────────────────────────

function PlanDialog({
  open, plan, onClose,
}: {
  open: boolean;
  plan: SubscriptionPlan | null;  // null = create
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const isEdit = !!plan;

  const [form, setForm] = useState(() =>
    plan ? {
      name: plan.name, price: plan.price,
      student_limit: plan.student_limit,
      storage_limit_mb: plan.storage_limit_mb,
      extra_student_price: plan.extra_student_price,
      sort_order: plan.sort_order,
      is_active: plan.is_active,
    } : { ...DEFAULT_PLAN }
  );

  // Reset when plan prop changes (switching which plan to edit)
  const resetForm = (p: SubscriptionPlan | null) =>
    setForm(p ? {
      name: p.name, price: p.price,
      student_limit: p.student_limit,
      storage_limit_mb: p.storage_limit_mb,
      extra_student_price: p.extra_student_price,
      sort_order: p.sort_order,
      is_active: p.is_active,
    } : { ...DEFAULT_PLAN });

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? updatePlan(plan!.id, form)
      : createPlan(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-plans-all'] });
      qc.invalidateQueries({ queryKey: ['subscription-plans'] });
      showSnack(isEdit ? 'Plan updated.' : 'Plan created.', 'success');
      onClose();
    },
    onError: (e: any) =>
      showSnack(e?.response?.data?.detail ?? 'Failed to save plan.', 'error'),
  });

  const num = (val: string) => parseFloat(val) || 0;
  const int = (val: string) => parseInt(val) || 0;

  return (
    <Dialog
      open={open}
      onClose={() => { resetForm(null); onClose(); }}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: () => resetForm(plan) }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {isEdit ? `Edit Plan — ${plan!.name}` : 'New Subscription Plan'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Plan Name"
            size="small"
            fullWidth
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Basic, Standard, Premium"
          />

          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <TextField
                label="Monthly Price (₹)"
                size="small"
                fullWidth
                type="number"
                inputProps={{ min: 0, step: 100 }}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: num(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Extra Student Price (₹)"
                size="small"
                fullWidth
                type="number"
                inputProps={{ min: 0, step: 5 }}
                value={form.extra_student_price}
                onChange={(e) => setForm({ ...form, extra_student_price: num(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                helperText="Per student over the limit. Set 0 to block extra students."
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Student Limit"
                size="small"
                fullWidth
                type="number"
                inputProps={{ min: 1 }}
                value={form.student_limit}
                onChange={(e) => setForm({ ...form, student_limit: int(e.target.value) })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">students</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Storage Limit (MB)"
                size="small"
                fullWidth
                type="number"
                inputProps={{ min: 100, step: 512 }}
                value={form.storage_limit_mb}
                onChange={(e) => setForm({ ...form, storage_limit_mb: int(e.target.value) })}
                helperText={`= ${fmtMB(form.storage_limit_mb)}`}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Sort Order"
                size="small"
                fullWidth
                type="number"
                inputProps={{ min: 0 }}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: int(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    color="success"
                  />
                }
                label={form.is_active ? 'Active' : 'Inactive'}
              />
            </Grid>
          </Grid>

          {/* Preview card */}
          <Card variant="outlined" sx={{
            borderRadius: 2, borderStyle: 'dashed',
            bgcolor: (PLAN_COLORS[form.name]?.bg ?? '#f8fafc'),
          }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography fontSize={12} color="text.secondary" fontWeight={600} gutterBottom>
                PREVIEW
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography fontWeight={800} fontSize={16} color={PLAN_COLORS[form.name]?.text ?? BRAND.primary}>
                    {form.name || 'Plan Name'}
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    <Typography fontSize={12} color="text.secondary">
                      <PeopleRoundedIcon sx={{ fontSize: 12, mr: 0.5 }} />
                      {form.student_limit} students
                      {form.extra_student_price > 0
                        ? ` + ₹${form.extra_student_price}/extra`
                        : ' (no extras)'}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary">
                      <StorageRoundedIcon sx={{ fontSize: 12, mr: 0.5 }} />
                      {fmtMB(form.storage_limit_mb)} storage
                    </Typography>
                  </Stack>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography fontSize={22} fontWeight={800}>
                    {form.price === 0 ? 'Free' : fmt(form.price)}
                  </Typography>
                  {form.price > 0 && (
                    <Typography fontSize={12} color="text.secondary">/month</Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={() => { resetForm(null); onClose(); }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => mutation.mutate()}
          disabled={!form.name || mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={14} /> : <CheckRoundedIcon />}
        >
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Add-on Form Dialog ────────────────────────────────────────────────────────

function AddonDialog({
  open, addon, onClose,
}: {
  open: boolean;
  addon: StorageAddOn | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const isEdit = !!addon;

  const [form, setForm] = useState(() =>
    addon ? {
      name: addon.name, storage_mb: addon.storage_mb,
      price: addon.price, sort_order: addon.sort_order, is_active: addon.is_active,
    } : { ...DEFAULT_ADDON }
  );

  const resetForm = (a: StorageAddOn | null) =>
    setForm(a ? {
      name: a.name, storage_mb: a.storage_mb,
      price: a.price, sort_order: a.sort_order, is_active: a.is_active,
    } : { ...DEFAULT_ADDON });

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? updateStorageAddOn(addon!.id, form)
      : createStorageAddOn(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storage-addons-all'] });
      qc.invalidateQueries({ queryKey: ['storage-addons'] });
      showSnack(isEdit ? 'Add-on updated.' : 'Add-on created.', 'success');
      onClose();
    },
    onError: (e: any) =>
      showSnack(e?.response?.data?.detail ?? 'Failed to save add-on.', 'error'),
  });

  const num = (val: string) => parseFloat(val) || 0;
  const int = (val: string) => parseInt(val) || 0;

  return (
    <Dialog
      open={open}
      onClose={() => { resetForm(null); onClose(); }}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ onEnter: () => resetForm(addon) }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {isEdit ? `Edit Add-on — ${addon!.name}` : 'New Storage Add-on'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Pack Name"
            size="small"
            fullWidth
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. 1 GB Pack"
          />
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <TextField
                label="Storage (MB)"
                size="small"
                fullWidth
                type="number"
                inputProps={{ min: 100, step: 512 }}
                value={form.storage_mb}
                onChange={(e) => setForm({ ...form, storage_mb: int(e.target.value) })}
                helperText={`= ${fmtMB(form.storage_mb)}`}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Price / month (₹)"
                size="small"
                fullWidth
                type="number"
                inputProps={{ min: 0, step: 50 }}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: num(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Sort Order"
                size="small"
                fullWidth
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: int(e.target.value) })}
              />
            </Grid>
            <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    color="success"
                  />
                }
                label={form.is_active ? 'Active' : 'Inactive'}
              />
            </Grid>
          </Grid>

          {/* Preview */}
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: '#f0f9ff', borderStyle: 'dashed' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <StorageRoundedIcon sx={{ color: '#3b82f6', fontSize: 24 }} />
                  <Box>
                    <Typography fontWeight={700} fontSize={14}>{form.name || 'Pack Name'}</Typography>
                    <Typography fontSize={12} color="text.secondary">{fmtMB(form.storage_mb)} extra storage</Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography fontWeight={800} fontSize={18} color="#3b82f6">{fmt(form.price)}</Typography>
                  <Typography fontSize={11} color="text.secondary">/month</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={() => { resetForm(null); onClose(); }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => mutation.mutate()}
          disabled={!form.name || mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={14} /> : <CheckRoundedIcon />}
        >
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Add-on'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Plans Tab ─────────────────────────────────────────────────────────────────

function PlansTab() {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SubscriptionPlan | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscription-plans-all'],
    queryFn: () => getSubscriptionPlans(true),
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-plans-all'] });
      qc.invalidateQueries({ queryKey: ['subscription-plans'] });
      showSnack('Plan deactivated.', 'success');
      setConfirmDelete(null);
    },
    onError: (e: any) =>
      showSnack(e?.response?.data?.detail ?? 'Cannot deactivate plan.', 'error'),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography fontWeight={600} fontSize={15}>Subscription Plans</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddRoundedIcon />}
          onClick={() => { setEditing(null); setDialogOpen(true); }}
        >
          New Plan
        </Button>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>PLAN</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>PRICE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STUDENTS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STORAGE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>EXTRA / STUDENT</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>ORDER</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right">ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plans.map((p) => {
                const c = PLAN_COLORS[p.name] ?? PLAN_COLORS.Basic;
                return (
                  <TableRow key={p.id} sx={{ opacity: p.is_active ? 1 : 0.5 }}>
                    <TableCell>
                      <Chip
                        size="small"
                        label={p.name}
                        sx={{
                          fontWeight: 700, fontSize: 12,
                          bgcolor: c.bg, color: c.text, border: `1px solid ${c.border}`,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={700}>
                        {p.price === 0 ? 'Free' : fmt(p.price) + '/mo'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{p.student_limit}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{fmtMB(p.storage_limit_mb)}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>
                      {p.extra_student_price > 0 ? `₹${p.extra_student_price}` : (
                        <Chip size="small" label="Blocked" sx={{ fontSize: 11, height: 20 }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{p.sort_order}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={p.is_active ? 'Active' : 'Inactive'}
                        color={p.is_active ? 'success' : 'default'}
                        sx={{ fontSize: 11, height: 20 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={p.is_active ? 'Deactivate' : 'Already inactive'}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={!p.is_active}
                              onClick={() => setConfirmDelete(p)}
                            >
                              <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <PlanDialog
        open={dialogOpen}
        plan={editing}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
      />

      {/* Confirm deactivate */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Deactivate Plan</DialogTitle>
        <DialogContent>
          <Typography fontSize={14}>
            Deactivate <strong>{confirmDelete?.name}</strong>? Centers currently on this plan
            will keep it until their next renewal, but it won't be assignable to new centers.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(confirmDelete!.id)}
          >
            {deleteMutation.isPending ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Add-ons Tab ───────────────────────────────────────────────────────────────

function AddonsTab() {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StorageAddOn | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StorageAddOn | null>(null);

  const { data: addons = [], isLoading } = useQuery({
    queryKey: ['storage-addons-all'],
    queryFn: () => getStorageAddOns(true),
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStorageAddOn(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storage-addons-all'] });
      qc.invalidateQueries({ queryKey: ['storage-addons'] });
      showSnack('Add-on deactivated.', 'success');
      setConfirmDelete(null);
    },
    onError: () => showSnack('Failed to deactivate.', 'error'),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography fontWeight={600} fontSize={15}>Storage Add-on Packs</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddRoundedIcon />}
          onClick={() => { setEditing(null); setDialogOpen(true); }}
        >
          New Add-on
        </Button>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {addons.map((a) => (
            <Grid item xs={12} sm={6} md={4} key={a.id}>
              <Card variant="outlined" sx={{
                borderRadius: 2.5, opacity: a.is_active ? 1 : 0.55,
                transition: 'all 0.15s',
                '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.1)' },
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <StorageRoundedIcon sx={{ color: '#3b82f6', fontSize: 28 }} />
                    <Chip
                      size="small"
                      label={a.is_active ? 'Active' : 'Inactive'}
                      color={a.is_active ? 'success' : 'default'}
                      sx={{ fontSize: 11, height: 20 }}
                    />
                  </Box>
                  <Typography fontWeight={700} fontSize={15}>{a.name}</Typography>
                  <Typography fontSize={24} fontWeight={800} color="#3b82f6" sx={{ my: 0.5 }}>
                    {fmt(a.price)}
                    <Typography component="span" fontSize={13} color="text.secondary">/mo</Typography>
                  </Typography>
                  <Typography fontSize={13} color="text.secondary">{fmtMB(a.storage_mb)} extra storage</Typography>
                  <Typography fontSize={11} color="text.secondary" sx={{ mt: 0.5 }}>
                    Sort order: {a.sort_order}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditRoundedIcon />}
                      onClick={() => { setEditing(a); setDialogOpen(true); }}
                      sx={{ flex: 1 }}
                    >
                      Edit
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={!a.is_active}
                      onClick={() => setConfirmDelete(a)}
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {addons.length === 0 && (
            <Grid item xs={12}>
              <Alert severity="info">No storage add-ons defined yet.</Alert>
            </Grid>
          )}
        </Grid>
      )}

      <AddonDialog
        open={dialogOpen}
        addon={editing}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
      />

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Deactivate Add-on</DialogTitle>
        <DialogContent>
          <Typography fontSize={14}>
            Deactivate <strong>{confirmDelete?.name}</strong>? Centers already purchased will
            keep it until expiry, but it won't appear for new purchases.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(confirmDelete!.id)}
          >
            {deleteMutation.isPending ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SubscriptionManagePage() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Subscription Management
        </Typography>
        <Typography color="text.secondary" fontSize={14}>
          Define and edit subscription plans and storage add-on packs available to centers.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 3 }}>
        <Box sx={{ borderBottom: '1px solid #f0f0f0' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
            <Tab label="Subscription Plans" sx={{ fontSize: 13, fontWeight: 600 }} />
            <Tab label="Storage Add-ons" sx={{ fontSize: 13, fontWeight: 600 }} />
          </Tabs>
        </Box>
        <CardContent sx={{ pt: 3 }}>
          {tab === 0 ? <PlansTab /> : <AddonsTab />}
        </CardContent>
      </Card>
    </Box>
  );
}
