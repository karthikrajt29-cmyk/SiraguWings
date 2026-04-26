import {
  Avatar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon        from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon       from '@mui/icons-material/SearchRounded';
import PersonAddRoundedIcon    from '@mui/icons-material/PersonAddRounded';
import SchoolRoundedIcon       from '@mui/icons-material/SchoolRounded';
import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getStudents, enrollStudents, type Student } from '../../api/students.api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { BRAND } from '../../theme';

interface Props {
  open: boolean;
  centerId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MapStudentModal({ open, centerId, onClose, onSuccess }: Props) {
  const [mobile, setMobile]         = useState('');
  const [submitted, setSubmitted]   = useState('');
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const { showSnack }               = useSnackbar();
  const qc                          = useQueryClient();
  const inputRef                    = useRef<HTMLInputElement>(null);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['student-search-by-mobile', submitted],
    queryFn: () => getStudents({ search: submitted, size: 50 }).then((r) => r.items),
    enabled: submitted.length >= 3,
  });

  const students: Student[] = data ?? [];

  const enrollMut = useMutation({
    mutationFn: () => enrollStudents({ center_id: centerId, student_ids: Array.from(selected) }),
    onSuccess: (res) => {
      showSnack(res.message || 'Students mapped to center', 'success');
      qc.invalidateQueries({ queryKey: ['center-enrolled-students', centerId] });
      qc.invalidateQueries({ queryKey: ['students'] });
      handleClose();
      onSuccess?.();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const handleClose = () => {
    setMobile('');
    setSubmitted('');
    setSelected(new Set());
    onClose();
  };

  const handleSearch = () => {
    const trimmed = mobile.trim();
    if (trimmed.length < 3) { showSnack('Enter at least 3 characters', 'warning'); return; }
    setSelected(new Set());
    setSubmitted(trimmed);
  };

  const toggleStudent = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = students.length > 0 && students.every((s) => selected.has(s.id));
  const toggleAll   = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(students.map((s) => s.id)));
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>

      {/* ── Header ── */}
      <DialogTitle sx={{ p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${BRAND.divider}` }}>
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px',
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PersonAddRoundedIcon sx={{ fontSize: 17, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: BRAND.textPrimary }}>
                Map Student to Center
              </Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                Search by parent mobile number
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={handleClose} disabled={enrollMut.isPending}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      {/* ── Search bar ── */}
      <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 0 }}>
        <Stack direction="row" gap={1} mb={2}>
          <TextField
            inputRef={inputRef}
            size="small"
            fullWidth
            placeholder="Parent mobile number…"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 17, color: BRAND.textSecondary }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={isFetching}
            sx={{
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
              fontSize: 13, px: 2.5, flexShrink: 0,
            }}
          >
            {isFetching ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Search'}
          </Button>
        </Stack>

        {/* ── Results ── */}
        {isError && (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: 'error.main' }}>Search failed. Try again.</Typography>
          </Box>
        )}

        {!isFetching && submitted && students.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <SchoolRoundedIcon sx={{ fontSize: 32, color: BRAND.divider, mb: 1 }} />
            <Typography sx={{ fontSize: 13, color: BRAND.textSecondary }}>
              No students found for <strong>{submitted}</strong>
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary, mt: 0.5 }}>
              Make sure the parent is registered with that mobile number.
            </Typography>
          </Box>
        )}

        {students.length > 0 && (
          <Box>
            {/* Select-all row */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Stack direction="row" alignItems="center" gap={0.5}>
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={selected.size > 0 && !allSelected}
                  onChange={toggleAll}
                  sx={{ p: 0.5, color: BRAND.primary, '&.Mui-checked': { color: BRAND.primary } }}
                />
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                  {students.length} student{students.length !== 1 ? 's' : ''} found
                </Typography>
              </Stack>
              {selected.size > 0 && (
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: BRAND.primary }}>
                  {selected.size} selected
                </Typography>
              )}
            </Stack>

            <Stack gap={1} sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5, pb: 1 }}>
              {students.map((s) => {
                const isSelected = selected.has(s.id);
                return (
                  <Box
                    key={s.id}
                    onClick={() => toggleStudent(s.id)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      p: 1.25, borderRadius: 1.5, cursor: 'pointer',
                      border: `1px solid ${isSelected ? BRAND.primary : BRAND.divider}`,
                      bgcolor: isSelected ? `${BRAND.primary}08` : '#fff',
                      transition: 'all .12s',
                      '&:hover': { borderColor: BRAND.primary, bgcolor: `${BRAND.primary}05` },
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onChange={() => toggleStudent(s.id)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ p: 0, color: BRAND.primary, '&.Mui-checked': { color: BRAND.primary } }}
                    />
                    <Avatar sx={{
                      width: 34, height: 34, fontSize: 12, fontWeight: 700, flexShrink: 0,
                      bgcolor: BRAND.primaryBg, color: BRAND.primary,
                    }}>
                      {s.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: BRAND.textPrimary }} noWrap>
                        {s.name}
                      </Typography>
                      <Stack direction="row" gap={1.5} flexWrap="wrap">
                        {s.parent_name && (
                          <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                            Parent: {s.parent_name}
                          </Typography>
                        )}
                        {s.parent_mobile && (
                          <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                            {s.parent_mobile}
                          </Typography>
                        )}
                        {s.gender && (
                          <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>{s.gender}</Typography>
                        )}
                        {s.date_of_birth && (
                          <Typography sx={{ fontSize: 11, color: BRAND.textSecondary }}>
                            DOB: {new Date(s.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Typography>
                        )}
                      </Stack>
                      {/* already enrolled centers */}
                      {s.centers.length > 0 && (
                        <Stack direction="row" gap={0.5} mt={0.4} flexWrap="wrap">
                          {s.centers.map((c) => (
                            <Typography key={c.center_id} sx={{
                              fontSize: 10, px: 0.75, py: 0.2, borderRadius: 0.75,
                              bgcolor: c.center_id === centerId ? `${BRAND.primary}15` : 'rgba(100,116,139,0.1)',
                              color: c.center_id === centerId ? BRAND.primary : BRAND.textSecondary,
                              fontWeight: 500,
                            }}>
                              {c.center_name}{c.center_id === centerId ? ' ✓ already mapped' : ''}
                            </Typography>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}
      </DialogContent>

      {/* ── Footer ── */}
      <Divider sx={{ mt: 2 }} />
      <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5, bgcolor: BRAND.surface }}>
        <Button variant="outlined" onClick={handleClose} disabled={enrollMut.isPending}
          sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary, fontSize: 13 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => enrollMut.mutate()}
          disabled={selected.size === 0 || enrollMut.isPending}
          startIcon={
            enrollMut.isPending
              ? <CircularProgress size={13} sx={{ color: '#fff' }} />
              : <PersonAddRoundedIcon />
          }
          sx={{
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
            fontSize: 13, minWidth: 150,
          }}
        >
          {enrollMut.isPending
            ? 'Mapping…'
            : selected.size > 0
              ? `Map ${selected.size} Student${selected.size !== 1 ? 's' : ''}`
              : 'Map Students'}
        </Button>
      </Box>
    </Dialog>
  );
}
