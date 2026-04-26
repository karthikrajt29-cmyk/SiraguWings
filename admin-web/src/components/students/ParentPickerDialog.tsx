import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon      from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon       from '@mui/icons-material/CloseRounded';
import PersonAddRoundedIcon   from '@mui/icons-material/PersonAddRounded';
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LinkRoundedIcon        from '@mui/icons-material/LinkRounded';
import FamilyRestroomRoundedIcon from '@mui/icons-material/FamilyRestroomRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOwnerParent,
  linkOwnerParentToCenter,
  searchOwnerParents,
  type OwnerParentSearchResult,
} from '../../api/owner.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND }       from '../../theme';
import axios           from 'axios';

interface PickedParent {
  parent_id: string;
  parent_name: string;
  parent_mobile: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  centerId: string;
  onPick: (parent: PickedParent) => void;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Pill mode switcher ────────────────────────────────────────────────────────
function ModeSwitch({
  value,
  onChange,
}: {
  value: 0 | 1;
  onChange: (v: 0 | 1) => void;
}) {
  const btn = (idx: 0 | 1, label: string, icon: React.ReactNode) => {
    const active = value === idx;
    return (
      <Box
        onClick={() => onChange(idx)}
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          py: 0.8,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          bgcolor: active ? '#fff' : 'transparent',
          boxShadow: active ? '0 1px 4px rgba(15,30,53,0.12)' : 'none',
          '&:hover': { bgcolor: active ? '#fff' : 'rgba(255,255,255,0.55)' },
        }}
      >
        <Box sx={{ color: active ? BRAND.primary : BRAND.textSecondary, display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: active ? 700 : 500,
            color: active ? BRAND.textPrimary : BRAND.textSecondary,
            transition: 'all 0.18s',
          }}
        >
          {label}
        </Typography>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        bgcolor: 'rgba(15,30,53,0.06)',
        borderRadius: '10px',
        p: 0.5,
        mx: 3,
        mb: 2,
      }}
    >
      {btn(0, 'Search existing', <PersonSearchRoundedIcon sx={{ fontSize: 17 }} />)}
      {btn(1, 'Add new parent',  <PersonAddRoundedIcon   sx={{ fontSize: 17 }} />)}
    </Box>
  );
}

// ── Parent result card ────────────────────────────────────────────────────────
function ParentCard({
  parent,
  linkingId,
  onSelect,
}: {
  parent: OwnerParentSearchResult;
  linkingId: string | null;
  onSelect: (p: OwnerParentSearchResult) => void;
}) {
  const isMapped  = parent.is_mapped_to_center;
  const isLinking = linkingId === parent.id;

  return (
    <Box
      sx={{
        border: `1.5px solid ${isMapped ? 'rgba(34,197,94,0.3)' : BRAND.divider}`,
        borderRadius: 2.5,
        p: 1.75,
        bgcolor: isMapped ? 'rgba(34,197,94,0.03)' : '#fff',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': {
          borderColor: BRAND.primary,
          boxShadow: '0 2px 10px rgba(232,93,4,0.08)',
        },
      }}
    >
      <Stack direction="row" alignItems="flex-start" gap={1.5}>
        {/* Avatar */}
        <Avatar
          sx={{
            width: 40, height: 40, flexShrink: 0,
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            fontSize: 14, fontWeight: 700,
          }}
        >
          {initials(parent.name)}
        </Avatar>

        {/* Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: BRAND.textPrimary }}>
              {parent.name}
            </Typography>
            {isMapped ? (
              <Chip
                icon={<CheckCircleRoundedIcon sx={{ fontSize: 12 }} />}
                label="In this center"
                size="small"
                sx={{
                  height: 19, fontSize: 10.5, fontWeight: 700,
                  bgcolor: 'rgba(34,197,94,0.12)', color: '#15803d',
                  '& .MuiChip-icon': { color: '#15803d', ml: 0.5 },
                }}
              />
            ) : (
              <Chip
                label="Not in center"
                size="small"
                sx={{
                  height: 19, fontSize: 10.5, fontWeight: 700,
                  bgcolor: 'rgba(245,158,11,0.14)', color: '#92400e',
                }}
              />
            )}
          </Stack>

          <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.3 }}>
            {parent.mobile_number}
            {parent.email && (
              <Box component="span" sx={{ mx: 0.5, opacity: 0.4 }}>·</Box>
            )}
            {parent.email}
          </Typography>

          {/* Children */}
          {parent.children.length > 0 && (
            <Box mt={0.9}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: BRAND.textSecondary,
                textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.4 }}>
                Children
              </Typography>
              <Stack gap={0.3}>
                {parent.children.slice(0, 4).map((c) => (
                  <Stack
                    key={`${c.id}-${c.center_id ?? 'none'}`}
                    direction="row"
                    alignItems="center"
                    gap={0.5}
                  >
                    <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: BRAND.textSecondary, opacity: 0.4, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                      <Box component="span" sx={{ fontWeight: 600, color: BRAND.textPrimary }}>{c.name}</Box>
                      {c.center_name && (
                        <Box component="span" sx={{ opacity: 0.65 }}> · {c.center_name}</Box>
                      )}
                    </Typography>
                  </Stack>
                ))}
                {parent.children.length > 4 && (
                  <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, fontStyle: 'italic', pl: 1 }}>
                    +{parent.children.length - 4} more
                  </Typography>
                )}
              </Stack>
            </Box>
          )}
        </Box>

        {/* Action button */}
        <Button
          variant={isMapped ? 'contained' : 'outlined'}
          size="small"
          disabled={isLinking}
          startIcon={
            isLinking
              ? <CircularProgress size={12} color="inherit" />
              : !isMapped
                ? <LinkRoundedIcon sx={{ fontSize: 15 }} />
                : undefined
          }
          onClick={() => onSelect(parent)}
          sx={{
            flexShrink: 0,
            minWidth: 108,
            fontSize: 12.5,
            fontWeight: 600,
            alignSelf: 'flex-start',
            mt: 0.25,
            ...(isMapped && {
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark ?? BRAND.primary}, ${BRAND.primary})` },
            }),
          }}
        >
          {isLinking ? 'Mapping…' : isMapped ? 'Select' : 'Map & Select'}
        </Button>
      </Stack>
    </Box>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────
export default function ParentPickerDialog({ open, onClose, centerId, onPick }: Props) {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const [tab, setTab]         = useState<0 | 1>(0);
  const [query, setQuery]     = useState('');
  const [debounced, setDebounced] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [newName, setNewName]         = useState('');
  const [newMobile, setNewMobile]     = useState('');
  const [newEmail, setNewEmail]       = useState('');
  const [newAddress, setNewAddress]   = useState('');
  const [newEmergency, setNewEmergency] = useState('');

  useEffect(() => {
    if (open) {
      setTab(0); setQuery(''); setDebounced('');
      setNewName(''); setNewMobile(''); setNewEmail('');
      setNewAddress(''); setNewEmergency('');
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['owner-parent-search', centerId, debounced],
    queryFn: () => searchOwnerParents(debounced, centerId),
    enabled: debounced.length >= 1 && open && tab === 0,
    staleTime: 10_000,
  });

  const linkMut = useMutation({
    mutationFn: (parentId: string) => linkOwnerParentToCenter(centerId, parentId),
    onSuccess: (_data, parentId) => {
      const p = results.find((r) => r.id === parentId);
      if (p) {
        qc.invalidateQueries({ queryKey: ['owner-parent-search'] });
        qc.invalidateQueries({ queryKey: ['owner', 'parents', centerId] });
        onPick({ parent_id: p.id, parent_name: p.name, parent_mobile: p.mobile_number });
        onClose();
      }
      setLinkingId(null);
    },
    onError: (e: Error) => {
      showSnack(e.message ?? 'Failed to map parent', 'error');
      setLinkingId(null);
    },
  });

  const createMut = useMutation({
    mutationFn: () =>
      createOwnerParent(centerId, {
        name: newName.trim(),
        mobile_number: newMobile.trim(),
        email: newEmail.trim() ? newEmail.trim().toLowerCase() : undefined,
        address: newAddress.trim() || null,
        emergency_contact: newEmergency.trim() || null,
      }),
    onSuccess: (parent) => {
      qc.invalidateQueries({ queryKey: ['owner', 'parents', centerId] });
      qc.invalidateQueries({ queryKey: ['owner-parent-search'] });
      showSnack('Parent created and mapped to this center', 'success');
      onPick({ parent_id: parent.id, parent_name: parent.name, parent_mobile: parent.mobile_number });
      onClose();
    },
    onError: (e: unknown) => {
      const httpStatus = axios.isAxiosError(e) ? e.response?.status : undefined;
      const msg =
        (axios.isAxiosError(e) && (e.response?.data as { detail?: string })?.detail) ||
        (e instanceof Error ? e.message : 'Failed to create parent');
      if (httpStatus === 409) {
        showSnack(msg, 'warning');
        setQuery(newMobile.trim());
        setTab(0);
      } else {
        showSnack(msg, 'error');
      }
    },
  });

  const handleSelect = (parent: OwnerParentSearchResult) => {
    if (parent.is_mapped_to_center) {
      onPick({ parent_id: parent.id, parent_name: parent.name, parent_mobile: parent.mobile_number });
      onClose();
    } else {
      setLinkingId(parent.id);
      linkMut.mutate(parent.id);
    }
  };

  const newParentValid = useMemo(() => {
    const mobileOk = /^\d{10}$/.test(newMobile.trim());
    const emailOk  = !newEmail.trim() || /^\S+@\S+\.\S+$/.test(newEmail.trim());
    return newName.trim().length >= 2 && mobileOk && emailOk;
  }, [newName, newMobile, newEmail]);

  const isBusy = createMut.isPending || linkMut.isPending;

  return (
    <Dialog
      open={open}
      onClose={isBusy ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* ── Header ── */}
      <Box sx={{
        background: `linear-gradient(135deg, ${BRAND.navyDark} 0%, ${BRAND.navyLight} 100%)`,
        px: 3, pt: 2.5, pb: 2.5,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <Stack direction="row" gap={1.5} alignItems="center">
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 3px 10px rgba(232,93,4,0.4)`,
            flexShrink: 0,
          }}>
            <FamilyRestroomRoundedIcon sx={{ fontSize: 20, color: '#fff' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              Link a Parent
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', mt: 0.2 }}>
              Search globally · Select or map · Or add new
            </Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={onClose} disabled={isBusy}
          sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* ── Mode switcher ── */}
      <Box sx={{ bgcolor: '#fff', pt: 2.5 }}>
        <ModeSwitch value={tab} onChange={setTab} />
      </Box>

      {/* ── Content ── */}
      <Box sx={{ bgcolor: '#fff', px: 3, pb: 1, minHeight: 320, maxHeight: '55vh', overflowY: 'auto' }}>

        {/* ── SEARCH TAB ── */}
        {tab === 0 && (
          <Stack gap={1.5}>
            <TextField
              autoFocus
              fullWidth
              size="small"
              placeholder="Search by name, phone number, or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ fontSize: 18, color: isFetching ? BRAND.primary : BRAND.textSecondary }} />
                  </InputAdornment>
                ),
                endAdornment: isFetching && (
                  <InputAdornment position="end">
                    <CircularProgress size={14} sx={{ color: BRAND.primary }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&.Mui-focused fieldset': { borderColor: BRAND.primary },
                },
              }}
            />

            {/* Empty / idle state */}
            {!debounced && (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <PersonSearchRoundedIcon sx={{ fontSize: 38, color: 'rgba(15,30,53,0.12)', mb: 1 }} />
                <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>
                  Type a name, phone, or email to find a parent.
                </Typography>
              </Box>
            )}

            {/* No results */}
            {debounced && !isFetching && results.length === 0 && (
              <Box sx={{
                py: 4, textAlign: 'center',
                border: `1.5px dashed ${BRAND.divider}`,
                borderRadius: 2.5,
              }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary, mb: 0.5 }}>
                  No parents found
                </Typography>
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mb: 2 }}>
                  No results for "{debounced}". Try a different search or add a new parent.
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PersonAddRoundedIcon />}
                  onClick={() => {
                    setNewMobile(/^\d+$/.test(debounced) ? debounced : '');
                    setNewName(/^\d+$/.test(debounced) ? '' : debounced);
                    setTab(1);
                  }}
                  sx={{
                    background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                    fontSize: 12.5,
                  }}
                >
                  Add new parent
                </Button>
              </Box>
            )}

            {/* Results */}
            <Stack gap={1}>
              {results.map((p) => (
                <ParentCard
                  key={p.id}
                  parent={p}
                  linkingId={linkingId}
                  onSelect={handleSelect}
                />
              ))}
            </Stack>
          </Stack>
        )}

        {/* ── ADD NEW TAB ── */}
        {tab === 1 && (
          <Stack gap={0}>
            {/* Info banner */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.25,
              bgcolor: 'rgba(232,93,4,0.07)',
              border: `1px solid rgba(232,93,4,0.18)`,
              borderRadius: 2, px: 1.75, py: 1.25, mb: 2.5,
            }}>
              <Box sx={{
                width: 28, height: 28, borderRadius: '8px',
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LinkRoundedIcon sx={{ fontSize: 15, color: '#fff' }} />
              </Box>
              <Typography sx={{ fontSize: 12.5, color: BRAND.textPrimary }}>
                The new parent will be <Box component="span" sx={{ fontWeight: 700 }}>auto-mapped</Box> to this center and linked to the student.
              </Typography>
            </Box>

            {/* Form fields */}
            <Stack gap={2}>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
                  textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75 }}>
                  Full Name *
                </Typography>
                <TextField
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  fullWidth size="small"
                  placeholder="e.g. Priya Sharma"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
                  textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75 }}>
                  Mobile Number *
                </Typography>
                <TextField
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  fullWidth size="small"
                  placeholder="10-digit mobile"
                  inputProps={{ inputMode: 'numeric' }}
                  helperText={
                    newMobile && !/^\d{10}$/.test(newMobile)
                      ? 'Must be exactly 10 digits'
                      : 'Must be unique across all parents'
                  }
                  error={!!newMobile && !/^\d{10}$/.test(newMobile)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
                  textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75 }}>
                  Email <Box component="span" sx={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</Box>
                </Typography>
                <TextField
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  fullWidth size="small"
                  placeholder="parent@example.com"
                  helperText="When provided, a login link is sent to this email."
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
                  textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75 }}>
                  Emergency Contact <Box component="span" sx={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</Box>
                </Typography>
                <TextField
                  value={newEmergency}
                  onChange={(e) => setNewEmergency(e.target.value.replace(/[^0-9+\- ]/g, '').slice(0, 20))}
                  fullWidth size="small"
                  placeholder="e.g. +91 98765 43210"
                  inputProps={{ inputMode: 'tel' }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: BRAND.textSecondary,
                  textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.75 }}>
                  Home Address <Box component="span" sx={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</Box>
                </Typography>
                <TextField
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  fullWidth size="small"
                  multiline minRows={2}
                  placeholder="Street, city, pincode…"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
            </Stack>
          </Stack>
        )}
      </Box>

      {/* ── Footer ── */}
      <Divider />
      <Box sx={{
        px: 3, py: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        bgcolor: BRAND.surface ?? '#fafafa',
      }}>
        <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary }}>
          {tab === 0
            ? `${results.length > 0 ? `${results.length} result${results.length > 1 ? 's' : ''}` : ''}`
            : 'Parent will be linked to this center on creation.'}
        </Typography>
        <Stack direction="row" gap={1.25}>
          <Button onClick={onClose} disabled={isBusy} size="small"
            sx={{ color: BRAND.textSecondary, fontSize: 13 }}>
            Cancel
          </Button>
          {tab === 1 && (
            <Button
              variant="contained"
              size="small"
              disabled={!newParentValid || createMut.isPending}
              onClick={() => createMut.mutate()}
              startIcon={
                createMut.isPending
                  ? <CircularProgress size={13} color="inherit" />
                  : <PersonAddRoundedIcon />
              }
              sx={{
                fontSize: 13, fontWeight: 600, px: 2,
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark ?? BRAND.primary}, ${BRAND.primary})` },
                '&:disabled': { opacity: 0.5 },
              }}
            >
              {createMut.isPending ? 'Creating…' : 'Create & Select'}
            </Button>
          )}
        </Stack>
      </Box>
    </Dialog>
  );
}
