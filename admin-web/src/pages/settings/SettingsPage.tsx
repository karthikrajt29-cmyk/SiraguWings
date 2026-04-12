import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SettingsRoundedIcon    from '@mui/icons-material/SettingsRounded';
import ListAltRoundedIcon     from '@mui/icons-material/ListAltRounded';
import EmailRoundedIcon       from '@mui/icons-material/EmailRounded';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSettings,
  updateConfigKey,
  updateMaterialVisibility,
  getBillingEmailSettings,
  updateBillingEmailSettings,
} from '../../api/settings.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';
import MasterDataTab from '../../components/settings/MasterDataTab';

interface EditableFieldProps {
  label: string;
  configKey: string;
  value: string | number;
  type?: 'number' | 'text';
  onSave: (key: string, value: string | number) => void;
  loading: boolean;
}

function EditableField({ label, configKey, value, type = 'number', onSave, loading }: EditableFieldProps) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => { setLocal(String(value)); }, [value]);

  const dirty = local !== String(value);
  return (
    <Stack direction="row" alignItems="center" gap={2}>
      <TextField
        label={label}
        type={type}
        size="small"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        sx={{ flex: 1, maxWidth: 240 }}
      />
      {dirty && (
        <Button
          size="small"
          variant="contained"
          disabled={loading}
          onClick={() => onSave(configKey, type === 'number' ? Number(local) : local)}
        >
          Save
        </Button>
      )}
    </Stack>
  );
}

function PlatformSettingsTab() {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const [visibilityMode, setVisibilityMode] = useState('');
  useEffect(() => {
    if (data?.MaterialVisibilityMode) setVisibilityMode(data.MaterialVisibilityMode);
  }, [data]);

  const updateMut = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string | number }) =>
      updateConfigKey(key, value),
    onSuccess: () => { showSnack('Setting updated', 'success'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const visibilityMut = useMutation({
    mutationFn: (mode: string) => updateMaterialVisibility(mode),
    onSuccess: () => { showSnack('Material visibility updated', 'success'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const handleSave = (key: string, value: string | number) => {
    updateMut.mutate({ key, value });
  };

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to load settings.</Alert>;
  if (!data) return null;

  return (
    <Card sx={{ maxWidth: 600 }}>
      <CardContent>
        <Stack spacing={3}>
          <Typography variant="subtitle1">General</Typography>
          <EditableField
            label="Trial Period (days)"
            configKey="TrialPeriodDays"
            value={data.TrialPeriodDays}
            onSave={handleSave}
            loading={updateMut.isPending}
          />
          <EditableField
            label="Fee Per Student (₹)"
            configKey="FeePerStudent"
            value={data.FeePerStudent}
            onSave={handleSave}
            loading={updateMut.isPending}
          />
          <EditableField
            label="SLA Breach Hours"
            configKey="SlaBreachHours"
            value={data.SlaBreachHours}
            onSave={handleSave}
            loading={updateMut.isPending}
          />
          <EditableField
            label="Data Purge Delay (days)"
            configKey="DataPurgeDelayDays"
            value={data.DataPurgeDelayDays}
            onSave={handleSave}
            loading={updateMut.isPending}
          />
          <EditableField
            label="Max Students Per Center"
            configKey="MaxStudentsPerCenter"
            value={data.MaxStudentsPerCenter}
            onSave={handleSave}
            loading={updateMut.isPending}
          />
          <EditableField
            label="Bulk Approve Limit"
            configKey="BulkApproveLimit"
            value={data.BulkApproveLimit}
            onSave={handleSave}
            loading={updateMut.isPending}
          />

          <Divider />

          <Typography variant="subtitle1">Content</Typography>
          <Stack direction="row" alignItems="center" gap={2}>
            <FormControl size="small" sx={{ flex: 1, maxWidth: 240 }}>
              <InputLabel>Material Visibility</InputLabel>
              <Select
                value={visibilityMode}
                label="Material Visibility"
                onChange={(e) => setVisibilityMode(e.target.value)}
              >
                <MenuItem value="AllUsers">All Users</MenuItem>
                <MenuItem value="PaidOnly">Paid Only</MenuItem>
                <MenuItem value="AdminOnly">Admin Only</MenuItem>
              </Select>
            </FormControl>
            {visibilityMode !== data.MaterialVisibilityMode && (
              <Button
                size="small"
                variant="contained"
                disabled={visibilityMut.isPending}
                onClick={() => visibilityMut.mutate(visibilityMode)}
              >
                Save
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Email Config Tab ──────────────────────────────────────────────────────────

function EmailConfigTab() {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing-email-settings'],
    queryFn: getBillingEmailSettings,
  });

  const [form, setForm] = useState({
    billing_email_from: '',
    billing_email_cc: '',
    billing_email_bcc: '',
    billing_due_days: 7,
    billing_reminder_days: 3,
    billing_send_on_generate: false,
  });

  useEffect(() => {
    if (data) {
      setForm({
        billing_email_from: data.billing_email_from,
        billing_email_cc: data.billing_email_cc,
        billing_email_bcc: data.billing_email_bcc,
        billing_due_days: data.billing_due_days,
        billing_reminder_days: data.billing_reminder_days,
        billing_send_on_generate: data.billing_send_on_generate === 'true',
      });
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => updateBillingEmailSettings({
      billing_email_from: form.billing_email_from,
      billing_email_cc: form.billing_email_cc,
      billing_email_bcc: form.billing_email_bcc,
      billing_due_days: form.billing_due_days,
      billing_reminder_days: form.billing_reminder_days,
      billing_send_on_generate: form.billing_send_on_generate,
    }),
    onSuccess: () => {
      showSnack('Email settings saved', 'success');
      qc.invalidateQueries({ queryKey: ['billing-email-settings'] });
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));

  if (isLoading) return <CircularProgress />;
  if (isError) return <Alert severity="error">Failed to load email settings.</Alert>;

  return (
    <Card sx={{ maxWidth: 600, border: `1px solid ${BRAND.divider}` }}>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>Invoice Email Settings</Typography>
            <Typography variant="body2" color="text.secondary">
              Configure who receives invoice emails and when they are sent.
            </Typography>
          </Box>

          <Divider />

          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6 }}>
            Sender & Recipients
          </Typography>

          <TextField
            label="From (Sender Email)"
            type="email"
            size="small"
            value={form.billing_email_from}
            onChange={set('billing_email_from')}
            placeholder="billing@siraguwin.com"
            helperText="The address invoices will be sent from"
            InputProps={{ startAdornment: <InputAdornment position="start"><EmailRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> }}
          />

          <TextField
            label="CC (comma-separated)"
            size="small"
            value={form.billing_email_cc}
            onChange={set('billing_email_cc')}
            placeholder="accounts@company.com, finance@company.com"
            helperText="Optional: copy these addresses on every invoice email"
          />

          <TextField
            label="BCC (comma-separated)"
            size="small"
            value={form.billing_email_bcc}
            onChange={set('billing_email_bcc')}
            placeholder="archive@company.com"
            helperText="Optional: blind copy for internal records"
          />

          <Divider />

          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6 }}>
            Due Dates & Reminders
          </Typography>

          <Stack direction="row" gap={2}>
            <TextField
              label="Payment Due (days after bill)"
              type="number"
              size="small"
              value={form.billing_due_days}
              onChange={set('billing_due_days')}
              inputProps={{ min: 1, max: 60 }}
              sx={{ flex: 1 }}
              helperText="e.g. 7 = due 7 days after bill generation"
            />
            <TextField
              label="Reminder (days before due)"
              type="number"
              size="small"
              value={form.billing_reminder_days}
              onChange={set('billing_reminder_days')}
              inputProps={{ min: 0, max: 30 }}
              sx={{ flex: 1 }}
              helperText="Send reminder this many days before the due date"
            />
          </Stack>

          <Divider />

          <FormControlLabel
            control={
              <Switch
                checked={form.billing_send_on_generate}
                onChange={(e) => setForm((prev) => ({ ...prev, billing_send_on_generate: e.target.checked }))}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>Auto-send invoice on bill generation</Typography>
                <Typography variant="caption" color="text.secondary">
                  When enabled, invoice emails are sent automatically when "Generate Bills" runs
                </Typography>
              </Box>
            }
            sx={{ alignItems: 'flex-start', mx: 0 }}
          />

          <Button
            variant="contained"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            sx={{ alignSelf: 'flex-start', borderRadius: '10px', px: 3 }}
          >
            {saveMut.isPending ? 'Saving…' : 'Save Email Settings'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h5" mb={2.5}>Settings</Typography>

      <Box sx={{ borderBottom: `1px solid ${BRAND.divider}`, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': { fontSize: 13, fontWeight: 600, textTransform: 'none', minHeight: 44, px: 2 },
            '& .Mui-selected': { color: BRAND.primary },
            '& .MuiTabs-indicator': { bgcolor: BRAND.primary },
          }}
        >
          <Tab icon={<SettingsRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Platform Settings" />
          <Tab icon={<ListAltRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Master Data" />
          <Tab icon={<EmailRoundedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Email Config" />
        </Tabs>
      </Box>

      {tab === 0 && <PlatformSettingsTab />}
      {tab === 1 && <MasterDataTab />}
      {tab === 2 && <EmailConfigTab />}
    </Box>
  );
}
