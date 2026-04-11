import {
  Box,
  Button,
  Checkbox,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bulkApproveCenters,
  getCenterDetail,
  getCenters,
  type CenterSummary,
} from '../../api/centers.api';
import StatusChip from '../../components/common/StatusChip';
import SlaChip from '../../components/common/SlaChip';
import CenterDetailPanel from '../../components/center/CenterDetailPanel';
import { useSnackbar } from '../../contexts/SnackbarContext';

const TABS = ['All', 'Submitted', 'UnderReview', 'Approved', 'Rejected', 'Suspended'];

export default function CenterQueuePage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const { showSnack } = useSnackbar();
  const qc = useQueryClient();

  const statusFilter = TABS[tabIndex] === 'All' ? undefined : TABS[tabIndex];

  const { data, isLoading } = useQuery({
    queryKey: ['centers', statusFilter],
    queryFn: () => getCenters({ status: statusFilter, size: 50 }),
  });

  const { data: detailData } = useQuery({
    queryKey: ['center', selectedId],
    queryFn: () => getCenterDetail(selectedId!),
    enabled: !!selectedId,
  });

  const bulkMut = useMutation({
    mutationFn: () => bulkApproveCenters(checked),
    onSuccess: () => {
      showSnack(`${checked.length} center(s) approved`, 'success');
      setChecked([]);
      qc.invalidateQueries({ queryKey: ['centers'] });
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const centers = data?.items ?? [];
  const submittedCenters = centers.filter((c) => c.status === 'Submitted');

  const toggleCheck = (id: string) => {
    setChecked((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Centers</Typography>
        {checked.length > 0 && (
          <Button
            variant="contained"
            color="success"
            onClick={() => bulkMut.mutate()}
            disabled={bulkMut.isPending}
          >
            Bulk Approve ({checked.length})
          </Button>
        )}
      </Stack>

      <Box display="flex" gap={2} height="calc(100vh - 180px)">
        {/* Left panel */}
        <Paper sx={{ width: 340, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Tabs
            value={tabIndex}
            onChange={(_, v) => { setTabIndex(v); setSelectedId(null); setChecked([]); }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {TABS.map((t) => <Tab key={t} label={t} />)}
          </Tabs>

          <Box sx={{ overflowY: 'auto', flex: 1 }}>
            {isLoading ? (
              <Box p={2}><Typography color="text.secondary">Loading…</Typography></Box>
            ) : centers.length === 0 ? (
              <Box p={2}><Typography color="text.secondary">No centers.</Typography></Box>
            ) : (
              <List dense disablePadding>
                {centers.map((center: CenterSummary) => (
                  <Box key={center.id}>
                    <ListItemButton
                      selected={selectedId === center.id}
                      onClick={() => setSelectedId(center.id)}
                      sx={{ py: 1.5, px: 2 }}
                    >
                      {center.status === 'Submitted' && (
                        <Checkbox
                          size="small"
                          edge="start"
                          checked={checked.includes(center.id)}
                          onClick={(e) => { e.stopPropagation(); toggleCheck(center.id); }}
                          sx={{ mr: 1, p: 0 }}
                        />
                      )}
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="body2" fontWeight={500}>{center.name}</Typography>
                            <StatusChip status={center.status} />
                            {center.is_approaching_sla && (
                              <SlaChip hours={center.hours_since_submission} />
                            )}
                          </Stack>
                        }
                        secondary={center.category}
                      />
                    </ListItemButton>
                    <Divider />
                  </Box>
                ))}
              </List>
            )}
          </Box>
        </Paper>

        {/* Right panel */}
        <Paper sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          {selectedId && detailData ? (
            <CenterDetailPanel
              center={detailData}
              onActionComplete={() => setSelectedId(null)}
            />
          ) : (
            <Box display="flex" alignItems="center" justifyContent="center" height="100%">
              <Typography color="text.secondary">Select a center to view details</Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
