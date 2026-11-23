interface ServerPaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function ServerPagination({ page, totalPages, pageSize, totalCount, onPageChange }: ServerPaginationProps) {
  const firstItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalCount);

  return (
    <nav aria-label="Paginación de resultados" className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-center text-sm text-slate-600 sm:text-left" aria-live="polite">
        {firstItem}–{lastItem} de {totalCount} · Página {page} de {Math.max(totalPages, 1)}
      </p>
      <div className="flex justify-center gap-2 sm:justify-end">
        <button
          type="button"
          aria-label="Página anterior"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >Anterior</button>
        <button
          type="button"
          aria-label="Página siguiente"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >Siguiente</button>
      </div>
    </nav>
  );
}
