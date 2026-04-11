import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon           from '@mui/icons-material/AddRounded';
import EditRoundedIcon          from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon        from '@mui/icons-material/DeleteRounded';
import CloseRoundedIcon         from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon         from '@mui/icons-material/CheckRounded';
import SearchRoundedIcon        from '@mui/icons-material/SearchRounded';
import CategoryRoundedIcon      from '@mui/icons-material/CategoryRounded';
import PeopleAltRoundedIcon     from '@mui/icons-material/PeopleAltRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import LocationOnRoundedIcon    from '@mui/icons-material/LocationOnRounded';
import ApartmentRoundedIcon     from '@mui/icons-material/ApartmentRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import SchoolRoundedIcon         from '@mui/icons-material/SchoolRounded';
import TranslateRoundedIcon      from '@mui/icons-material/TranslateRounded';
import ReportRoundedIcon         from '@mui/icons-material/ReportRounded';
import BlockRoundedIcon          from '@mui/icons-material/BlockRounded';
import { SvgIconComponent }     from '@mui/icons-material';
import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ALL_GROUPS,
  GROUP_LABELS,
  createMasterDataItem,
  deleteMasterDataItem,
  getMasterData,
  updateMasterDataItem,
  type MasterDataGroup,
  type MasterDataItem,
} from '../../api/masterData.api';
import { BRAND } from '../../theme';
import { useSnackbar } from '../../contexts/SnackbarContext';

// ── Config ─────────────────────────────────────────────────────────────────────
const GROUP_COLORS: Record<MasterDataGroup, string> = {
  category:           '#7C3AED',
  age_group:          '#0891B2',
  operating_days:     '#D97706',
  city:               '#059669',
  facilities:         '#DB2777',
  fee_range:          '#EA580C',
  board:              '#1D4ED8',
  language:           '#0F766E',
  rejection_category: '#DC2626',
  suspension_reason:  '#B45309',
};

const GROUP_ICONS: Record<MasterDataGroup, SvgIconComponent> = {
  category:           CategoryRoundedIcon,
  age_group:          PeopleAltRoundedIcon,
  operating_days:     CalendarTodayRoundedIcon,
  city:               LocationOnRoundedIcon,
  facilities:         ApartmentRoundedIcon,
  fee_range:          CurrencyRupeeRoundedIcon,
  board:              SchoolRoundedIcon,
  language:           TranslateRoundedIcon,
  rejection_category: ReportRoundedIcon,
  suspension_reason:  BlockRoundedIcon,
};

// ── Add / Edit Dialog ──────────────────────────────────────────────────────────
interface ItemDialogProps {
  open: boolean;
  group: MasterDataGroup;
  item?: MasterDataItem | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

function ItemDialog({ open, group, item, nextOrder, onClose, onSaved }: ItemDialogProps) {
  const { showSnack } = useSnackbar();
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [order, setOrder] = useState(0);

  useEffect(() => {
    if (open) {
      setLabel(item?.label ?? '');
      setValue(item?.value ?? '');
      setOrder(item?.sort_order ?? nextOrder);
    }
  }, [open, item, nextOrder]);

  const createMut = useMutation({
    mutationFn: () =>
      createMasterDataItem({ group_name: group, label: label.trim(), value: value.trim(), sort_order: order }),
    onSuccess: () => { showSnack('Item added', 'success'); onSaved(); onClose(); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      updateMasterDataItem(item!.id, { label: label.trim(), value: value.trim(), sort_order: order }),
    onSuccess: () => { showSnack('Item updated', 'success'); onSaved(); onClose(); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const saving = createMut.isPending || updateMut.isPending;
  const isEdit = !!item;
  const color  = GROUP_COLORS[group];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${BRAND.divider}` }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Box sx={{
              width: 28, height: 28, borderRadius: '8px',
              bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AddRoundedIcon sx={{ fontSize: 15, color }} />
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: BRAND.textPrimary }}>
              {isEdit ? `Edit — ${item?.label}` : `Add to ${GROUP_LABELS[group]}`}
            </Typography>
          </Stack>
          <IconButton size="small" onClick={onClose}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 2.5 }}>
        <Stack spacing={2}>
          <TextField
            label="Display Label"
            size="small"
            fullWidth
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Dance"
            autoFocus
          />
          <TextField
            label="Stored Value"
            size="small"
            fullWidth
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. Dance"
            helperText="Unique key saved to the database"
          />
          <TextField
            label="Sort Order"
            size="small"
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            sx={{ maxWidth: 120 }}
          />

          <Stack direction="row" gap={1.5} justifyContent="flex-end" pt={0.5}>
            <Button variant="outlined" onClick={onClose} disabled={saving}
              sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary, fontSize: 13 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => { if (!label.trim() || !value.trim()) return; isEdit ? updateMut.mutate() : createMut.mutate(); }}
              disabled={saving || !label.trim() || !value.trim()}
              startIcon={saving ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <CheckRoundedIcon />}
              sx={{
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
                fontSize: 13,
              }}
            >
              {isEdit ? 'Save Changes' : 'Add Item'}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

// ── Group sidebar item ─────────────────────────────────────────────────────────
interface SidebarItemProps {
  group: MasterDataGroup;
  count: number;
  active: boolean;
  onClick: () => void;
}

function SidebarItem({ group, count, active, onClick }: SidebarItemProps) {
  const color = GROUP_COLORS[group];
  const Icon  = GROUP_ICONS[group];

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 1.5, py: 1.2, borderRadius: '10px', cursor: 'pointer',
        transition: 'all 0.15s',
        background: active ? `${color}12` : 'transparent',
        border: active ? `1px solid ${color}30` : '1px solid transparent',
        '&:hover': { background: active ? `${color}12` : BRAND.surface },
      }}
    >
      <Box sx={{
        width: 32, height: 32, borderRadius: '9px', flexShrink: 0,
        bgcolor: active ? `${color}20` : `${color}10`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon sx={{ fontSize: 16, color }} />
      </Box>
      <Box flex={1} minWidth={0}>
        <Typography sx={{
          fontSize: 13, fontWeight: active ? 700 : 500,
          color: active ? color : BRAND.textPrimary,
          lineHeight: 1.3,
        }}>
          {GROUP_LABELS[group]}
        </Typography>
      </Box>
      <Chip
        label={count}
        size="small"
        sx={{
          height: 18, fontSize: 11, fontWeight: 700, flexShrink: 0,
          bgcolor: active ? `${color}20` : BRAND.surface,
          color: active ? color : BRAND.textSecondary,
          '.MuiChip-label': { px: 0.8 },
        }}
      />
    </Box>
  );
}

// ── Right panel — items for the selected group ─────────────────────────────────
interface GroupPanelProps {
  group: MasterDataGroup;
}

function GroupPanel({ group }: GroupPanelProps) {
  const { showSnack } = useSnackbar();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem,   setEditItem]   = useState<MasterDataItem | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['master-data', group, showInactive],
    queryFn: () => getMasterData(group, showInactive),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['master-data', group] });

  const filtered = useMemo(() =>
    search.trim()
      ? data.filter((d) =>
          d.label.toLowerCase().includes(search.toLowerCase()) ||
          d.value.toLowerCase().includes(search.toLowerCase()),
        )
      : data,
  [data, search]);

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateMasterDataItem(id, { is_active }),
    onSuccess: () => { showSnack('Updated', 'success'); refresh(); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMasterDataItem(id),
    onSuccess: () => { showSnack('Item removed', 'success'); refresh(); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const color    = GROUP_COLORS[group];
  const Icon     = GROUP_ICONS[group];
  const nextOrder = data.length ? Math.max(...data.map((d) => d.sort_order)) + 1 : 1;

  return (
    <>
      {/* Panel header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between"
        sx={{ px: 2.5, py: 1.8, borderBottom: `1px solid ${BRAND.divider}`, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box sx={{
            width: 34, height: 34, borderRadius: '10px',
            bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon sx={{ fontSize: 17, color }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: BRAND.textPrimary, lineHeight: 1.2 }}>
              {GROUP_LABELS[group]}
            </Typography>
            <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
              {data.length} item{data.length !== 1 ? 's' : ''}
              {!showInactive ? ' · active only' : ' · all'}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1.5}>
          {/* Inactive toggle */}
          <Tooltip title={showInactive ? 'Showing all (incl. inactive)' : 'Active items only'}>
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ cursor: 'pointer' }}
              onClick={() => setShowInactive((v) => !v)}>
              <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, userSelect: 'none' }}>
                Show inactive
              </Typography>
              <Switch size="small" checked={showInactive} onChange={(_, v) => setShowInactive(v)}
                sx={{ '& .MuiSwitch-thumb': { width: 12, height: 12 },
                  '& .MuiSwitch-track': { borderRadius: 6 } }} />
            </Stack>
          </Tooltip>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddRoundedIcon sx={{ fontSize: 15 }} />}
            onClick={() => { setEditItem(null); setDialogOpen(true); }}
            sx={{
              fontSize: 12, py: 0.6, px: 1.5,
              background: color,
              '&:hover': { background: color, filter: 'brightness(0.88)' },
              boxShadow: 'none',
            }}
          >
            Add Item
          </Button>
        </Stack>
      </Stack>

      {/* Search bar */}
      <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${BRAND.divider}`, flexShrink: 0 }}>
        <TextField
          size="small"
          fullWidth
          placeholder={`Search ${GROUP_LABELS[group].toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 16, color: BRAND.textSecondary }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch('')}>
                  <CloseRoundedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              fontSize: 13,
              bgcolor: BRAND.surface,
              '& fieldset': { borderColor: BRAND.divider },
            },
          }}
        />
      </Box>

      {/* Items list — scrollable */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
        {isLoading ? (
          <Stack alignItems="center" justifyContent="center" height={200}>
            <CircularProgress size={24} sx={{ color }} />
          </Stack>
        ) : filtered.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" height={180} gap={1}>
            <SearchRoundedIcon sx={{ fontSize: 32, color: BRAND.divider }} />
            <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>
              {search ? 'No matches found' : 'No items yet — click Add Item'}
            </Typography>
          </Stack>
        ) : (
          filtered.map((item, idx) => (
            <Box key={item.id}>
              {idx > 0 && <Divider sx={{ mx: 1 }} />}
              <Stack
                direction="row"
                alignItems="center"
                gap={1}
                sx={{
                  px: 1, py: 0.9,
                  borderRadius: '8px',
                  opacity: item.is_active ? 1 : 0.5,
                  transition: 'background 0.12s',
                  '&:hover': { background: BRAND.surface },
                  '&:hover .row-actions': { opacity: 1 },
                }}
              >
                {/* Color dot */}
                <Box sx={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  bgcolor: item.is_active ? color : BRAND.divider,
                }} />

                {/* Label + value key */}
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }}>
                      {item.label}
                    </Typography>
                    {item.label !== item.value && (
                      <Typography sx={{
                        fontSize: 10, color: BRAND.textSecondary, fontFamily: 'monospace',
                        bgcolor: '#F1F5F9', px: 0.8, py: 0.15, borderRadius: 0.8,
                      }}>
                        {item.value}
                      </Typography>
                    )}
                    {!item.is_active && (
                      <Chip label="Inactive" size="small"
                        sx={{ height: 15, fontSize: 10, '.MuiChip-label': { px: 0.6 },
                          bgcolor: '#FEF2F2', color: '#DC2626' }} />
                    )}
                  </Stack>
                </Box>

                {/* Sort order badge */}
                <Typography sx={{
                  fontSize: 10, color: BRAND.textSecondary,
                  bgcolor: BRAND.surface, px: 0.8, py: 0.2, borderRadius: 1,
                  fontWeight: 600, flexShrink: 0,
                }}>
                  #{item.sort_order}
                </Typography>

                {/* Row actions — appear on hover */}
                <Stack direction="row" className="row-actions" gap={0.25}
                  sx={{ opacity: 0, transition: 'opacity 0.12s', flexShrink: 0 }}>
                  <Tooltip title={item.is_active ? 'Deactivate' : 'Activate'}>
                    <Switch
                      size="small"
                      checked={item.is_active}
                      onChange={(_, v) => toggleMut.mutate({ id: item.id, is_active: v })}
                      sx={{
                        '& .MuiSwitch-thumb': { width: 12, height: 12 },
                        '& .MuiSwitch-track': { borderRadius: 6 },
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => { setEditItem(item); setDialogOpen(true); }}>
                      <EditRoundedIcon sx={{ fontSize: 14, color: BRAND.textSecondary }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small"
                      onClick={() => {
                        if (window.confirm(`Delete "${item.label}"?`)) deleteMut.mutate(item.id);
                      }}>
                      <DeleteRoundedIcon sx={{ fontSize: 14, color: '#DC2626' }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>
          ))
        )}
      </Box>

      <ItemDialog
        open={dialogOpen}
        group={group}
        item={editItem}
        nextOrder={nextOrder}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
      />
    </>
  );
}

// ── Count badge — one hook per group, no loop violation ───────────────────────
function useGroupCounts(): Record<MasterDataGroup, number> {
  const c  = useQuery({ queryKey: ['master-data', 'category',           false], queryFn: () => getMasterData('category',           false) });
  const a  = useQuery({ queryKey: ['master-data', 'age_group',          false], queryFn: () => getMasterData('age_group',          false) });
  const o  = useQuery({ queryKey: ['master-data', 'operating_days',     false], queryFn: () => getMasterData('operating_days',     false) });
  const t  = useQuery({ queryKey: ['master-data', 'city',               false], queryFn: () => getMasterData('city',               false) });
  const f  = useQuery({ queryKey: ['master-data', 'facilities',         false], queryFn: () => getMasterData('facilities',         false) });
  const r  = useQuery({ queryKey: ['master-data', 'fee_range',          false], queryFn: () => getMasterData('fee_range',          false) });
  const b  = useQuery({ queryKey: ['master-data', 'board',              false], queryFn: () => getMasterData('board',              false) });
  const l  = useQuery({ queryKey: ['master-data', 'language',           false], queryFn: () => getMasterData('language',           false) });
  const rc = useQuery({ queryKey: ['master-data', 'rejection_category', false], queryFn: () => getMasterData('rejection_category', false) });
  const sr = useQuery({ queryKey: ['master-data', 'suspension_reason',  false], queryFn: () => getMasterData('suspension_reason',  false) });
  return {
    category:           c.data?.length  ?? 0,
    age_group:          a.data?.length  ?? 0,
    operating_days:     o.data?.length  ?? 0,
    city:               t.data?.length  ?? 0,
    facilities:         f.data?.length  ?? 0,
    fee_range:          r.data?.length  ?? 0,
    board:              b.data?.length  ?? 0,
    language:           l.data?.length  ?? 0,
    rejection_category: rc.data?.length ?? 0,
    suspension_reason:  sr.data?.length ?? 0,
  };
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function MasterDataTab() {
  const [selectedGroup, setSelectedGroup] = useState<MasterDataGroup>('category');
  const counts = useGroupCounts();

  return (
    <Box sx={{
      display: 'flex',
      height: 'calc(100vh - 196px)',
      minHeight: 520,
      border: `1px solid ${BRAND.divider}`,
      borderRadius: 3,
      overflow: 'hidden',
      bgcolor: '#fff',
    }}>
      {/* ── Left sidebar ── */}
      <Box sx={{
        width: 220,
        flexShrink: 0,
        borderRight: `1px solid ${BRAND.divider}`,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: BRAND.surface,
      }}>
        {/* Sidebar header */}
        <Box sx={{ px: 2, py: 2, borderBottom: `1px solid ${BRAND.divider}` }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: BRAND.textSecondary,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Groups
          </Typography>
        </Box>

        {/* Group list */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1 }}>
          <Stack gap={0.5}>
            {ALL_GROUPS.map((g) => (
              <SidebarItem
                key={g}
                group={g}
                count={counts[g] ?? 0}
                active={selectedGroup === g}
                onClick={() => setSelectedGroup(g)}
              />
            ))}
          </Stack>
        </Box>

        {/* Sidebar footer hint */}
        <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${BRAND.divider}` }}>
          <Typography sx={{ fontSize: 10, color: BRAND.textSecondary, lineHeight: 1.5 }}>
            Changes apply instantly to all dropdowns in the app.
          </Typography>
        </Box>
      </Box>

      {/* ── Right panel ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <GroupPanel key={selectedGroup} group={selectedGroup} />
      </Box>
    </Box>
  );
}
