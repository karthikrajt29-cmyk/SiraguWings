import { Backdrop, CircularProgress } from '@mui/material';

interface Props {
  open: boolean;
}

export default function LoadingOverlay({ open }: Props) {
  return (
    <Backdrop open={open} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }}>
      <CircularProgress color="inherit" />
    </Backdrop>
  );
}
