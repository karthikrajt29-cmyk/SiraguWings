import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getSettings,
  updateConfigKey,
  updateMaterialVisibility,
  type PlatformSettings,
} from '../../api/settings.api';
import { useSnackbar } from '../../contexts/SnackbarContext';

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

export default function SettingsPage() {
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

  return (
    <Box>
      <Typography variant="h5" mb={3}>Platform Settings</Typography>

      {isLoading && <CircularProgress />}
      {isError && <Alert severity="error">Failed to load settings.</Alert>}

      {data && (
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
      )}
    </Box>
  );
}
