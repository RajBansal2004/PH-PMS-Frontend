
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, UploadCloud, FileSpreadsheet, Download,
  CheckCircle2, AlertTriangle, X, FileText,
} from "lucide-react";
import { createClient } from "@/lib/api";
import "../clients/client-workflow.css";
import "./client-import.css";

type ImportRow = {
  name: string;
  type: string;
  industry: string;
  manager: string;
  status: string;
};

export default function ClientImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [message, setMessage] = useState("");

  const validCount = rows.filter((r) => r.name && r.type && r.industry).length;
  const invalidCount = rows.length - validCount;

  function downloadTemplate() {
    const csv = [
      "Client Name,Client Type,Industry,Account Manager,Status",
      "City Care Hospital,Enterprise,Healthcare,Rahul Verma,Active",
      "Sai Dental Clinic,SME,Healthcare,Neha Patel,Active",
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "client-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(selected: File | undefined) {
    if (!selected) return;
    const extension = selected.name.split(".").pop()?.toLowerCase();
    if (!["csv"].includes(extension ?? "")) {
      setMessage("Please upload a CSV file formatted according to the template.");
      return;
    }

    setFile(selected);
    const text = await selected.text();
    const lines = text.trim().split(/\r?\n/);
    const parsed = lines.slice(1).map((line) => {
      const cols = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      return {
        name: cols[0] ?? "",
        type: cols[1] ?? "",
        industry: cols[2] ?? "",
        manager: cols[3] ?? "",
        status: cols[4] ?? "Active",
      };
    });
    setRows(parsed);
    setStep("preview");
    setMessage("");
  }

  async function importClients() {
    if (!rows.length || invalidCount > 0) {
      setMessage("Please fix invalid rows before importing.");
      return;
    }
    try {
      for (const r of rows) {
        if (!r.name) continue;
        await createClient({
          name: r.name,
          type: r.type || "Enterprise",
          industry: r.industry || "Healthcare",
          status: r.status === "Inactive" ? "INACTIVE" : "ACTIVE",
        });
      }
      setStep("done");
    } catch (err: any) {
      setMessage(`Import error: ${err.message || "Failed to persist client records"}`);
    }
  }

  const shownRows = useMemo(() => rows.slice(0, 10), [rows]);

  return (
    <main className="ci-page">
      <div className="ci-heading">
        <div>
          <div className="cw-breadcrumb"><span>Client Management</span><span>›</span><b>Bulk Import Clients</b></div>
          <h1>Bulk Import Clients</h1>
          <p>Import multiple client organizations using a spreadsheet template.</p>
        </div>
        <button className="cw-secondary" onClick={() => router.push("/clients")}><ArrowLeft size={14} /> Client Registry</button>
      </div>

      {message && <div className="ci-message"><AlertTriangle size={15} />{message}</div>}

      {step === "done" ? (
        <section className="ci-success">
          <CheckCircle2 size={48} />
          <h2>Import Preview Completed</h2>
          <p>{validCount} client rows passed local validation.</p>
          <button className="cw-primary" onClick={() => router.push("/clients")}>Go to Client Registry</button>
        </section>
      ) : (
        <div className="ci-grid">
          <section className="ci-card">
            <div className="ci-card-title"><span className="ci-step">1</span><div><h3>Step 1: Download Template</h3><p>Download the Excel template and fill in client details.</p></div></div>
            <div className="ci-template">
              <FileSpreadsheet size={35} />
              <b>Client Import Template</b>
              <small>CSV template with required client fields</small>
              <button className="ci-download" onClick={downloadTemplate}><Download size={15} /> Download Template</button>
            </div>
          </section>

          <section className="ci-card">
            <div className="ci-card-title"><span className="ci-step">2</span><div><h3>Step 2: Upload File</h3><p>Upload your completed CSV file.</p></div></div>
            <button className="ci-drop" onClick={() => inputRef.current?.click()}>
              <UploadCloud size={32} />
              <b>Drag & drop file here</b>
              <span>or browse your computer</span>
              <small>CSV supported in this preview · Max file size 10MB</small>
              <strong>Select File</strong>
            </button>
            <input ref={inputRef} type="file" accept=".csv" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
            {file && <div className="ci-file"><FileText size={17} /><span>{file.name}</span><button onClick={() => { setFile(null); setRows([]); setStep("upload"); }}><X size={15} /></button></div>}
          </section>

          <section className="ci-card ci-preview-card">
            <div className="ci-card-title"><span className="ci-step">3</span><div><h3>Step 3: Preview Data</h3><p>Review the imported records before confirming.</p></div></div>
            {step === "upload" ? (
              <div className="ci-empty">Upload a CSV file to preview client records.</div>
            ) : (
              <>
                <div className="ci-counts">
                  <span><b>{rows.length}</b>Total Records</span>
                  <span className="good"><b>{validCount}</b>Valid</span>
                  <span className="bad"><b>{invalidCount}</b>Invalid</span>
                </div>
                <div className="ci-table-wrap">
                  <table className="ci-table">
                    <thead><tr><th>Client Name</th><th>Client Type</th><th>Industry</th><th>Account Manager</th><th>Status</th></tr></thead>
                    <tbody>{shownRows.map((row, i) => <tr key={`${row.name}-${i}`}><td>{row.name || "Missing name"}</td><td>{row.type || "-"}</td><td>{row.industry || "-"}</td><td>{row.manager || "-"}</td><td><span className={row.name && row.type && row.industry ? "valid" : "invalid"}>{row.name && row.type && row.industry ? "Valid" : "Invalid"}</span></td></tr>)}</tbody>
                  </table>
                </div>
                {rows.length > 10 && <small className="ci-note">Showing first 10 of {rows.length} records.</small>}
              </>
            )}
          </section>

          <div className="ci-footer">
            <button className="cw-secondary" onClick={() => router.push("/clients")}>Cancel</button>
            <button className="cw-primary" disabled={step !== "preview" || rows.length === 0 || invalidCount > 0} onClick={importClients}>Import Clients</button>
          </div>
        </div>
      )}
    </main>
  );
}
