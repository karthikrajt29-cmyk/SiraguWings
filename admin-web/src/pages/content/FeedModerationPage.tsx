import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveFeedPost,
  deleteFeedPost,
  getFeedPosts,
  rejectFeedPost,
  type FeedPostSummary,
} from '../../api/content.api';
import RejectReasonModal from '../../components/center/RejectReasonModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';

const FEED_STATUSES = ['PendingReview', 'Approved', 'Live', 'Rejected', 'Archived'];

export default function FeedModerationPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [rejectTarget, setRejectTarget] = useState<FeedPostSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedPostSummary | null>(null);
  const qc = useQueryClient();
  const { showSnack } = useSnackbar();

  const status = FEED_STATUSES[tabIndex];

  const { data, isLoading } = useQuery({
    queryKey: ['feed-posts', status],
    queryFn: () => getFeedPosts({ status, size: 50 }),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveFeedPost(id),
    onSuccess: () => { showSnack('Post approved — now Live', 'success'); qc.invalidateQueries({ queryKey: ['feed-posts'] }); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, category, reason }: { id: string; category: string; reason: string }) =>
      rejectFeedPost(id, { rejection_category: category, rejection_reason: reason }),
    onSuccess: () => { showSnack('Post rejected'); setRejectTarget(null); qc.invalidateQueries({ queryKey: ['feed-posts'] }); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFeedPost(id),
    onSuccess: () => { showSnack('Post deleted'); setDeleteTarget(null); qc.invalidateQueries({ queryKey: ['feed-posts'] }); },
    onError: (e: Error) => showSnack(e.message, 'error'),
  });

  const posts = data?.items ?? [];

  return (
    <Box>
      <Typography variant="h5" mb={2}>Feed Moderation</Typography>

      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {FEED_STATUSES.map((s) => <Tab key={s} label={s} />)}
      </Tabs>

      {isLoading && <Typography color="text.secondary">Loading…</Typography>}

      {!isLoading && posts.length === 0 && (
        <Typography color="text.secondary">No posts in this queue.</Typography>
      )}

      <Grid container spacing={2}>
        {posts.map((post) => (
          <Grid item xs={12} sm={6} md={4} key={post.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {post.image_url && (
                <CardMedia
                  component="img"
                  height={160}
                  image={post.image_url}
                  alt={post.title}
                  sx={{ objectFit: 'cover' }}
                />
              )}
              <CardContent sx={{ flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Typography variant="subtitle2" fontWeight={600}>{post.title}</Typography>
                  <Chip label={post.category_tag} size="small" />
                </Stack>
                <Typography variant="body2" color="text.secondary" mb={1} noWrap>
                  {post.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {post.center_name}
                </Typography>
              </CardContent>
              {status === 'PendingReview' && (
                <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => approveMut.mutate(post.id)}
                    disabled={approveMut.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => setRejectTarget(post)}
                  >
                    Reject
                  </Button>
                </CardActions>
              )}
              {status === 'Live' && (
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => setDeleteTarget(post)}
                  >
                    Remove (Policy Violation)
                  </Button>
                </CardActions>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      <RejectReasonModal
        open={!!rejectTarget}
        mode="reject"
        onCancel={() => setRejectTarget(null)}
        onSubmit={(category, reason) =>
          rejectMut.mutate({ id: rejectTarget!.id, category, reason })
        }
        loading={rejectMut.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Post"
        message={`Remove "${deleteTarget?.title}" for policy violation? This cannot be undone.`}
        confirmLabel="Remove"
        confirmColor="error"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate(deleteTarget!.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
