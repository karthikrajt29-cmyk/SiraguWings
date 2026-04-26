import { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import NotificationsOffRoundedIcon    from '@mui/icons-material/NotificationsOffRounded';
import CampaignRoundedIcon            from '@mui/icons-material/CampaignRounded';
import MarkEmailReadRoundedIcon       from '@mui/icons-material/MarkEmailReadRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOwnerCenter } from '../../contexts/OwnerCenterContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  listOwnerNotifications,
  markOwnerNotificationRead,
  markAllOwnerNotificationsRead,
  broadcastOwnerNotification,
  type OwnerBroadcastAudience,
} from '../../api/owner.api';
import { BRAND, STATUS_COLORS } from '../../theme';

function formatRelative(iso: string | null) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ComposeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { centerId, centers } = useOwnerCenter();
  const { showSnack } = useSnackbar();
  const qc = useQueryClient();

  const [audience, setAudience]   = useState<OwnerBroadcastAudience>('Parents');
  const [title, setTitle]         = useState('');
  const [body, setBody]           = useState('');
  const [category, setCategory]   = useState('Announcement');
  const [pickedCenter, setPickedCenter] = useState<string>(centerId ?? '');

  const valid = title.trim().length > 0 && body.trim().length > 0 && pickedCenter;

  // Keep picker in sync with the active center context if the user hasn't overridden
  if (open && !pickedCenter && centerId) {
    setPickedCenter(centerId);
  }

  const mut = useMutation({
    mutationFn: () =>
      broadcastOwnerNotification({
        center_id: pickedCenter,
        audience,
        title: title.trim(),
        body: body.trim(),
        category,
      }),
    onSuccess: (res) => {
      showSnack(`Sent to ${res.recipient_count} ${audience.toLowerCase()}`, 'success');
      qc.invalidateQueries({ queryKey: ['owner', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['owner', 'notifications', 'unread'] });
      setTitle('');
      setBody('');
      onClose();
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  return (
    <Dialog open={open} onClose={() => !mut.isPending && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        Send announcement
        <Typography sx={{ fontSize: 12.5, color: BRAND.textSecondary, fontWeight: 500, mt: 0.25 }}>
          Reaches every recipient in the chosen audience as an in-app notification.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={0.5}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={7}>
              <TextField
                select
                fullWidth
                label="Center"
                value={pickedCenter}
                onChange={(e) => setPickedCenter(e.target.value)}
              >
                {centers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                select
                fullWidth
                label="Audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value as OwnerBroadcastAudience)}
              >
                <MenuItem value="Parents">Parents</MenuItem>
                <MenuItem value="Teachers">Teachers</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputProps={{ maxLength: 200 }}
            fullWidth
            autoFocus
          />
          <TextField
            label="Message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            inputProps={{ maxLength: 1000 }}
            multiline
            minRows={4}
            fullWidth
            helperText={`${body.length} / 1000`}
          />
          <TextField
            select
            fullWidth
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {['Announcement', 'Reminder', 'Event', 'Holiday', 'Fee', 'Other'].map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={mut.isPending}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<CampaignRoundedIcon />}
          onClick={() => mut.mutate()}
          disabled={!valid || mut.isPending}
        >
          {mut.isPending ? 'Sending…' : `Send to ${audience.toLowerCase()}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function OwnerNotificationsPage() {
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [composing, setComposing]   = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['owner', 'notifications', onlyUnread],
    queryFn: () => listOwnerNotifications(onlyUnread),
  });

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications],
  );

  const readMut = useMutation({
    mutationFn: (id: string) => markOwnerNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'notifications'] });
    },
  });

  const readAllMut = useMutation({
    mutationFn: markAllOwnerNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner', 'notifications'] });
      showSnack('All marked as read', 'success');
    },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Typography sx={{ fontSize: 22, fontWeight: 700, color: BRAND.textPrimary }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Badge
                badgeContent={unreadCount}
                color="primary"
                sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}
              />
            )}
          </Stack>
          <Typography sx={{ fontSize: 13.5, color: BRAND.textSecondary, mt: 0.5 }}>
            Inbox and outgoing announcements
          </Typography>
        </Box>
        <Stack direction="row" gap={1} alignItems="center">
          <FormControlLabel
            control={<Switch checked={onlyUnread} onChange={(_, v) => setOnlyUnread(v)} size="small" />}
            label={<Typography sx={{ fontSize: 13 }}>Unread only</Typography>}
          />
          <Button
            variant="outlined"
            startIcon={<MarkEmailReadRoundedIcon />}
            onClick={() => readAllMut.mutate()}
            disabled={unreadCount === 0 || readAllMut.isPending}
          >
            Mark all read
          </Button>
          <Button
            variant="contained"
            startIcon={<CampaignRoundedIcon />}
            onClick={() => setComposing(true)}
          >
            New broadcast
          </Button>
        </Stack>
      </Stack>

      {/* Inbox list */}
      <Card sx={{ borderRadius: '16px' }}>
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress size={28} sx={{ color: BRAND.primary }} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Avatar sx={{
                width: 56, height: 56, bgcolor: BRAND.primaryBg, color: BRAND.primary,
                mx: 'auto', mb: 1.5, borderRadius: '14px',
              }}>
                <NotificationsOffRoundedIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: BRAND.textPrimary }}>
                {onlyUnread ? 'Inbox zero' : 'No notifications yet'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, mt: 0.5 }}>
                {onlyUnread
                  ? "You're all caught up."
                  : 'System events and broadcasts addressed to you appear here.'}
              </Typography>
            </Box>
          ) : (
            <Box>
              {notifications.map((n) => {
                const unread = !n.read_at;
                return (
                  <Box
                    key={n.id}
                    onClick={() => unread && readMut.mutate(n.id)}
                    sx={{
                      px: 3, py: 2,
                      cursor: unread ? 'pointer' : 'default',
                      bgcolor: unread ? BRAND.primaryBg : 'transparent',
                      transition: 'background .12s',
                      '&:hover': unread ? { bgcolor: BRAND.primaryBgHover } : {},
                      '&:not(:last-child)': { borderBottom: `1px solid ${BRAND.divider}` },
                    }}
                  >
                    <Stack direction="row" gap={2} alignItems="flex-start">
                      <Avatar sx={{
                        width: 36, height: 36, mt: 0.25,
                        bgcolor: unread ? BRAND.primary + '15' : BRAND.surface,
                        color:   unread ? BRAND.primary : BRAND.textSecondary,
                        borderRadius: '10px',
                      }}>
                        <NotificationsActiveRoundedIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" gap={1} mb={0.25} flexWrap="wrap">
                          <Typography sx={{
                            fontSize: 14,
                            fontWeight: unread ? 700 : 500,
                            color: BRAND.textPrimary,
                          }}>
                            {n.title}
                          </Typography>
                          <Chip
                            label={n.category}
                            size="small"
                            sx={{
                              height: 18, fontSize: 10, fontWeight: 700,
                              bgcolor: BRAND.surface, color: BRAND.textSecondary,
                            }}
                          />
                          <Chip
                            label={n.delivery_status}
                            size="small"
                            sx={{
                              height: 18, fontSize: 10, fontWeight: 700,
                              bgcolor:
                                n.delivery_status === 'Sent' || n.delivery_status === 'Delivered'
                                  ? '#ECFDF5'
                                  : n.delivery_status === 'Failed'
                                    ? '#FEF2F2'
                                    : BRAND.surface,
                              color:
                                n.delivery_status === 'Sent' || n.delivery_status === 'Delivered'
                                  ? STATUS_COLORS.approved
                                  : n.delivery_status === 'Failed'
                                    ? STATUS_COLORS.rejected
                                    : BRAND.textSecondary,
                            }}
                          />
                        </Stack>
                        <Typography sx={{ fontSize: 13, color: BRAND.textPrimary, lineHeight: 1.55 }}>
                          {n.body}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: BRAND.textSecondary, mt: 0.5 }}>
                          {formatRelative(n.created_date)}
                        </Typography>
                      </Box>
                      {unread && (
                        <Box sx={{
                          width: 8, height: 8, borderRadius: '50%',
                          bgcolor: BRAND.primary, mt: 1, flexShrink: 0,
                        }} />
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      <ComposeDialog open={composing} onClose={() => setComposing(false)} />
    </Box>
  );
}
