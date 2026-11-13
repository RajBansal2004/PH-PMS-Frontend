import { Download, FileText } from "lucide-react";
import type { BrdAttachment } from "../../lib/brd/types";

type Props = {
  items: BrdAttachment[];
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }

  return `${value.toFixed(1)} ${units[index]}`;
}

export default function BrdAttachmentsTable({ items }: Props) {
  if (!items.length) {
    return <p>No attachments have been uploaded.</p>;
  }

  return (
    <div className="brd-table-wrap">
      <table className="brd-table">
        <thead>
          <tr>
            <th>File Name</th>
            <th>Type</th>
            <th>Uploaded By</th>
            <th>Updated On</th>
            <th>Size</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="brd-file-name">
                  <FileText size={14} />
                  {item.fileName}
                </span>
              </td>
              <td>{item.mimeType}</td>
              <td>{item.uploadedBy}</td>
              <td>{item.uploadedAt}</td>
              <td>{formatBytes(item.sizeBytes)}</td>
              <td>
                {item.downloadUrl ? (
                  <a
                    className="brd-icon-button"
                    href={item.downloadUrl}
                    aria-label={`Download ${item.fileName}`}
                  >
                    <Download size={14} />
                  </a>
                ) : (
                  <span aria-label="Download unavailable">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}