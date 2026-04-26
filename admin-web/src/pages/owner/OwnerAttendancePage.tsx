import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import CheckRoundedIcon          from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon          from '@mui/icons-material/CloseRounded';
import SaveRoundedIcon           from '@mui/icons-material/SaveRounded';
import DownloadRoundedIcon       from '@mui/icons-material/DownloadRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  listOwnerBatches,
  getOwnerBatchAttendance,
  markOwnerBatchAttendance,
} from '../../api/owner.api';
import { downloadCsv } from '../../utils/csv';
import { BRAND, STATUS_COLORS } from '../../theme';

type Mark = 'Present' | 'Absent';

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function OwnerAttendancePage() {
  const { centerId, centers } = useOwnerCenter();
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const [batchId, setBatchId] = useState<string>('');
  const [date, setDate]       = useState(todayIso());
  const [marks, setMarks]     = useState<Record<string, Mark>>({});
  const [dirty, setDirty]     = useState(false);

  const centerName = centers.find((c) => c.id === centerId)?.name ?? '';

  /* ── Batches dropdown ── */
  const batchesQuery = useQuery({
    queryKey: ['owner', 'batches', centerId],
    queryFn: () => listOwnerBatches(centerId!),
    enabled: !!centerId,
  });

  // Pick the first active batch when batches arrive
  useEffect(() => {
    if (batchId) return;
    const first = (batchesQuery.data ?? []).find((b) => b.is_active);
    if (first) setBatchId(first.id);
  }, [batchesQuery.data, batchId]);

  /* ── Attendance roster ── */
  const rosterQuery = useQuery({
    queryKey: ['owner', 'attendance', centerId, batchId, date],
    queryFn: () => getOwnerBatchAttendance(centerId!, batchId, date),
    enabled: !!centerId && !!batchId && !!date,
  });

  // Sync local marks whenever the roster reloads
  useEffect(() => {
    if (!rosterQuery.data) return;
    const next: Record<string, Mark> = {};
    rosterQuery.data.forEach((r) => {
      if (r.attendance_status) next[r.student_id] = r.attendance_status;
    });
    setMarks(next);
    setDirty(false);
  }, [rosterQuery.data]);

  const counts = useMemo(() => {
    const present = Object.values(marks).filter((m) => m === 'Present').length;
    const absent  = Object.values(marks).filter((m) => m === 'Absent').length;
    const total   = rosterQuery.data?.length ?? 0;
    const unmarked = total - present - absent;
    return { present, absent, total, unmarked };
  }, [marks, rosterQuery.data]);

  /* ── Save ── */
  const saveMut = useMutation({
    mutationFn: () => {
      const records = Object.entries(marks).map(([student_id, status]) => ({
        student_id,
        status,
      }));
      return markOwnerBatchAttendance(centerId!, batchId, { date, records });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'attendance', centerId, batchId, date] });
      showSnack('Attendance saved', 'success');
      setDirty(false);
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const setMark = (sid: string, m: Mark) => {
    setMarks((prev) => {
      const next = { ...prev };
      if (next[sid] === m) delete next[sid];
      else next[sid] = m;
      return next;
    });
    setDirty(true);
  };

  const setAll = (m: Mark) => {
    if (!rosterQuery.data) return;
    const next: Record<string, Mark> = {};
    rosterQuery.data.forEach((r) => { next[r.student_id] = m; });
    setMarks(next);
    setDirty(true);
  };

  const exportCsv = () => {
    if (!rosterQuery.data) return;
    const batchName = batchesQuery.data?.find((b) => b.id === batchId)?.batch_name ?? batchId;
    downloadCsv(
      ['Date', 'Student', 'Parent', 'Status'],
      rosterQuery.data.map((r) => [
        date,
        r.name,
        r.parent_name ?? '',
        marks[r.student_id] ?? r.attendance_status ?? 'Unmarked',
      ]),
      `attendance-${batchName}-${date}`,
    );
  };

  if (!centerId) {
    return (
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: '32px !important', textAlign: 'center' }}>
          <Typography sx={{ color: BRAND.textSecondary }}>
            Select a center to mark attendance.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const batches = batchesQuery.data ?? [];
  const noBatches = !batchesQuery.isLoading && batches.length === 0;
  const roster = rosterQuery.data ?? [];

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: BRAND.textPrimary }}>
            Attendance
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
            {centerName} &middot; mark and review batch attendance
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button
            variant="outlined"
            startIcon={<DownloadRoundedIcon />}
            onClick={exportCsv}
            disabled={roster.length === 0}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            onClick={() => saveMut.mutate()}
            disabled={!dirty || saveMut.isPending || Object.keys(marks).length === 0}
          >
            {saveMut.isPending ? 'Saving…' : 'Save attendance'}
          </Button>
        </Stack>
      </Stack>

      {/* Controls */}
      <Card sx={{ borderRadius: '16px', mb: 2 }}>
        <CardContent sx={{ p: '16px !important' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={5}>
              <TextField
                select
                fullWidth
                label="Batch"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                disabled={noBatches}
                helperText={noBatches ? 'No batches in this center yet — create one first.' : undefined}
              >
                {batches.map((b) => (
                  <MenuItem key={b.id} value={b.id} disabled={!b.is_active}>
                    {b.course_name} — {b.batch_name}
                    {!b.is_active && ' (inactive)'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                inputProps={{ max: todayIso() }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" gap={1} sx={{ height: '100%', alignItems: 'stretch' }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<CheckRoundedIcon />}
                  onClick={() => setAll('Present')}
                  disabled={roster.length === 0}
                  sx={{ borderColor: STATUS_COLORS.approved, color: STATUS_COLORS.approved,
                        '&:hover': { borderColor: STATUS_COLORS.approved, bgcolor: '#ECFDF5' } }}
                >
                  All present
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<CloseRoundedIcon />}
                  onClick={() => setAll('Absent')}
                  disabled={roster.length === 0}
                  sx={{ borderColor: STATUS_COLORS.rejected, color: STATUS_COLORS.rejected,
                        '&:hover': { borderColor: STATUS_COLORS.rejected, bgcolor: '#FEF2F2' } }}
                >
                  All absent
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Counter strip */}
      {roster.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: 'Total',    value: counts.total,    color: BRAND.primary },
            { label: 'Present',  value: counts.present,  color: STATUS_COLORS.approved },
            { label: 'Absent',   value: counts.absent,   color: STATUS_COLORS.rejected },
            { label: 'Unmarked', value: counts.unmarked, color: BRAND.textSecondary },
          ].map((s) => (
            <Grid key={s.label} item xs={6} sm={3}>
              <Card sx={{ borderRadius: '14px' }}>
                <CardContent sx={{ p: '14px !important' }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
                    textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {s.label}
                  </Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: s.color, mt: 0.5 }}>
                    {s.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Roster */}
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: 0 }}>
          {!batchId || noBatches ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Avatar sx={{
                width: 56, height: 56, bgcolor: BRAND.primaryBg, color: BRAND.primary,
                mx: 'auto', mb: 1.5, borderRadius: '14px',
              }}>
                <EventAvailableRoundedIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
                {noBatches ? 'No batches yet' : 'Pick a batch to begin'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                Choose a batch and date above, then mark each student.
              </Typography>
            </Box>
          ) : rosterQuery.isLoading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress size={28} sx={{ color: BRAND.primary }} />
            </Box>
          ) : roster.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
                No students assigned to this batch
              </Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                Assign students from the batch detail before marking attendance.
              </Typography>
            </Box>
          ) : (
            <Box>
              {roster.map((r) => {
                const m = marks[r.student_id];
                return (
                  <Stack
                    key={r.student_id}
                    direction="row"
                    alignItems="center"
                    gap={2}
                    sx={{
                      px: 3, py: 1.75,
                      '&:not(:last-child)': { borderBottom: `1px solid ${BRAND.divider}` },
                    }}
                  >
                    <Avatar sx={{
                      width: 36, height: 36,
                      bgcolor: BRAND.primaryBg, color: BRAND.primary,
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {r.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: BRAND.textPrimary }}>
                        {r.name}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }} noWrap>
                        {r.parent_name ?? 'No parent linked'}
                        {r.gender ? ` · ${r.gender}` : ''}
                      </Typography>
                    </Box>
                    {r.edited_at && (
                      <Chip
                        size="small"
                        label="edited"
                        sx={{ height: 18, fontSize: 10, fontWeight: 600,
                              bgcolor: BRAND.surface, color: BRAND.textSecondary }}
                      />
                    )}
                    <Stack direction="row" gap={0.5}>
                      <Tooltip title="Mark Present">
                        <IconButton
                          size="small"
                          onClick={() => setMark(r.student_id, 'Present')}
                          sx={{
                            bgcolor: m === 'Present' ? '#ECFDF5' : 'transparent',
                            color:   m === 'Present' ? STATUS_COLORS.approved : BRAND.textSecondary,
                            border: `1px solid ${m === 'Present' ? STATUS_COLORS.approved : BRAND.divider}`,
                            '&:hover': { bgcolor: '#ECFDF5', color: STATUS_COLORS.approved },
                          }}
                        >
                          <CheckRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Mark Absent">
                        <IconButton
                          size="small"
                          onClick={() => setMark(r.student_id, 'Absent')}
                          sx={{
                            bgcolor: m === 'Absent' ? '#FEF2F2' : 'transparent',
                            color:   m === 'Absent' ? STATUS_COLORS.rejected : BRAND.textSecondary,
                            border: `1px solid ${m === 'Absent' ? STATUS_COLORS.rejected : BRAND.divider}`,
                            '&:hover': { bgcolor: '#FEF2F2', color: STATUS_COLORS.rejected },
                          }}
                        >
                          <CloseRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
