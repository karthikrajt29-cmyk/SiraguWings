import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import CloseRoundedIcon      from '@mui/icons-material/CloseRounded';
import ZoomInRoundedIcon     from '@mui/icons-material/ZoomInRounded';
import ZoomOutRoundedIcon    from '@mui/icons-material/ZoomOutRounded';
import RotateRightRoundedIcon from '@mui/icons-material/RotateRightRounded';
import CropRoundedIcon       from '@mui/icons-material/CropRounded';
import Cropper               from 'react-easy-crop';
import imageCompression      from 'browser-image-compression';
import { useState, useCallback } from 'react';
import { BRAND } from '../../theme';

interface CropArea { x: number; y: number; width: number; height: number }

interface Props {
  open: boolean;
  imageSrc: string;         // object URL of selected file
  onClose: () => void;
  onDone: (file: File, previewUrl: string, sizeKb: number) => void;
  maxKb?: number;           // target compressed size, default 150 KB
  aspect?: number;          // default 1 (square)
}

/* ── draw the cropped region onto a canvas and return a Blob ── */
async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation: number,
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = imageSrc;
  });

  const canvas  = document.createElement('canvas');
  const ctx     = canvas.getContext('2d')!;
  const rad     = (rotation * Math.PI) / 180;
  const sin     = Math.abs(Math.sin(rad));
  const cos     = Math.abs(Math.cos(rad));
  const bW      = img.width * cos + img.height * sin;
  const bH      = img.width * sin + img.height * cos;

  canvas.width  = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // temp canvas for rotation
  const tmp     = document.createElement('canvas');
  tmp.width     = bW;
  tmp.height    = bH;
  const tctx    = tmp.getContext('2d')!;
  tctx.translate(bW / 2, bH / 2);
  tctx.rotate(rad);
  tctx.drawImage(img, -img.width / 2, -img.height / 2);

  ctx.drawImage(
    tmp,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height,
  );

  return new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => b ? res(b) : rej(new Error('Canvas empty')), 'image/jpeg', 0.95),
  );
}

export default function ImageCropModal({
  open, imageSrc, onClose, onDone, maxKb = 150, aspect = 1,
}: Props) {
  const [crop,       setCrop]       = useState({ x: 0, y: 0 });
  const [zoom,       setZoom]       = useState(1);
  const [rotation,   setRotation]   = useState(0);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);
  const [processing, setProcessing] = useState(false);
  const [originalKb, setOriginalKb] = useState<number | null>(null);
  const [outputKb,   setOutputKb]   = useState<number | null>(null);

  const onCropComplete = useCallback((_: unknown, px: CropArea) => {
    setCroppedArea(px);
  }, []);

  const handleDone = async () => {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const blob    = await getCroppedBlob(imageSrc, croppedArea, rotation);
      const origKb  = Math.round(blob.size / 1024);
      setOriginalKb(origKb);

      // compress
      const compressed = await imageCompression(
        new File([blob], 'logo.jpg', { type: 'image/jpeg' }),
        {
          maxSizeMB:        maxKb / 1024,
          maxWidthOrHeight: 512,
          useWebWorker:     true,
          fileType:         'image/jpeg',
          initialQuality:   0.85,
        },
      );
      const outKb = Math.round(compressed.size / 1024);
      setOutputKb(outKb);

      const preview = URL.createObjectURL(compressed);
      onDone(compressed, preview, outKb);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between"
          sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${BRAND.divider}` }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <CropRoundedIcon sx={{ fontSize: 18, color: BRAND.primary }} />
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: BRAND.textPrimary }}>
              Crop & Compress
            </Typography>
          </Stack>
          <IconButton size="small" onClick={onClose} sx={{ color: BRAND.textSecondary }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* ── Crop area ── */}
        <Box sx={{ position: 'relative', height: 340, bgcolor: '#111' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle:  { border: `2px solid ${BRAND.primary}` },
            }}
          />
        </Box>

        {/* ── Controls ── */}
        <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
          {/* Zoom */}
          <Stack direction="row" alignItems="center" gap={1.5} mb={2}>
            <ZoomOutRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
            <Slider
              value={zoom}
              min={1} max={3} step={0.05}
              onChange={(_, v) => setZoom(v as number)}
              sx={{ color: BRAND.primary, flex: 1 }}
            />
            <ZoomInRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
          </Stack>

          {/* Rotate */}
          <Stack direction="row" alignItems="center" gap={1.5} mb={2.5}>
            <RotateRightRoundedIcon sx={{ fontSize: 18, color: BRAND.textSecondary }} />
            <Slider
              value={rotation}
              min={0} max={360} step={1}
              onChange={(_, v) => setRotation(v as number)}
              sx={{ color: BRAND.primary, flex: 1 }}
            />
            <Typography sx={{ fontSize: 12, color: BRAND.textSecondary, minWidth: 36 }}>
              {rotation}°
            </Typography>
          </Stack>

          {/* Size info */}
          {(originalKb !== null || outputKb !== null) && (
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              {originalKb !== null && (
                <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>
                  Original: <strong>{originalKb} KB</strong>
                </Typography>
              )}
              {outputKb !== null && (
                <>
                  <Typography sx={{ fontSize: 12, color: BRAND.textSecondary }}>→</Typography>
                  <Typography sx={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>
                    Saved: {outputKb} KB
                  </Typography>
                </>
              )}
            </Stack>
          )}

          {/* Compression target note */}
          <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, mb: 2 }}>
            Target: ≤ {maxKb} KB · 512 × 512 px max · JPEG
          </Typography>

          {/* Actions */}
          <Stack direction="row" gap={1.5} justifyContent="flex-end">
            <Button variant="outlined" onClick={onClose} disabled={processing}
              sx={{ borderColor: BRAND.divider, color: BRAND.textPrimary }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleDone}
              disabled={processing}
              startIcon={processing
                ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                : <CropRoundedIcon />}
              sx={{
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                '&:hover': { background: `linear-gradient(135deg, ${BRAND.primaryDark}, ${BRAND.primary})` },
                minWidth: 140,
              }}
            >
              {processing ? 'Processing…' : 'Crop & Save'}
            </Button>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
