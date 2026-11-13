"use client";

import { useState } from "react";
import {
  Archive,
  Download,
  FilePlus2,
  MessageSquare,
  Pencil,
  Printer,
  Share2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { brdApi } from "../../lib/brd/api";
import type { BrdDetail } from "../../lib/brd/types";

type Props = {
  brd: BrdDetail;
  onRefresh: () => Promise<void>;
};

export default function BrdQuickActions({
  brd,
  onRefresh,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run(
    action: () => Promise<void>,
    successMessage: string,
  ) {
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      await action();
      setMessage(successMessage);
      await onRefresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Action failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const actions = [
    {
      label: "Edit BRD",
      icon: Pencil,
      onClick: () =>
        router.push(
          `/brd-requirements/brd-registry/${encodeURIComponent(brd.id)}/edit`,
        ),
    },
    {
      label: "Create Revision",
      icon: FilePlus2,
      onClick: () => {
        const summary = window.prompt(
          "Enter a summary of the changes for this revision:",
        );

        if (!summary?.trim()) return;

        void run(
          async () => {
            await brdApi.createRevision(brd.id, summary.trim());
          },
          "Revision created.",
        );
      },
    },
    {
      label: "Export BRD",
      icon: Download,
      onClick: () => {
        setMessage(
          "Configure an authenticated PDF/export endpoint before enabling export.",
        );
      },
    },
    {
      label: "Print BRD",
      icon: Printer,
      onClick: () => window.print(),
    },
    {
      label: "Add Comment",
      icon: MessageSquare,
      onClick: () => {
        const content = window.prompt("Enter your comment:");

        if (!content?.trim()) return;

        void run(
          async () => {
            await brdApi.addComment(brd.id, content.trim());
          },
          "Comment saved.",
        );
      },
    },
    {
      label: "Share BRD",
      icon: Share2,
      onClick: () => {
        setMessage(
          "Use your authorized sharing workflow to generate a permission-controlled link.",
        );
      },
    },
    {
      label: "Move to Archive",
      icon: Archive,
      onClick: () => {
        if (
          !window.confirm(
            `Archive "${brd.title}"? This action will be checked by the server.`,
          )
        ) return;

        void run(
          async () => {
            await brdApi.archive(brd.id);
          },
          "Archive request completed.",
        );
      },
    },
    {
      label: "Delete BRD",
      icon: Trash2,
      danger: true,
      onClick: () => {
        if (
          !window.confirm(
            `Delete "${brd.title}"? This may be irreversible.`,
          )
        ) return;

        void run(
          async () => {
            await brdApi.remove(brd.id);
            router.replace("/brd-requirements/brd-registry");
          },
          "BRD deleted.",
        );
      },
    },
  ];

  return (
    <section className="brd-card">
      <h2 className="brd-card-title">9. Quick Actions</h2>

      <div className="brd-card-body">
        <div className="brd-quick-actions">
          {actions.map(({ label, icon: Icon, danger, onClick }) => (
            <button
              key={label}
              type="button"
              className={danger ? "brd-action danger" : "brd-action"}
              disabled={busy}
              onClick={onClick}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {message && (
          <p className="brd-inline-notice" role="status">
            {message}
          </p>
        )}

        <p className="brd-action-disclaimer">
          Only authorized users should be able to change or delete BRDs.
        </p>
      </div>
    </section>
  );
}