import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchRoundedIcon  from '@mui/icons-material/SearchRounded';
import DeleteRoundedIcon  from '@mui/icons-material/DeleteRounded';
import AddRoundedIcon     from '@mui/icons-material/AddRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listOwnerBatchStudents,
  addOwnerBatchStudent,
  removeOwnerBatchStudent,
  listOwnerStudents,
  type OwnerBatchStudent,
  type OwnerStudent,
} from '../../api/owner.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { DialogHeader, DialogFooter } from '../common/DialogHeader';
import { BRAND, STATUS_COLORS } from '../../theme';

interface Props {
  open: boolean;
  onClose: () => void;
  centerId: string;
  batchId: string | null;
  batchName: string;
}

export default function BatchStudentsModal({ open, onClose, centerId, batchId, batchName }: Props) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const [tab, setTab] = useState<'roster' | 'add'>('roster');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const rosterQuery = useQuery({
    queryKey: ['owner', 'batchStudents', centerId, batchId],
    queryFn: () => listOwnerBatchStudents(centerId, batchId!),
    enabled: open && !!batchId,
  });

  const allStudentsQuery = useQuery({
    queryKey: ['owner', 'students', centerId],
    queryFn: () => listOwnerStudents(centerId),
    enabled: open && !!centerId,
  });

  const rosterIds = useMemo(
    () => new Set((rosterQuery.data ?? []).map((s) => s.student_id)),
    [rosterQuery.data],
  );

  const eligible = useMemo(() => {
    const all = allStudentsQuery.data ?? [];
    const filtered = all.filter((s) => !rosterIds.has(s.id));
    if (!search.trim()) return filtered;
    const q = search.toLowerCase();
    return filtered.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.parent_name ?? '').toLowerCase().includes(q) ||
      (s.parent_mobile ?? '').includes(q),
    );
  }, [allStudentsQuery.data, rosterIds, search]);

  const filteredRoster = useMemo(() => {
    const list = rosterQuery.data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.parent_name ?? '').toLowerCase().includes(q),
    );
  }, [rosterQuery.data, search]);

  const addMut = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const sid of ids) {
        await addOwnerBatchStudent(centerId, batchId!, sid);
      }
      return ids.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['owner', 'batchStudents', centerId, batchId] });
      showSnack(`${count} student${count === 1 ? '' : 's'} added`, 'success');
      setPicked(new Set());
      setTab('roster');
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const removeMut = useMutation({
    mutationFn: (studentId: string) => removeOwnerBatchStudent(centerId, batchId!, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'batchStudents', centerId, batchId] });
      showSnack('Student removed from batch', 'success');
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const close = () => {
    setSearch('');
    setPicked(new Set());
    setTab('roster');
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}>

      <DialogHeader
        icon={<PeopleAltRoundedIcon sx={{ fontSize: 20 }} />}
        title="Batch Students"
        subtitle={batchName}
        onClose={close}
        disabled={addMut.isPending}
      />

      {/* Mode tabs */}
      <Box sx={{ borderBottom: `1px solid ${BRAND.divider}`, bgcolor: '#fff' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setSearch(''); }}
          sx={{ px: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 } }}
        >
          <Tab value="roster" label={`Roster (${rosterQuery.data?.length ?? 0})`} />
          <Tab value="add"    label="Add students" />
        </Tabs>
      </Box>

      {/* Search */}
      <Box sx={{ px: 2, pt: 2, pb: 1, bgcolor: '#fff' }}>
        <TextField
          size="small"
          fullWidth
          placeholder={tab === 'roster' ? 'Search this batch…' : 'Search center students…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>

      <DialogContent sx={{ p: 0, overflowY: 'auto', flex: 1 }}>
        {tab === 'roster' ? (
          <RosterList
            data={filteredRoster}
            loading={rosterQuery.isLoading}
            removing={removeMut.isPending ? removeMut.variables as string : null}
            onRemove={(sid) => removeMut.mutate(sid)}
          />
        ) : (
          <AddList
            data={eligible}
            loading={allStudentsQuery.isLoading}
            picked={picked}
            onToggle={toggle}
          />
        )}
      </DialogContent>

      <DialogFooter
        hint={
          tab === 'add' && eligible.length > 0
            ? `${eligible.length} eligible · ${picked.size} selected`
            : undefined
        }
      >
        <Button onClick={close} disabled={addMut.isPending}
          sx={{ color: BRAND.textSecondary, fontSize: 13 }}>
          Close
        </Button>
        {tab === 'add' && (
          <Button
            variant="contained"
            startIcon={addMut.isPending ? <CircularProgress size={13} color="inherit" /> : <AddRoundedIcon />}
            disabled={picked.size === 0 || addMut.isPending}
            onClick={() => addMut.mutate(Array.from(picked))}
            sx={{
              fontSize: 13, fontWeight: 600, px: 2.5,
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              '&:hover': { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primary})` },
            }}
          >
            {addMut.isPending ? 'Adding…' : `Add ${picked.size || ''} student${picked.size === 1 ? '' : 's'}`}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}

function RosterList({
  data,
  loading,
  removing,
  onRemove,
}: {
  data: OwnerBatchStudent[];
  loading: boolean;
  removing: string | null;
  onRemove: (id: string) => void;
}) {
  if (loading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} sx={{ color: BRAND.primary }} /></Box>;
  }
  if (data.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>
          No students in this batch yet — switch to "Add students" to assign.
        </Typography>
      </Box>
    );
  }
  return (
    <Box>
      {data.map((s) => (
        <Stack
          key={s.student_id}
          direction="row"
          alignItems="center"
          gap={1.5}
          sx={{
            px: 2.5, py: 1.5,
            '&:not(:last-child)': { borderBottom: `1px solid ${BRAND.divider}` },
          }}
        >
          <Avatar sx={{
            width: 34, height: 34,
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            fontSize: 12, fontWeight: 700, color: '#fff',
          }}>
            {s.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{s.name}</Typography>
            <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }} noWrap>
              {s.parent_name ?? 'No parent linked'}
              {s.gender ? ` · ${s.gender}` : ''}
            </Typography>
          </Box>
          <Tooltip title="Remove from batch">
            <IconButton size="small" onClick={() => onRemove(s.student_id)} disabled={removing === s.student_id}>
              <DeleteRoundedIcon sx={{ fontSize: 18, color: STATUS_COLORS.rejected }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ))}
    </Box>
  );
}

function AddList({
  data,
  loading,
  picked,
  onToggle,
}: {
  data: OwnerStudent[];
  loading: boolean;
  picked: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (loading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} sx={{ color: BRAND.primary }} /></Box>;
  }
  if (data.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>
          All eligible students are already in this batch.
        </Typography>
      </Box>
    );
  }
  return (
    <>
      <Divider />
      <Box>
        {data.map((s) => {
          const checked = picked.has(s.id);
          return (
            <Stack
              key={s.id}
              direction="row"
              alignItems="center"
              gap={1.5}
              onClick={() => onToggle(s.id)}
              sx={{
                px: 2.5, py: 1.5,
                cursor: 'pointer',
                bgcolor: checked ? BRAND.primaryBg : 'transparent',
                transition: 'background 0.12s',
                '&:hover': { bgcolor: checked ? BRAND.primaryBgHover : BRAND.surface },
                '&:not(:last-child)': { borderBottom: `1px solid ${BRAND.divider}` },
              }}
            >
              <Checkbox checked={checked} size="small" sx={{ p: 0, color: BRAND.primary }} />
              <Avatar sx={{
                width: 34, height: 34,
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                fontSize: 12, fontWeight: 700, color: '#fff',
              }}>
                {s.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{s.name}</Typography>
                <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }} noWrap>
                  {s.parent_name ?? 'No parent linked'}
                  {s.gender ? ` · ${s.gender}` : ''}
                </Typography>
              </Box>
            </Stack>
          );
        })}
      </Box>
    </>
  );
}
