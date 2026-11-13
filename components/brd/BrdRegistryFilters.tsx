"use client";

import type { BrdListParams } from "../../lib/brd/types";
import { Search, X } from "lucide-react";

type Props = {
  filters: BrdListParams;
  onChange: (filters: BrdListParams) => void;
};

export default function BrdRegistryFilters({
  filters,
  onChange,
}: Props) {
  function update(
    key: keyof BrdListParams,
    value: string,
  ) {
    onChange({
      ...filters,
      [key]: value,
      page: 1,
    });
  }

  function reset() {
    onChange({
      page: 1,
      pageSize: filters.pageSize || 10,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  }

  return (
    <div className="brd-registry-toolbar">
      <label className="brd-search">
        <Search size={16} aria-hidden="true" />

        <input
          type="search"
          value={filters.search || ""}
          onChange={(event) => update("search", event.target.value)}
          placeholder="Search BRD ID, title or client..."
          aria-label="Search BRD registry"
        />
      </label>

      <label className="brd-filter-field">
        <span>Status</span>
        <select
          value={filters.status || ""}
          onChange={(event) => update("status", event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="In Review">In Review</option>
          <option value="Client Review">Client Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Archived">Archived</option>
        </select>
      </label>

      <label className="brd-filter-field">
        <span>Priority</span>
        <select
          value={filters.priority || ""}
          onChange={(event) => update("priority", event.target.value)}
        >
          <option value="">All priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </label>

      <button
        type="button"
        className="brd-button"
        onClick={reset}
      >
        <X size={14} />
        Reset
      </button>
    </div>
  );
}