import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import MergeIcon from '@mui/icons-material/MergeType';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDuplicates,
  getMergeHistory,
  keepSeparate,
  mergeStudents,
  type DuplicatePair,
} from '../../api/students.api';
import PagedTable from '../../components/common/PagedTable';
import { type GridColDef } from '@mui/x-data-grid';
import { useSnackbar } from '../../contexts/SnackbarContext';

function DuplicateCard({ pair, onMerge, onKeep, loading }: {
  pair: DuplicatePair;
  onMerge: (kept: string, merged: string) => void;
  onKeep: (a: string, b: string) => void;
  loading: boolean;
}) {
  const StudentInfo = ({ student }: { student: DuplicatePair['student_a'] }) => (
    <Box>
      <Typography variant="subtitle2" fontWeight={600}>{student.name}</Typography>
      <Typography variant="body2" color="text.secondary">{student.dob ?? '—'} · {student.gender ?? '—'}</Typography>
      <Typography variant="body2" color="text.secondary">{student.center_name}</Typography>
      {student.batch_name && <Typography variant="caption">{student.batch_name}</Typography>}
    </Box>
  );

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" mb={1}>
          <Typography variant="caption" color="text.secondary">Match score</Typography>
          <Chip
            label={`${Math.round(pair.match_score * 100)}%`}
            size="small"
            color={pair.match_score >= 0.9 ? 'error' : 'warning'}
          />
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={5}><StudentInfo student={pair.student_a} /></Grid>
          <Grid item xs={2} display="flex" alignItems="center" justifyContent="center">
            <Typography variant="h6" color="text.secondary">vs</Typography>
          </Grid>
          <Grid item xs={5}><StudentInfo student={pair.student_b} /></Grid>
        </Grid>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" gap={1} justifyContent="flex-end">
          <Button
            size="small"
            variant="outlined"
            startIcon={<CallSplitIcon />}
            onClick={() => onKeep(pair.student_a.id, pair.student_b.id)}
            disabled={loading}
          >
            Keep Separate
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<MergeIcon />}
            color="primary"
            onClick={() => onMerge(pair.student_a.id, pair.student_b.id)}
            disabled={loading}
          >
            Merge → Keep A
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DuplicatesPage() {
  const [tab, setTab] = useState(0);
  const [histPage, setHistPage] = useState(0);
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const { data: dupData, isLoading: dupLoading } = useQuery({
    queryKey: ['duplicates'],
    queryFn: () => getDuplicates({ size: 50 }),
  });

  const { data: histData, isLoading: histLoading } = useQuery({
    queryKey: ['merge-history', histPage],
    queryFn: () => getMergeHistory({ page: histPage, size: 25 }),
    enabled: tab === 1,
  });

  const mergeMut = useMutation({
    mutationFn: ({ kept, merged }: { kept: string; merged: string }) =>
      mergeStudents({ kept_student_id: kept, merged_student_id: merged }),
    onSuccess: () => { showSnack('Students merged', 'success'); qc.invalidateQueries({ queryKey: ['duplicates'] }); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const keepMut = useMutation({
    mutationFn: ({ a, b }: { a: string; b: string }) =>
      keepSeparate({ student_a_id: a, student_b_id: b }),
    onSuccess: () => { showSnack('Marked as separate'); qc.invalidateQueries({ queryKey: ['duplicates'] }); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const histColumns: GridColDef[] = [
    { field: 'kept_student_name', headerName: 'Kept', flex: 1.5 },
    { field: 'merged_student_name', headerName: 'Merged / Rejected', flex: 1.5 },
    { field: 'action', headerName: 'Action', flex: 0.8 },
    { field: 'reviewed_by_name', headerName: 'Reviewed By', flex: 1.5 },
    { field: 'reviewed_at', headerName: 'Date', flex: 1 },
  ];

  return (
    <Box>
      <Typography variant="h5" mb={2}>Student Duplicates</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`Pending Review (${dupData?.total ?? 0})`} />
        <Tab label="Merge History" />
      </Tabs>

      {tab === 0 && (
        <>
          {dupLoading && <Typography color="text.secondary">Loading…</Typography>}
          {!dupLoading && (dupData?.items ?? []).length === 0 && (
            <Typography color="text.secondary">No duplicate pairs to review.</Typography>
          )}
          <Stack spacing={2}>
            {(dupData?.items ?? []).map((pair) => (
              <DuplicateCard
                key={pair.id}
                pair={pair}
                onMerge={(kept, merged) => mergeMut.mutate({ kept, merged })}
                onKeep={(a, b) => keepMut.mutate({ a, b })}
                loading={mergeMut.isPending || keepMut.isPending}
              />
            ))}
          </Stack>
        </>
      )}

      {tab === 1 && (
        <PagedTable
          rows={histData?.items ?? []}
          columns={histColumns}
          total={histData?.total ?? 0}
          page={histPage}
          pageSize={25}
          loading={histLoading}
          onPageChange={setHistPage}
          onPageSizeChange={() => {}}
          emptyMessage="No merge history."
        />
      )}
    </Box>
  );
}
