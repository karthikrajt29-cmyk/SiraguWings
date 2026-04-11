import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BRAND } from '../../theme';

// Fix leaflet default icon paths broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  readOnly?: boolean;
  height?: number;
}

const DEFAULT_CENTER: [number, number] = [13.0827, 80.2707]; // Chennai

export default function MapPicker({ lat, lng, onChange, readOnly = false, height = 300 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markerRef    = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = lat && lng ? [lat, lng] : DEFAULT_CENTER;
    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, lat && lng ? 15 : 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { draggable: !readOnly }).addTo(map);
      if (!readOnly) {
        markerRef.current.on('dragend', (e) => {
          const pos = (e.target as L.Marker).getLatLng();
          onChange(pos.lat, pos.lng);
        });
      }
    }

    if (!readOnly) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        } else {
          markerRef.current = L.marker([newLat, newLng], { draggable: true }).addTo(map);
          markerRef.current.on('dragend', (ev) => {
            const pos = (ev.target as L.Marker).getLatLng();
            onChange(pos.lat, pos.lng);
          });
        }
        onChange(newLat, newLng);
      });
    }

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external lat/lng changes (e.g. cleared form)
  useEffect(() => {
    if (!mapRef.current) return;
    if (lat && lng) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: !readOnly }).addTo(mapRef.current);
        if (!readOnly) {
          markerRef.current.on('dragend', (e) => {
            const pos = (e.target as L.Marker).getLatLng();
            onChange(pos.lat, pos.lng);
          });
        }
      }
      mapRef.current.setView([lat, lng], 15);
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return (
    <Box>
      <Box
        ref={containerRef}
        sx={{
          height,
          borderRadius: 2,
          overflow: 'hidden',
          border: `1px solid ${BRAND.divider}`,
          cursor: readOnly ? 'default' : 'crosshair',
          '& .leaflet-container': { borderRadius: 'inherit' },
        }}
      />
      {!readOnly && (
        <Typography sx={{ fontSize: 11, color: BRAND.textSecondary, mt: 0.75 }}>
          {lat && lng
            ? `Pin: ${lat.toFixed(6)}, ${lng.toFixed(6)} — click map or drag pin to move`
            : 'Click on the map to drop a pin'}
        </Typography>
      )}
    </Box>
  );
}
