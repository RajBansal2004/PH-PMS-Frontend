
"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    Building2,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Download,
    Filter,
    Mail,
    MapPin,
    MoreHorizontal,
    Pencil,
    Phone,
    Plus,
    Search,
    ShieldCheck,
    Star,
    Trash2,
    UploadCloud,
    Users,
    X,
    Send,
} from "lucide-react";

import "./client-contacts.css";
import { useRouter } from "next/navigation";
import { clients as getClients } from "@/lib/api";

type Contact = {
    id: number;
    name: string;
    designation: string;
    department: string;
    email: string;
    phone: string;
    location: string;
    primary: boolean;
    status: "Active" | "Inactive";
    added: string;
    initials: string;
};

const initialContacts: Contact[] = [];

const departments = [
    "Leadership",
    "Finance",
    "IT",
    "Procurement",
    "Projects",
    "Operations",
    "QA",
    "HR",
    "Support",
];

const emptyForm = {
    first: "",
    last: "",
    designation: "",
    department: "Finance",
    reportsTo: "",
    email: "",
    phone: "",
    office: "",
    location: "Hyderabad, Telangana, India",
    address: "",
    about: "",
    primary: false,
};

type ContactForm = typeof emptyForm;

function Avatar({
    text,
    large = false,
}: {
    text: string;
    large?: boolean;
}) {
    return (
        <span className={`cc-avatar ${large ? "large" : ""}`}>
            {text}
        </span>
    );
}

function Stat({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className="cc-stat">
            <span className={`cc-stat-icon ${color}`}>{icon}</span>
            <div>
                <small>{label}</small>
                <b>{value}</b>
            </div>
        </div>
    );
}

function Info({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="cc-info-row">
            <span>{icon}</span>
            <b>{label}</b>
            <strong>{value}</strong>
        </div>
    );
}

export default function ClientContacts() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [department, setDepartment] = useState("All Departments");
    const [status, setStatus] = useState("All Status");
    const [designation, setDesignation] = useState("All Designations");
    const [primaryFilter, setPrimaryFilter] = useState("Primary: All");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(8);

    const [tab, setTab] = useState("Overview");
    const [notice, setNotice] = useState("");

    const [showImport, setShowImport] = useState(false);
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [form, setForm] = useState<ContactForm>(emptyForm);

    useEffect(() => {
        async function loadContacts() {
            try {
                const res = await getClients();
                const clientList = Array.isArray(res) ? res : res?.items || [];
                const extracted: Contact[] = [];
                let counter = 1;
                clientList.forEach((cl: any) => {
                    if (cl.contacts && Array.isArray(cl.contacts) && cl.contacts.length > 0) {
                        cl.contacts.forEach((ct: any) => {
                            const name = ct.name || `${ct.firstName || ""} ${ct.lastName || ""}`.trim() || "Contact";
                            extracted.push({
                                id: counter++,
                                name,
                                designation: ct.designation || ct.role || "Point of Contact",
                                department: ct.department || "Operations",
                                email: ct.email || cl.email || "—",
                                phone: ct.phone || cl.phone || "—",
                                location: cl.address?.city || cl.city || "India",
                                primary: Boolean(ct.isPrimary || ct.primary),
                                status: "Active",
                                added: ct.createdAt ? ct.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
                                initials: name.split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase(),
                            });
                        });
                    } else if (cl.primaryContact || cl.contactPerson || cl.email) {
                        const name = cl.primaryContact?.name || cl.contactPerson || cl.name;
                        extracted.push({
                            id: counter++,
                            name,
                            designation: cl.primaryContact?.designation || "Primary Contact",
                            department: "Management",
                            email: cl.primaryContact?.email || cl.email || "—",
                            phone: cl.primaryContact?.phone || cl.phone || "—",
                            location: cl.address?.city || "India",
                            primary: true,
                            status: "Active",
                            added: cl.createdAt ? cl.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
                            initials: name.split(/\s+/).map((p: string) => p[0]).slice(0, 2).join("").toUpperCase(),
                        });
                    }
                });
                setContacts(extracted);
                if (extracted.length > 0) {
                    setSelectedId(extracted[0].id);
                }
            } catch (err) {
                console.warn("Failed to load client contacts:", err);
            }
        }
        loadContacts();
    }, []);

    const selected = contacts.find((c) => c.id === selectedId);

    const activeCount = contacts.filter(
        (c) => c.status === "Active"
    ).length;

    const primaryCount = contacts.filter(
        (c) => c.primary
    ).length;

    const filtered = useMemo(() => {
        return contacts.filter((c) => {
            const q = query.toLowerCase();

            const matchesQuery =
                !q ||
                [
                    c.name,
                    c.email,
                    c.phone,
                    c.designation,
                    c.department,
                ].some((v) => v.toLowerCase().includes(q));

            const matchesDepartment =
                department === "All Departments" ||
                c.department === department;

            const matchesStatus =
                status === "All Status" || c.status === status;

            const matchesDesignation =
                designation === "All Designations" ||
                c.designation === designation;

            const matchesPrimary =
                primaryFilter === "Primary: All" ||
                (primaryFilter === "Primary only"
                    ? c.primary
                    : !c.primary);

            return (
                matchesQuery &&
                matchesDepartment &&
                matchesStatus &&
                matchesDesignation &&
                matchesPrimary
            );
        });
    }, [
        contacts,
        query,
        department,
        status,
        designation,
        primaryFilter,
    ]);

    const pages = Math.max(
        1,
        Math.ceil(filtered.length / pageSize)
    );

    const visible = filtered.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    function notify(message: string) {
        setNotice(message);
        window.setTimeout(() => setNotice(""), 3000);
    }

    function updateForm(
        key: keyof ContactForm,
        value: string | boolean
    ) {
        setForm((old) => ({
            ...old,
            [key]: value,
        }));
    }

    function openCreateWizard() {
        setEditingId(null);
        setForm(emptyForm);
        setWizardStep(1);
        setShowWizard(true);
    }

    function openEditWizard(contact: Contact) {
        const parts = contact.name.split(" ");

        setEditingId(contact.id);
        setForm({
            ...emptyForm,
            first: parts[0] ?? "",
            last: parts.slice(1).join(" "),
            designation: contact.designation,
            department: contact.department,
            email: contact.email,
            phone: contact.phone,
            location: `${contact.location}, Telangana, India`,
            primary: contact.primary,
        });

        setWizardStep(1);
        setShowWizard(true);
    }

    function togglePrimary(id: number) {
        setContacts((old) =>
            old.map((c) => ({
                ...c,
                primary: c.id === id ? !c.primary : false,
            }))
        );
    }

    function saveContact() {
        if (
            !form.first.trim() ||
            !form.last.trim() ||
            !form.email.trim()
        ) {
            notify("First name, last name and email are required.");
            setWizardStep(1);
            return;
        }

        const name = `${form.first.trim()} ${form.last.trim()}`;

        if (editingId !== null) {
            setContacts((old) =>
                old.map((c) => {
                    if (c.id !== editingId) {
                        return {
                            ...c,
                            primary: form.primary ? false : c.primary,
                        };
                    }

                    return {
                        ...c,
                        name,
                        designation: form.designation || "Team Member",
                        department: form.department,
                        email: form.email,
                        phone: form.phone || "—",
                        location: form.location.split(",")[0],
                        primary: form.primary,
                        initials: `${form.first[0]}${form.last[0]}`.toUpperCase(),
                    };
                })
            );

            setSelectedId(editingId);
            notify("Contact updated successfully.");
        } else {
            const next: Contact = {
                id: Date.now(),
                name,
                designation: form.designation || "Team Member",
                department: form.department,
                email: form.email,
                phone: form.phone || "—",
                location: form.location.split(",")[0],
                primary: form.primary,
                status: "Active",
                added: new Date().toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                }),
                initials: `${form.first[0]}${form.last[0]}`.toUpperCase(),
            };

            setContacts((old) => [
                ...old.map((c) => ({
                    ...c,
                    primary: form.primary ? false : c.primary,
                })),
                next,
            ]);

            setSelectedId(next.id);
            notify("Contact created successfully.");
        }

        setShowWizard(false);
        setWizardStep(1);
        setEditingId(null);
    }

    function deleteContact() {
        if (!selected) return;

        if (!window.confirm(`Delete ${selected.name}?`)) return;

        const remaining = contacts.filter(
            (c) => c.id !== selected.id
        );

        setContacts(remaining);
        setSelectedId(remaining[0]?.id ?? null);

        notify("Contact deleted successfully.");
    }

    function toggleSelectedStatus() {
        if (!selected) return;

        setContacts((old) =>
            old.map((c) =>
                c.id === selected.id
                    ? {
                        ...c,
                        status:
                            c.status === "Active" ? "Inactive" : "Active",
                    }
                    : c
            )
        );
    }

    function resetFilters() {
        setQuery("");
        setDepartment("All Departments");
        setStatus("All Status");
        setDesignation("All Designations");
        setPrimaryFilter("Primary: All");
        setPage(1);
    }

    function exportContacts() {
        const header = [
            "Name",
            "Designation",
            "Department",
            "Email",
            "Phone",
            "Location",
            "Status",
        ];

        const rows = filtered.map((c) => [
            c.name,
            c.designation,
            c.department,
            c.email,
            c.phone,
            c.location,
            c.status,
        ]);

        const csv = [header, ...rows]
            .map((row) =>
                row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
            )
            .join("\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = "client-contacts.csv";
        anchor.click();

        URL.revokeObjectURL(url);
    }

    return (
        <main className="cc-page">
            {/* Page heading - Shell topbar is already available */}


            <header className="cc-page-header">
                <div className="cc-page-header-left">
                    <div className="cc-page-breadcrumb">
                        <span>Clients</span>
                        <ChevronRight size={13} />
                        <span>Client Contacts</span>
                    </div>

                    <div className="cc-page-title-row">
                        <span className="cc-page-code">CLT-004</span>
                        <h1>Client Contacts</h1>
                    </div>

                    <p className="cc-page-description">
                        Manage and collaborate with all contacts associated with this client.
                    </p>
                </div>

                <div className="cc-page-header-right">
                    <button
                        type="button"
                        className="cc-add-contact-btn"
                        onClick={() => router.push("/clients/contacts/new")}
                    >
                        <Plus size={15} />
                        Add Contact
                    </button>
                </div>
            </header>


            {/* Client summary */}

            <section className="cc-summary">
                <div className="cc-client">
                    <div className="cc-apollo">✚</div>

                    <div className="cc-client-info">
                        <b>
                            Apollo Hospitals
                            <span className="cc-status active">Active</span>
                        </b>

                        <small>
                            Enterprise Client • Healthcare • Hyderabad, Telangana, India
                        </small>

                        <div className="cc-client-meta">
                            <span>
                                Client Code <b>CLT-00086</b>
                            </span>

                            <span>
                                Account Manager
                                <b>
                                    <Avatar text="RV" />
                                    Rahul Verma
                                </b>
                            </span>
                        </div>
                    </div>
                </div>

                <Stat
                    icon={<Users />}
                    label="Total Contacts"
                    value={contacts.length}
                    color="blue"
                />

                <Stat
                    icon={<Users />}
                    label="Primary Contacts"
                    value={primaryCount}
                    color="orange"
                />

                <Stat
                    icon={<ShieldCheck />}
                    label="Active Contacts"
                    value={activeCount}
                    color="green"
                />

                <Stat
                    icon={<ShieldCheck />}
                    label="Inactive Contacts"
                    value={contacts.length - activeCount}
                    color="red"
                />
            </section>

            <section className="cc-upper">
                {/* Contacts registry */}

                <div className="cc-card cc-registry">
                    <div className="cc-section-head">
                        <div>
                            <h2>All Contacts</h2>
                            <p>Manage and collaborate with client contacts</p>
                        </div>

                        <div className="cc-head-buttons">
                            <button
                                className="cc-outline"
                                onClick={() => setShowImport(true)}
                            >
                                Import Contacts
                                <UploadCloud size={12} />
                            </button>

                            <button
                                className="cc-outline"
                                onClick={exportContacts}
                            >
                                <Download size={12} />
                                Export
                            </button>

                            <button
                                className="cc-square"
                                onClick={resetFilters}
                                title="Reset filters"
                            >
                                <Activity size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Filters */}

                    <div className="cc-filters">
                        <label className="cc-search">
                            <Search size={13} />

                            <input
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search by name, designation, email, phone..."
                            />
                        </label>

                        <select
                            value={designation}
                            onChange={(e) => {
                                setDesignation(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option>All Designations</option>

                            {[...new Set(contacts.map((c) => c.designation))].map(
                                (d) => (
                                    <option key={d}>{d}</option>
                                )
                            )}
                        </select>

                        <select
                            value={department}
                            onChange={(e) => {
                                setDepartment(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option>All Departments</option>

                            {departments.map((d) => (
                                <option key={d}>{d}</option>
                            ))}
                        </select>

                        <select
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>

                        <select>
                            <option>All Locations</option>
                            <option>Hyderabad</option>
                        </select>

                        <select
                            value={primaryFilter}
                            onChange={(e) => setPrimaryFilter(e.target.value)}
                        >
                            <option>Primary: All</option>
                            <option>Primary only</option>
                            <option>Non-primary</option>
                        </select>

                        <button
                            className="cc-outline"
                            onClick={() => setShowMoreFilters(!showMoreFilters)}
                        >
                            <Filter size={12} />
                            More Filters
                        </button>

                        <button className="cc-outline" onClick={resetFilters}>
                            Reset
                        </button>
                    </div>

                    {showMoreFilters && (
                        <div className="cc-extra-filters">
                            <label>
                                <input type="checkbox" />
                                Recently added
                            </label>

                            <label>
                                <input type="checkbox" />
                                Has phone number
                            </label>

                            <label>
                                <input type="checkbox" />
                                Has email address
                            </label>
                        </div>
                    )}

                    {/* Table */}

                    <div className="cc-table-scroll">
                        <table className="cc-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input type="checkbox" />
                                    </th>
                                    <th>Name</th>
                                    <th>Designation</th>
                                    <th>Department</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Location</th>
                                    <th>Primary</th>
                                    <th>Status</th>
                                    <th>Added On</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {visible.map((c) => (
                                    <tr
                                        key={c.id}
                                        onClick={() => setSelectedId(c.id)}
                                        className={
                                            selectedId === c.id ? "selected" : ""
                                        }
                                    >
                                        <td>
                                            <input
                                                type="checkbox"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>

                                        <td>
                                            <div className="cc-name">
                                                <Avatar text={c.initials} />
                                                <b>{c.name}</b>
                                                {c.primary && <em>PRIMARY</em>}
                                            </div>
                                        </td>

                                        <td>{c.designation}</td>
                                        <td>{c.department}</td>
                                        <td>{c.email}</td>
                                        <td>{c.phone}</td>
                                        <td>{c.location}</td>

                                        <td>
                                            <button
                                                className={`cc-star ${c.primary ? "on" : ""}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    togglePrimary(c.id);
                                                }}
                                            >
                                                <Star
                                                    size={13}
                                                    fill={
                                                        c.primary ? "currentColor" : "none"
                                                    }
                                                />
                                            </button>
                                        </td>

                                        <td>
                                            <span
                                                className={`cc-status ${c.status.toLowerCase()}`}
                                            >
                                                {c.status}
                                            </span>
                                        </td>

                                        <td>{c.added}</td>

                                        <td>
                                            <button
                                                className="cc-square tiny"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedId(c.id);
                                                }}
                                            >
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {visible.length === 0 && (
                            <div className="cc-empty">
                                No contacts found.
                            </div>
                        )}
                    </div>

                    {/* Pagination */}

                    <div className="cc-pagination">
                        <span>
                            Showing{" "}
                            {filtered.length
                                ? (page - 1) * pageSize + 1
                                : 0}{" "}
                            to {Math.min(page * pageSize, filtered.length)} of{" "}
                            {filtered.length} entries
                        </span>

                        <div>
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft size={13} />
                            </button>

                            {Array.from({ length: pages }, (_, i) => (
                                <button
                                    className={page === i + 1 ? "current" : ""}
                                    key={i}
                                    onClick={() => setPage(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            ))}

                            <button
                                onClick={() => setPage(Math.min(pages, page + 1))}
                                disabled={page === pages}
                            >
                                <ChevronRight size={13} />
                            </button>
                        </div>

                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            <option value={8}>8 / page</option>
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                        </select>
                    </div>
                </div>

                {/* Contact details */}

                {selected ? (
                    <aside className="cc-card cc-details">
                        <div className="cc-detail-heading">
                            <h2>Contact Details</h2>

                            <button onClick={() => setSelectedId(null)}>
                                <X size={14} />
                            </button>
                        </div>

                        <div className="cc-profile">
                            <Avatar text={selected.initials} large />

                            <div>
                                <h3>
                                    {selected.name}

                                    {selected.primary && <em>PRIMARY</em>}

                                    <span
                                        className={`cc-status ${selected.status.toLowerCase()}`}
                                    >
                                        {selected.status}
                                    </span>
                                </h3>

                                <p>
                                    {selected.designation} • {selected.department}
                                </p>

                                <p>
                                    <Building2 size={11} />
                                    Apollo Hospitals
                                </p>

                                <p>
                                    <MapPin size={11} />
                                    {selected.location}, Telangana, India
                                </p>
                            </div>
                        </div>

                        <div className="cc-info-box">
                            <Info
                                icon={<Mail />}
                                label="Email"
                                value={selected.email}
                            />

                            <Info
                                icon={<Phone />}
                                label="Phone (Mobile)"
                                value={selected.phone}
                            />

                            <Info
                                icon={<Phone />}
                                label="Phone (Office)"
                                value="+91 40 2306 7000"
                            />

                            <Info
                                icon={<MapPin />}
                                label="Location"
                                value={`${selected.location}, Telangana, India`}
                            />

                            <Info
                                icon={<Clock3 />}
                                label="Time Zone"
                                value="Asia/Kolkata (IST)"
                            />

                            <Info
                                icon={<ShieldCheck />}
                                label="Preferred Communication"
                                value="Email"
                            />
                        </div>

                        <div className="cc-about">
                            <b>About</b>

                            <p>
                                {selected.name === "Dr. Prathap C. Reddy"
                                    ? "Founder and Managing Director of Apollo Hospitals Group. Overall leadership and strategic decisions."
                                    : `${selected.designation} responsible for ${selected.department.toLowerCase()} coordination.`}
                            </p>

                            <div className="cc-about-grid">
                                <div>
                                    <b>Reports To</b>
                                    <span>
                                        {selected.primary
                                            ? "Board of Directors"
                                            : "Rahul Verma"}
                                    </span>
                                </div>

                                <div>
                                    <b>Added On</b>
                                    <span>{selected.added}, 10:35 AM</span>
                                </div>

                                <div>
                                    <b>Added By</b>
                                    <span>Rahul Verma</span>
                                </div>

                                <div>
                                    <b>Last Updated</b>
                                    <span>10 May 2025, 11:20 AM</span>
                                </div>

                                <div>
                                    <b>Primary Contact</b>
                                    <span>
                                        {selected.primary ? "★ Yes" : "No"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="cc-tabs">
                            {[
                                "Overview",
                                "Projects",
                                "Notes",
                                "Documents",
                                "Activity",
                                "Permissions",
                            ].map((t) => (
                                <button
                                    key={t}
                                    className={tab === t ? "active" : ""}
                                    onClick={() => setTab(t)}
                                >
                                    {t}
                                    {t === "Projects"
                                        ? " 6"
                                        : t === "Notes"
                                            ? " 4"
                                            : t === "Documents"
                                                ? " 3"
                                                : t === "Activity"
                                                    ? " 12"
                                                    : t === "Permissions"
                                                        ? " 2"
                                                        : ""}
                                </button>
                            ))}
                        </div>

                        <div className="cc-tab-body">
                            {tab === "Overview" &&
                                "Contact overview and communication preferences."}

                            {tab === "Projects" &&
                                "AI-CMS Implementation • Hospital Website Revamp • Mobile App Development"}

                            {tab === "Notes" &&
                                "SLA renewal discussion and upcoming project notes."}

                            {tab === "Documents" &&
                                "Contact Authorization.pdf • Client NDA.pdf"}

                            {tab === "Activity" &&
                                "Contact updated by Rahul Verma • Introductory email sent."}

                            {tab === "Permissions" &&
                                "Projects: View, Create, Edit • Documents: View, Upload"}
                        </div>

                        <div className="cc-actions">
                            <button onClick={() => openEditWizard(selected)}>
                                <Pencil size={12} />
                                Edit Contact
                            </button>

                            <a href={`mailto:${selected.email}`}>
                                <Send size={12} />
                                Send Email
                            </a>

                            <button
                                onClick={() =>
                                    notify("Add note is ready for backend integration.")
                                }
                            >
                                <Plus size={12} />
                                Add Note
                            </button>

                            <button onClick={() => setTab("Activity")}>
                                <Activity size={12} />
                                View Activity
                            </button>

                            <button onClick={toggleSelectedStatus}>
                                <ShieldCheck size={12} />
                                Make{" "}
                                {selected.status === "Active" ? "Inactive" : "Active"}
                            </button>

                            <button className="danger" onClick={deleteContact}>
                                <Trash2 size={12} />
                                Delete Contact
                            </button>
                        </div>
                    </aside>
                ) : (
                    <aside className="cc-card cc-details cc-no-selection">
                        <p>Select a contact from the table.</p>
                        <button
                            className="cc-outline"
                            onClick={() => setSelectedId(contacts[0]?.id ?? null)}
                        >
                            Select first contact
                        </button>
                    </aside>
                )}
            </section>

            {/* Add / Edit Contact Wizard */}

            {showWizard && (
                <div className="cc-modal-backdrop">
                    <div className="cc-wizard">
                        <div className="cc-wizard-head">
                            <div>
                                <span className="cc-code">CLT-004</span>
                                <h2>
                                    {editingId ? "Edit Contact" : "Add New Contact"}
                                </h2>
                                <p>
                                    Add contact information to Apollo Hospitals.
                                </p>
                            </div>

                            <button
                                onClick={() => setShowWizard(false)}
                                className="cc-modal-close"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        <div className="cc-wizard-steps">
                            {[
                                "Basic Information",
                                "Role & Department",
                                "Contact Details",
                                "Review & Save",
                            ].map((step, index) => (
                                <button
                                    key={step}
                                    className={
                                        wizardStep === index + 1
                                            ? "active"
                                            : wizardStep > index + 1
                                                ? "done"
                                                : ""
                                    }
                                    onClick={() => setWizardStep(index + 1)}
                                >
                                    <span>
                                        {wizardStep > index + 1 ? (
                                            <Check size={12} />
                                        ) : (
                                            index + 1
                                        )}
                                    </span>
                                    {step}
                                </button>
                            ))}
                        </div>

                        <div className="cc-wizard-content">
                            {wizardStep === 1 && (
                                <div className="cc-form-grid">
                                    <label>
                                        First Name *
                                        <input
                                            value={form.first}
                                            onChange={(e) =>
                                                updateForm("first", e.target.value)
                                            }
                                            placeholder="Enter first name"
                                        />
                                    </label>

                                    <label>
                                        Last Name *
                                        <input
                                            value={form.last}
                                            onChange={(e) =>
                                                updateForm("last", e.target.value)
                                            }
                                            placeholder="Enter last name"
                                        />
                                    </label>

                                    <label>
                                        Display Name
                                        <input
                                            value={`${form.first} ${form.last}`.trim()}
                                            readOnly
                                        />
                                    </label>

                                    <label>
                                        Profile Photo
                                        <div className="cc-photo-placeholder">
                                            <Users size={20} />
                                            <span>Photo upload can be connected later</span>
                                        </div>
                                    </label>

                                    <label className="wide">
                                        About / Bio
                                        <textarea
                                            value={form.about}
                                            onChange={(e) =>
                                                updateForm("about", e.target.value)
                                            }
                                            placeholder="Write a short description..."
                                        />
                                    </label>
                                </div>
                            )}

                            {wizardStep === 2 && (
                                <div className="cc-form-grid">
                                    <label>
                                        Designation *
                                        <input
                                            value={form.designation}
                                            onChange={(e) =>
                                                updateForm("designation", e.target.value)
                                            }
                                            placeholder="e.g. Accounts Manager"
                                        />
                                    </label>

                                    <label>
                                        Department *
                                        <select
                                            value={form.department}
                                            onChange={(e) =>
                                                updateForm("department", e.target.value)
                                            }
                                        >
                                            {departments.map((d) => (
                                                <option key={d}>{d}</option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="wide">
                                        Reports To
                                        <input
                                            value={form.reportsTo}
                                            onChange={(e) =>
                                                updateForm("reportsTo", e.target.value)
                                            }
                                            placeholder="Enter reporting manager"
                                        />
                                    </label>

                                    <label className="cc-check-field wide">
                                        <input
                                            type="checkbox"
                                            checked={form.primary}
                                            onChange={(e) =>
                                                updateForm("primary", e.target.checked)
                                            }
                                        />
                                        Set as Primary Contact
                                    </label>
                                </div>
                            )}

                            {wizardStep === 3 && (
                                <div className="cc-form-grid">
                                    <label className="wide">
                                        Email Address *
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) =>
                                                updateForm("email", e.target.value)
                                            }
                                            placeholder="name@company.com"
                                        />
                                    </label>

                                    <label>
                                        Phone (Mobile)
                                        <input
                                            value={form.phone}
                                            onChange={(e) =>
                                                updateForm("phone", e.target.value)
                                            }
                                            placeholder="+91 XXXXX XXXXX"
                                        />
                                    </label>

                                    <label>
                                        Phone (Office)
                                        <input
                                            value={form.office}
                                            onChange={(e) =>
                                                updateForm("office", e.target.value)
                                            }
                                            placeholder="+91 XX XXXX XXXX"
                                        />
                                    </label>

                                    <label className="wide">
                                        Location
                                        <input
                                            value={form.location}
                                            onChange={(e) =>
                                                updateForm("location", e.target.value)
                                            }
                                        />
                                    </label>

                                    <label className="wide">
                                        Address
                                        <textarea
                                            value={form.address}
                                            onChange={(e) =>
                                                updateForm("address", e.target.value)
                                            }
                                            placeholder="Enter full address"
                                        />
                                    </label>
                                </div>
                            )}

                            {wizardStep === 4 && (
                                <div className="cc-review">
                                    <h3>Review Contact Details</h3>

                                    <div className="cc-review-profile">
                                        <Avatar
                                            text={`${form.first[0] || "?"}${form.last[0] || "?"}`}
                                            large
                                        />
                                        <div>
                                            <b>
                                                {form.first} {form.last}
                                            </b>
                                            <span>{form.designation || "Team Member"}</span>
                                        </div>
                                    </div>

                                    <div className="cc-review-grid">
                                        <div>
                                            <small>Email</small>
                                            <b>{form.email || "—"}</b>
                                        </div>
                                        <div>
                                            <small>Phone</small>
                                            <b>{form.phone || "—"}</b>
                                        </div>
                                        <div>
                                            <small>Department</small>
                                            <b>{form.department}</b>
                                        </div>
                                        <div>
                                            <small>Location</small>
                                            <b>{form.location || "—"}</b>
                                        </div>
                                        <div>
                                            <small>Reports To</small>
                                            <b>{form.reportsTo || "—"}</b>
                                        </div>
                                        <div>
                                            <small>Primary Contact</small>
                                            <b>{form.primary ? "Yes" : "No"}</b>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="cc-wizard-footer">
                            <button
                                className="cc-outline"
                                onClick={() => {
                                    if (wizardStep === 1) {
                                        setShowWizard(false);
                                    } else {
                                        setWizardStep((s) => s - 1);
                                    }
                                }}
                            >
                                {wizardStep === 1 ? "Cancel" : "Back"}
                            </button>

                            {wizardStep < 4 ? (
                                <button
                                    className="cc-primary"
                                    onClick={() => {
                                        if (
                                            wizardStep === 1 &&
                                            (!form.first.trim() || !form.last.trim())
                                        ) {
                                            notify("Please enter first and last name.");
                                            return;
                                        }

                                        if (
                                            wizardStep === 3 &&
                                            !form.email.trim()
                                        ) {
                                            notify("Please enter an email address.");
                                            return;
                                        }

                                        setWizardStep((s) => s + 1);
                                    }}
                                >
                                    Next
                                    <ChevronRight size={14} />
                                </button>
                            ) : (
                                <button
                                    className="cc-primary cc-save"
                                    onClick={saveContact}
                                >
                                    <CheckCircle2 size={14} />
                                    {editingId ? "Update Contact" : "Save Contact"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Import modal */}

            {showImport && (
                <div
                    className="cc-modal-backdrop"
                    onClick={() => setShowImport(false)}
                >
                    <div
                        className="cc-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="cc-modal-x"
                            onClick={() => setShowImport(false)}
                        >
                            <X size={16} />
                        </button>

                        <UploadCloud size={30} />

                        <h3>Import Client Contacts</h3>

                        <p>
                            Select a CSV or XLSX file containing contact information.
                        </p>

                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                        />

                        <button
                            className="cc-primary"
                            onClick={() => {
                                setShowImport(false);
                                notify("Import preview integration is pending.");
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Toast */}

            {notice && (
                <div className="cc-toast">
                    <CheckCircle2 size={15} />
                    {notice}
                    <button onClick={() => setNotice("")}>
                        <X size={13} />
                    </button>
                </div>
            )}
        </main>
    );
}
