import { Box, TablePagination, CircularProgress, Typography } from '@mui/material';
import { DataGrid, type GridColDef, type GridRowParams } from '@mui/x-data-grid';

interface Props<T extends { id: string }> {
  rows: T[];
  columns: GridColDef[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick?: (params: GridRowParams<T>) => void;
  emptyMessage?: string;
}

export default function PagedTable<T extends { id: string }>({
  rows,
  columns,
  total,
  page,
  pageSize,
  loading = false,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  emptyMessage = 'No records found.',
}: Props<T>) {
  if (!loading && rows.length === 0) {
    return (
      <Box py={6} textAlign="center">
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.6)',
            zIndex: 1,
            borderRadius: 2,
          }}
        >
          <CircularProgress size={32} />
        </Box>
      )}
      <DataGrid
        rows={rows}
        columns={columns}
        hideFooter
        autoHeight
        disableColumnMenu
        rowHeight={52}
        onRowClick={onRowClick}
        sx={{
          border: 'none',
          '& .MuiDataGrid-columnHeaders': { bgcolor: '#F9FAFB', fontWeight: 600 },
          '& .MuiDataGrid-row': { cursor: onRowClick ? 'pointer' : 'default' },
          '& .MuiDataGrid-cell:focus': { outline: 'none' },
        }}
      />
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_, p) => onPageChange(p)}
        onRowsPerPageChange={(e) => onPageSizeChange(Number(e.target.value))}
      />
    </Box>
  );
}
