import { useCallback, useMemo, useState } from "react";

const NULL_LABEL = "-";

function valueToOptionList(value) {
  if (Array.isArray(value)) return value.length ? value : [NULL_LABEL];
  return [value === null || value === undefined || value === "" ? NULL_LABEL : String(value)];
}

/**
 * Drives free-text search plus per-column value filters for a table.
 * columns: [{ key, accessor: (row) => string | string[] | null|undefined }]
 * accessor should return the same value shown in the cell (or an array for
 * multi-value cells like role pills) so filter options always match what's
 * on screen.
 */
export function useColumnFilters(rows, columns) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});

  const matchesFilters = useCallback(
    (row, skipKey) =>
      columns.every((col) => {
        if (col.key === skipKey) return true;
        const selected = filters[col.key];
        if (!selected || selected.size === 0) return true;
        const values = valueToOptionList(col.accessor(row));
        return values.some((v) => selected.has(v));
      }),
    [columns, filters]
  );

  const searchedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((col) => {
        const raw = col.accessor(row);
        const text = Array.isArray(raw) ? raw.join(" ") : raw;
        return text != null && String(text).toLowerCase().includes(q);
      })
    );
  }, [rows, columns, search]);

  const filteredRows = useMemo(
    () => searchedRows.filter((row) => matchesFilters(row, null)),
    [searchedRows, matchesFilters]
  );

  const getOptionsFor = useCallback(
    (key) => {
      const col = columns.find((c) => c.key === key);
      if (!col) return [];
      const set = new Set();
      searchedRows.forEach((row) => {
        if (!matchesFilters(row, key)) return;
        valueToOptionList(col.accessor(row)).forEach((v) => set.add(v));
      });
      return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), "he"));
    },
    [columns, searchedRows, matchesFilters]
  );

  const setColumnFilter = useCallback((key, valuesSet) => {
    setFilters((prev) => {
      if (!valuesSet || valuesSet.size === 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: valuesSet };
    });
  }, []);

  const clearAll = useCallback(() => {
    setFilters({});
    setSearch("");
  }, []);

  const activeFilterCount = Object.keys(filters).length;

  return {
    search,
    setSearch,
    filteredRows,
    filters,
    setColumnFilter,
    getOptionsFor,
    clearAll,
    activeFilterCount,
  };
}
