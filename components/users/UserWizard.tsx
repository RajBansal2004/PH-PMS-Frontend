"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  UserRound,
  BriefcaseBusiness,
  LockKeyhole,
  AlertCircle,
} from "lucide-react";

import {
  createUser,
  updateUser,
  userDetails,
  userDepartments,
  userDesignations,
  userEmployees,
  userProjects,
  userRoles,
  type UserCreatePayload,
  type UserRoleOption,
} from "../../lib/api";


// ============================================================
// TYPES
// ============================================================

type Step = 1 | 2 | 3 | 4;

type Mode = "create" | "edit";

type Props = {
  mode?: Mode;
  userId?: string;
};

type Department = {
  id?: string;
  _id?: string;
  name: string;
  code?: string;
};

type Designation = {
  id?: string;
  _id?: string;
  name: string;
  code?: string;
};

type Employee = {
  id?: string;
  _id?: string;
  employeeCode?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
};

type Project = {
  id?: string;
  _id?: string;
  name?: string;
  code?: string;
};


// ============================================================
// DEFAULT STATE
// ============================================================

type ProjectAccessMode = "ALL" | "ASSIGNED" | "SELECTED" | "OWNED";
type DataScope =
  | "SELF"
  | "TEAM"
  | "DEPARTMENT"
  | "PROJECT"
  | "CLIENT"
  | "ORGANIZATION"
  | "ALL";

type AccessConditions = {
  ifAssigned: boolean;
  ownDepartment: boolean;
  ownTeam: boolean;
  ownProjects: boolean;
};

type AccessPolicyForm = {
  projectAccess: ProjectAccessMode;
  projectIds: string[];
  dataScope: DataScope;
  conditions: AccessConditions;
  additionalAccess: string[];
};

type FormState = Omit<
  UserCreatePayload,
  | "password"
  | "employee"
  | "accessPolicy"
  | "lastName"
  | "username"
  | "phone"
  | "roleIds"
  | "status"
  | "accountType"
  | "mfaEnabled"
> & {
  lastName: string;
  username: string;
  phone: string;
  roleIds: string[];
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "LOCKED";
  accountType: "REGULAR" | "SYSTEM" | "CLIENT" | "CONTRACTOR" | "SERVICE";
  mfaEnabled: boolean;
  password: string;
  confirmPassword: string;
  employee: NonNullable<UserCreatePayload["employee"]> & {
    bio?: string;
  };
  accessPolicy: AccessPolicyForm;
};

const ADDITIONAL_ACCESS_OPTIONS = [
  {
    code: "TIMESHEET_SUBMISSION",
    label: "Allow Timesheet Submission",
    description: "User can submit and manage own timesheets.",
  },
  {
    code: "EXPENSE_SUBMISSION",
    label: "Allow Expense Submission",
    description: "User can submit eligible project expenses.",
  },
  {
    code: "RESOURCE_ALLOCATION",
    label: "Allow Resource Allocation",
    description: "User can participate in resource allocation.",
  },
  {
    code: "BUDGET_VIEW",
    label: "Allow Budget View",
    description: "User can view permitted project budget data.",
  },
  {
    code: "FINANCIAL_APPROVALS",
    label: "Allow Financial Approvals",
    description: "User can access assigned financial approval actions.",
  },
] as const;

function createEmptyForm(): FormState {
  return {
    firstName: "",
    lastName: "",
    name: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
    status: "ACTIVE",
    accountType: "REGULAR",
    roleIds: [],
    permissions: [],
    mfaEnabled: false,
    mfaMethod: "NONE",
    employee: {
      employeeCode: "",
      departmentId: "",
      designationId: "",
      managerId: "",
      joiningDate: "",
      employmentType: "FULL_TIME",
      location: "",
      timeZone: "Asia/Kolkata",
      workShift: "General Shift (9 AM - 6 PM)",
      costCenter: "",
      primaryProjectId: "",
      bio: "",
    },
    accessPolicy: {
      projectAccess: "ALL",
      projectIds: [],
      dataScope: "ALL",
      conditions: {
        ifAssigned: false,
        ownDepartment: false,
        ownTeam: false,
        ownProjects: false,
      },
      additionalAccess: [],
    },
  };
}

// ============================================================
// HELPERS
// ============================================================

function normalizeId(
  item: any
): string {
  return String(
    item?.id ??
      item?._id ??
      ""
  );
}

function getErrorMessage(
  error: unknown
) {
  if (
    error &&
    typeof error === "object"
  ) {
    const value = error as any;

    if (
      value?.response?.message
    ) {
      return value.response.message;
    }

    if (
      value?.message &&
      value.message !== "Validation failed"
    ) {
      return value.message;
    }

    if (
      value?.response?.errors
    ) {
      const errors =
        value.response.errors;

      if (
        Array.isArray(errors)
      ) {
        return errors
          .map(
            (item: any) =>
              item?.message ||
              item?.path ||
              String(item)
          )
          .join(", ");
      }

      if (
        typeof errors === "object"
      ) {
        return Object.entries(
          errors
        )
          .map(
            ([key, value]) =>
              `${key}: ${
                typeof value ===
                "string"
                  ? value
                  : JSON.stringify(value)
              }`
          )
          .join(" | ");
      }
    }

    if (
      value?.details
    ) {
      return JSON.stringify(
        value.details
      );
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please check the form.";
}


// ============================================================
// STEPS
// ============================================================

const STEPS = [
  {
    id: 1,
    title: "Basic Information",
    description:
      "Account identity and security",
    icon: UserRound,
  },

  {
    id: 2,
    title: "Work Information",
    description:
      "Employee and organization details",
    icon: BriefcaseBusiness,
  },

  {
    id: 3,
    title: "Role & Access",
    description:
      "Roles, permissions and scope",
    icon: ShieldCheck,
  },

  {
    id: 4,
    title: "Review & Confirm",
    description:
      "Review information before saving",
    icon: CheckCircle2,
  },
];


// ============================================================
// INPUT COMPONENT
// ============================================================

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="user-wizard-field">
      <label>
        {label}

        {required ? (
          <span className="required">
            *
          </span>
        ) : null}
      </label>

      {children}

      {error ? (
        <div className="user-field-error">
          <AlertCircle size={13} />
          {error}
        </div>
      ) : null}
    </div>
  );
}


// ============================================================
// SELECT
// ============================================================

function SelectField({
  value,
  onChange,
  children,
  disabled,
}: {
  value: string;
  onChange: (
    value: string
  ) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="user-select-wrap">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      >
        {children}
      </select>

      <ChevronDown
        size={16}
        className="user-select-icon"
      />
    </div>
  );
}


// ============================================================
// CHECKBOX
// ============================================================

function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (
    value: boolean
  ) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="user-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
      />

      <span className="user-checkbox-box">
        {checked ? (
          <Check size={12} />
        ) : null}
      </span>

      <span>
        <strong>{label}</strong>

        {description ? (
          <small>
            {description}
          </small>
        ) : null}
      </span>
    </label>
  );
}


// ============================================================
// MAIN
// ============================================================

export default function UserWizard({
  mode = "create",
  userId,
}: Props) {
  const isEdit =
    mode === "edit";

  const [step, setStep] =
    useState<Step>(1);

  const [form, setForm] =
    useState<FormState>(createEmptyForm);

  const [loading, setLoading] =
    useState(
      Boolean(isEdit && userId)
    );

  const [saving, setSaving] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  const [fieldErrors, setFieldErrors] =
    useState<
      Record<string, string>
    >({});

  const [roles, setRoles] =
    useState<UserRoleOption[]>([]);

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [designations, setDesignations] =
    useState<Designation[]>([]);

  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);


  // ==========================================================
  // MASTER DATA
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    async function loadMasters() {
      try {
        const [
          rolesResponse,
          departmentsResponse,
          designationsResponse,
          employeesResponse,
          projectsResponse,
        ] = await Promise.all([
          userRoles(),
          userDepartments(),
          userDesignations(),
          userEmployees(),
          userProjects(),
        ]);

        if (!mounted) {
          return;
        }

        setRoles(
          Array.isArray(
            rolesResponse
          )
            ? rolesResponse
            : []
        );

        setDepartments(
          Array.isArray(
            departmentsResponse
          )
            ? departmentsResponse
            : []
        );

        setDesignations(
          Array.isArray(
            designationsResponse
          )
            ? designationsResponse
            : []
        );

        setEmployees(
          Array.isArray(
            employeesResponse
          )
            ? employeesResponse
            : []
        );

        setProjects(
          Array.isArray(
            projectsResponse
          )
            ? projectsResponse
            : []
        );
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(
          getErrorMessage(err)
        );
      }
    }

    void loadMasters();

    return () => {
      mounted = false;
    };
  }, []);


  // ==========================================================
  // EDIT LOAD
  // ==========================================================

  useEffect(() => {
    if (!isEdit || !userId) {
      return;
    }

    let mounted = true;

    async function loadUser() {
      try {
        setLoading(true);
        setError("");

        const user: any = await userDetails(userId!);

        if (!mounted) {
          return;
        }

        const work: any = user?.workInformation ?? user?.employee ?? {};
        const rawAccess: any = user?.accessPolicy ?? {};
        const rawProjectAccess: any = rawAccess?.projectAccess;
        const rawDataScope: any = rawAccess?.dataScope;
        const rawConditions: any = rawAccess?.conditions;

        const rawProjectMode =
          typeof rawProjectAccess === "string"
            ? rawProjectAccess
            : rawProjectAccess?.mode;

        const projectMode: ProjectAccessMode = [
          "ALL",
          "ASSIGNED",
          "SELECTED",
          "OWNED",
        ].includes(rawProjectMode as any)
          ? rawProjectMode as ProjectAccessMode
          : "ALL";

        const rawScope =
          typeof rawDataScope === "string"
            ? rawDataScope
            : rawDataScope?.scope;

        const dataScope: DataScope = [
          "SELF",
          "TEAM",
          "DEPARTMENT",
          "PROJECT",
          "CLIENT",
          "ORGANIZATION",
          "ALL",
        ].includes(rawScope as any)
          ? rawScope as DataScope
          : "ALL";

        const conditions: AccessConditions = {
          ifAssigned: Boolean(
            Array.isArray(rawConditions)
              ? rawConditions.includes("IF_ASSIGNED")
              : rawConditions?.ifAssigned
          ),
          ownDepartment: Boolean(
            Array.isArray(rawConditions)
              ? rawConditions.includes("OWN_DEPARTMENT")
              : rawConditions?.ownDepartment
          ),
          ownTeam: Boolean(
            Array.isArray(rawConditions)
              ? rawConditions.includes("OWN_TEAM")
              : rawConditions?.ownTeam
          ),
          ownProjects: Boolean(
            Array.isArray(rawConditions)
              ? rawConditions.includes("OWN_PROJECTS")
              : rawConditions?.ownProjects
          ),
        };

        const rawAdditional = rawAccess?.additionalAccess;
        const additionalAccess = Array.isArray(rawAdditional)
          ? rawAdditional.filter(
              (value: unknown): value is string =>
                typeof value === "string"
            )
          : [
              ["TIMESHEET_SUBMISSION", (rawAdditional as any)?.timesheetSubmission],
              ["EXPENSE_SUBMISSION", (rawAdditional as any)?.expenseSubmission],
              ["RESOURCE_ALLOCATION", (rawAdditional as any)?.resourceAllocation],
              ["BUDGET_VIEW", (rawAdditional as any)?.budgetView],
              ["FINANCIAL_APPROVALS", (rawAdditional as any)?.financialApprovals],
            ]
              .filter(([, enabled]) => Boolean(enabled))
              .map(([code]) => String(code));

        setForm({
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          name: user?.name || "",
          email: user?.email || "",
          username: user?.username || "",
          phone: user?.phone || "",
          password: "",
          confirmPassword: "",
          status: user?.status || "ACTIVE",
          accountType: user?.accountType || "REGULAR",
          roleIds: Array.isArray(user?.roles)
            ? user.roles
                .map((role: any) => normalizeId(role))
                .filter(Boolean)
            : [],
          permissions: Array.isArray(user?.permissions)
            ? user.permissions
            : [],
          mfaEnabled: Boolean(
            user?.mfaEnabled ?? user?.mfa?.enabled
          ),
          mfaMethod:
            user?.mfaMethod ||
            user?.mfa?.method ||
            "NONE",
          employee: {
            employeeCode: work?.employeeCode || "",
            departmentId:
              normalizeId(work?.department) ||
              work?.departmentId ||
              "",
            designationId:
              normalizeId(work?.designation) ||
              work?.designationId ||
              "",
            managerId:
              normalizeId(work?.reportingTo) ||
              work?.managerId ||
              "",
            joiningDate: work?.joiningDate
              ? String(work.joiningDate).slice(0, 10)
              : "",
            employmentType:
              (work?.employmentType as any) ||
              "FULL_TIME",
            location: work?.location || "",
            timeZone:
              work?.timeZone ||
              "Asia/Kolkata",
            workShift:
              work?.workShift ||
              "General Shift (9 AM - 6 PM)",
            costCenter: work?.costCenter || "",
            primaryProjectId:
              normalizeId(work?.primaryProject) ||
              work?.primaryProjectId ||
              "",
            bio: work?.bio || "",
          },
          accessPolicy: {
            projectAccess: projectMode,
            projectIds:
              Array.isArray(rawProjectAccess?.projectIds)
                ? rawProjectAccess.projectIds.map(String)
                : Array.isArray((rawAccess as any)?.selectedProjectIds)
                  ? (rawAccess as any).selectedProjectIds.map(String)
                  : [],
            dataScope,
            conditions,
            additionalAccess,
          },
        });
      } catch (err) {
        if (mounted) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      mounted = false;
    };
  }, [isEdit, userId]);


  // ==========================================================
  // FORM UPDATE
  // ==========================================================

  const updateForm = useCallback(
    (patch: Partial<FormState>) => {
      setForm((previous) => ({
        ...previous,
        ...patch,
      }));
    },
    []
  );

  const updateEmployee = useCallback(
    (patch: Partial<FormState["employee"]>) => {
      setForm((previous) => ({
        ...previous,
        employee: {
          ...previous.employee,
          ...patch,
        },
      }));
    },
    []
  );

  const updateAccess = useCallback(
    (patch: Partial<AccessPolicyForm>) => {
      setForm((previous) => ({
        ...previous,
        accessPolicy: {
          ...previous.accessPolicy,
          ...patch,
        },
      }));
    },
    []
  );

  const toggleAdditionalAccess = useCallback(
    (code: string, enabled: boolean) => {
      setForm((previous) => {
        const current = previous.accessPolicy.additionalAccess;
        const next = enabled
          ? Array.from(new Set([...current, code]))
          : current.filter((item) => item !== code);

        return {
          ...previous,
          accessPolicy: {
            ...previous.accessPolicy,
            additionalAccess: next,
          },
        };
      });
    },
    []
  );

  const toggleCondition = useCallback(
    (key: keyof AccessConditions, enabled: boolean) => {
      setForm((previous) => ({
        ...previous,
        accessPolicy: {
          ...previous.accessPolicy,
          conditions: {
            ...previous.accessPolicy.conditions,
            [key]: enabled,
          },
        },
      }));
    },
    []
  );


  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validateStep = (
    currentStep: Step
  ) => {
    const errors: Record<
      string,
      string
    > = {};

    if (
      currentStep === 1
    ) {
      if (
        !(form.firstName || "").trim()
      ) {
        errors.firstName =
          "First name is required.";
      }

      if (
        !(form.lastName || "").trim()
      ) {
        errors.lastName =
          "Last name is required.";
      }

      if (!(form.email || "").trim()) {
        errors.email =
          "Email is required.";
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          form.email || ""
        )
      ) {
        errors.email =
          "Enter a valid email.";
      }

      if (
        !(form.username || "").trim()
      ) {
        errors.username =
          "Username is required.";
      }

      if (!(form.phone || "").trim()) {
        errors.phone =
          "Phone number is required.";
      }

      if (
        !isEdit &&
        !form.password
      ) {
        errors.password =
          "Password is required.";
      }

      if (
        form.password &&
        form.password.length < 8
      ) {
        errors.password =
          "Password must contain at least 8 characters.";
      }

      if (
        form.password !==
        form.confirmPassword
      ) {
        errors.confirmPassword =
          "Passwords do not match.";
      }
    }

    if (
      currentStep === 2
    ) {
      if (
        !form.employee
          ?.departmentId
      ) {
        errors.departmentId =
          "Department is required.";
      }

      if (
        !form.employee
          ?.designationId
      ) {
        errors.designationId =
          "Designation is required.";
      }

      if (
        !form.employee
          ?.employmentType
      ) {
        errors.employmentType =
          "Employment type is required.";
      }

      if (
        !form.employee
          ?.joiningDate
      ) {
        errors.joiningDate =
          "Date of joining is required.";
      }
    }

    if (
      currentStep === 3
    ) {
      if (
        !(form.roleIds || []).length
      ) {
        errors.roles =
          "Assign at least one role.";
      }

      if (
        form.accessPolicy.projectAccess === "SELECTED" &&
        !form.accessPolicy.projectIds.length
      ) {
        errors.projects =
          "Select at least one project.";
      }
    }

    setFieldErrors(errors);

    return (
      Object.keys(errors)
        .length === 0
    );
  };


  // ==========================================================
  // NEXT
  // ==========================================================

  const nextStep = () => {
    setError("");

    if (
      !validateStep(step)
    ) {
      return;
    }

    setStep(
      (value) =>
        Math.min(
          4,
          value + 1
        ) as Step
    );
  };


  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit =
    async () => {
      setError("");
      setFieldErrors({});

      if (
        !validateStep(1) ||
        !validateStep(2) ||
        !validateStep(3)
      ) {
        return;
      }

      try {
        setSaving(true);

        const payload: UserCreatePayload = {
          firstName: (form.firstName || "").trim(),
          lastName: (form.lastName || "").trim(),
          name: `${form.firstName || ""} ${form.lastName || ""}`.trim(),
          email: (form.email || "").trim().toLowerCase(),
          username: (form.username || "").trim().toLowerCase(),
          phone: (form.phone || "").trim(),
          password: form.password,
          status: form.status,
          accountType: form.accountType,
          roleIds: form.roleIds || [],
          permissions: form.permissions,
          mfaEnabled: form.mfaEnabled,
          mfaMethod: form.mfaMethod,
          employee: {
            ...form.employee,
            departmentId: form.employee.departmentId || null,
            designationId: form.employee.designationId || null,
            managerId: form.employee.managerId || null,
            joiningDate: form.employee.joiningDate || null,
            primaryProjectId: form.employee.primaryProjectId || null,
          },
          accessPolicy: {
            projectAccess: {
              mode: form.accessPolicy.projectAccess,
              projectIds:
                form.accessPolicy.projectAccess === "SELECTED"
                  ? form.accessPolicy.projectIds
                  : [],
            },
            dataScope: {
              scope: form.accessPolicy.dataScope,
            },
            conditions: form.accessPolicy.conditions,
            additionalAccess: form.accessPolicy.additionalAccess,
          },
        };

        if (isEdit && !form.password) {
          delete (payload as Partial<UserCreatePayload>).password;
        }

        if (isEdit && userId) {
          await updateUser(
            userId,
            payload
          );
        } else {
          await createUser(
            payload
          );
        }

        setSuccess(true);
      } catch (err) {
        setError(
          getErrorMessage(err)
        );
      } finally {
        setSaving(false);
      }
    };


  // ==========================================================
  // SELECTED ROLES
  // ==========================================================

  const selectedRoles = useMemo(() => {
    return roles.filter((role) =>
      form.roleIds.includes(normalizeId(role))
    );
  }, [roles, form.roleIds]);

  // ==========================================================
  // SUCCESS
  // ==========================================================

  if (success) {
    return (
      <section className="user-wizard-page">
        <div className="user-success-card">
          <div className="user-success-icon">
            <CheckCircle2
              size={48}
            />
          </div>

          <h1>
            {isEdit
              ? "User Updated Successfully!"
              : "User Created Successfully!"}
          </h1>

          <p>
            {isEdit
              ? "All changes have been saved successfully."
              : "The new user account has been created successfully."}
          </p>

          <div className="user-success-actions">
            <button
              type="button"
              className="user-secondary-btn"
              onClick={() => {
                window.location.assign(
                  isEdit && userId
                    ? `/users/${userId}`
                    : "/users"
                );
              }}
            >
              View User Details
            </button>

            <button
              type="button"
              className="user-primary-btn"
              onClick={() => {
                window.location.assign(
                  "/users"
                );
              }}
            >
              Back to User Registry
            </button>
          </div>
        </div>
      </section>
    );
  }


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <section className="user-wizard-page">
        <div className="user-wizard-loading">
          <Loader2
            size={30}
            className="spin"
          />

          <span>
            Loading user information...
          </span>
        </div>
      </section>
    );
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <section className="user-wizard-page">

      {/* HEADER */}

      <div className="user-wizard-header">
        <div>
          <div className="user-wizard-code">
            RBAC-002
          </div>

          <h1>
            {isEdit
              ? "Edit User"
              : "Create User"}
          </h1>

          <p>
            {isEdit
              ? "Modify user details, roles, permissions and access configuration."
              : "Create a new user with roles, permissions and access configuration."}
          </p>
        </div>

        <button
          type="button"
          className="user-back-link"
          onClick={() =>
            window.location.assign(
              "/users"
            )
          }
        >
          <ArrowLeft size={15} />
          User Registry
        </button>
      </div>


      {/* ERROR */}

      {error ? (
        <div className="user-wizard-error">
          <AlertCircle size={18} />

          <div>
            <strong>
              Unable to continue
            </strong>

            <span>
              {error}
            </span>
          </div>
        </div>
      ) : null}


      {/* STEPPER */}

      <div className="user-stepper-card">
        <div className="user-stepper">

          {STEPS.map(
            (
              item,
              index
            ) => {
              const Icon =
                item.icon;

              const completed =
                step >
                item.id;

              const active =
                step ===
                item.id;

              return (
                <div
                  key={item.id}
                  className={`user-step ${
                    active
                      ? "active"
                      : ""
                  } ${
                    completed
                      ? "completed"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    className="user-step-button"
                    onClick={() => {
                      if (
                        item.id <=
                        step
                      ) {
                        setStep(
                          item.id as Step
                        );
                      }
                    }}
                  >
                    <span className="user-step-number">
                      {completed ? (
                        <Check
                          size={15}
                        />
                      ) : (
                        item.id
                      )}
                    </span>

                    <span className="user-step-content">
                      <strong>
                        {item.title}
                      </strong>

                      <small>
                        {item.description}
                      </small>
                    </span>
                  </button>

                  {index <
                  STEPS.length -
                    1 ? (
                    <span className="user-step-line" />
                  ) : null}
                </div>
              );
            }
          )}

        </div>
      </div>


      {/* STEP CONTENT */}

      <div className="user-wizard-card">

        {/* ==================================================
            STEP 1
        ================================================== */}

        {step === 1 ? (
          <div className="user-step-panel">

            <div className="user-panel-heading">
              <div>
                <span>
                  STEP 1
                </span>

                <h2>
                  Basic Information
                </h2>

                <p>
                  Enter the user's account and authentication details.
                </p>
              </div>

              <UserRound
                size={24}
              />
            </div>


            <div className="user-form-grid">

              <Field
                label="First Name"
                required
                error={
                  fieldErrors.firstName
                }
              >
                <input
                  value={
                    form.firstName
                  }
                  placeholder="Enter first name"
                  onChange={(event) =>
                    updateForm({
                      firstName:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>


              <Field
                label="Last Name"
                required
                error={
                  fieldErrors.lastName
                }
              >
                <input
                  value={
                    form.lastName
                  }
                  placeholder="Enter last name"
                  onChange={(event) =>
                    updateForm({
                      lastName:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>


              <Field
                label="Email"
                required
                error={
                  fieldErrors.email
                }
              >
                <input
                  type="email"
                  value={
                    form.email
                  }
                  placeholder="Enter work email"
                  onChange={(event) =>
                    updateForm({
                      email:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>


              <Field
                label="Employee ID"
              >
                <input
                  value={
                    form.employee
                      ?.employeeCode ||
                    ""
                  }
                  placeholder="Auto generated"
                  onChange={(event) =>
                    updateEmployee({
                      employeeCode:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>


              <Field
                label="Username"
                required
                error={
                  fieldErrors.username
                }
              >
                <input
                  value={
                    form.username
                  }
                  placeholder="Enter username"
                  onChange={(event) =>
                    updateForm({
                      username:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>


              <Field
                label="Phone Number"
                required
                error={
                  fieldErrors.phone
                }
              >
                <input
                  value={
                    form.phone
                  }
                  placeholder="+91 98765 43210"
                  onChange={(event) =>
                    updateForm({
                      phone:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>


              <Field
                label="Password"
                required={!isEdit}
                error={
                  fieldErrors.password
                }
              >
                <div className="user-password-wrap">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      form.password
                    }
                    placeholder={
                      isEdit
                        ? "Leave blank to keep current password"
                        : "Enter password"
                    }
                    onChange={(
                      event
                    ) =>
                      updateForm({
                        password:
                          event.target
                            .value,
                      })
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (value) =>
                          !value
                      )
                    }
                  >
                    {showPassword ? (
                      <EyeOff
                        size={16}
                      />
                    ) : (
                      <Eye
                        size={16}
                      />
                    )}
                  </button>
                </div>
              </Field>


              <Field
                label="Confirm Password"
                required={!isEdit}
                error={
                  fieldErrors.confirmPassword
                }
              >
                <div className="user-password-wrap">
                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      form.confirmPassword
                    }
                    placeholder="Confirm password"
                    onChange={(
                      event
                    ) =>
                      updateForm({
                        confirmPassword:
                          event.target
                            .value,
                      })
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) =>
                          !value
                      )
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff
                        size={16}
                      />
                    ) : (
                      <Eye
                        size={16}
                      />
                    )}
                  </button>
                </div>
              </Field>


              <Field
                label="Status"
                required
              >
                <SelectField
                  value={
                    form.status
                  }
                  onChange={(
                    value
                  ) =>
                    updateForm({
                      status:
                        value as any,
                    })
                  }
                >
                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>

                  <option value="SUSPENDED">
                    Suspended
                  </option>
                  <option value="LOCKED">
                    Locked
                  </option>
                </SelectField>
              </Field>


              <Field label="Account Type" required>
                <SelectField
                  value={form.accountType}
                  onChange={(value) =>
                    updateForm({
                      accountType:
                        value as FormState["accountType"],
                    })
                  }
                >
                  <option value="REGULAR">Regular</option>
                  <option value="SYSTEM">System</option>
                  <option value="CLIENT">Client</option>
                  <option value="CONTRACTOR">Contractor</option>
                  <option value="SERVICE">Service</option>
                </SelectField>
              </Field>

              <div className="user-inline-setting">
                <Checkbox
                  checked={
                    form.mfaEnabled
                  }
                  onChange={(
                    value
                  ) =>
                    updateForm({
                      mfaEnabled:
                        value,

                      mfaMethod:
                        value
                          ? "AUTHENTICATOR"
                          : "NONE",
                    })
                  }
                  label="MFA Enabled"
                  description="Require multi-factor authentication."
                />
              </div>

            </div>

          </div>
        ) : null}


        {/* ==================================================
            STEP 2
        ================================================== */}

        {step === 2 ? (
          <div className="user-step-panel">

            <div className="user-panel-heading">
              <div>
                <span>
                  STEP 2
                </span>

                <h2>
                  Work Information
                </h2>

                <p>
                  Configure employee, department and work information.
                </p>
              </div>

              <BriefcaseBusiness
                size={24}
              />
            </div>


            <div className="user-form-grid">

              <Field
                label="Employee ID"
              >
                <input
                  value={
                    form.employee
                      ?.employeeCode ||
                    ""
                  }
                  placeholder="EMP00131"
                  onChange={(event) =>
                    updateEmployee({
                      employeeCode:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>


              <Field
                label="Department"
                required
                error={
                  fieldErrors.departmentId
                }
              >
                <SelectField
                  value={
                    form.employee
                      ?.departmentId ||
                    ""
                  }
                  onChange={(
                    value
                  ) =>
                    updateEmployee({
                      departmentId:
                        value,
                    })
                  }
                >
                  <option value="">
                    Select Department
                  </option>

                  {departments.map(
                    (department) => (
                      <option
                        key={normalizeId(
                          department
                        )}
                        value={normalizeId(
                          department
                        )}
                      >
                        {
                          department.name
                        }
                      </option>
                    )
                  )}
                </SelectField>
              </Field>


              <Field
                label="Designation"
                required
                error={
                  fieldErrors.designationId
                }
              >
                <SelectField
                  value={
                    form.employee
                      ?.designationId ||
                    ""
                  }
                  onChange={(
                    value
                  ) =>
                    updateEmployee({
                      designationId:
                        value,
                    })
                  }
                >
                  <option value="">
                    Select Designation
                  </option>

                  {designations.map(
                    (designation) => (
                      <option
                        key={normalizeId(
                          designation
                        )}
                        value={normalizeId(
                          designation
                        )}
                      >
                        {
                          designation.name
                        }
                      </option>
                    )
                  )}
                </SelectField>
              </Field>


              <Field
                label="Reporting To"
              >
                <SelectField
                  value={
                    form.employee
                      ?.managerId ||
                    ""
                  }
                  onChange={(
                    value
                  ) =>
                    updateEmployee({
                      managerId:
                        value,
                    })
                  }
                >
                  <option value="">
                    Select Manager
                  </option>

                  {employees.map(
                    (employee) => (
                      <option
                        key={normalizeId(
                          employee
                        )}
                        value={normalizeId(
                          employee
                        )}
                      >
                        {employee.name ||
                          employee.employeeCode ||
                          "Employee"}
                      </option>
                    )
                  )}
                </SelectField>
              </Field>


              <Field
                label="Employment Type"
                required
                error={
                  fieldErrors.employmentType
                }
              >
                <SelectField
                  value={
                    form.employee
                      ?.employmentType ||
                    "FULL_TIME"
                  }
                  onChange={(
                    value
                  ) =>
                    updateEmployee({
                      employmentType:
                        value as any,
                    })
                  }
                >
                  <option value="FULL_TIME">
                    Full Time
                  </option>

                  <option value="PART_TIME">
                    Part Time
                  </option>

                  <option value="CONTRACT">
                    Contract
                  </option>

                  <option value="INTERN">
                    Intern
                  </option>

                  <option value="FREELANCE">
                    Freelance
                  </option>

                  <option value="CONSULTANT">
                    Consultant
                  </option>
                </SelectField>
              </Field>


              <Field
                label="Date of Joining"
                required
                error={
                  fieldErrors.joiningDate
                }
              >
                <input
                  type="date"
                  value={
                    form.employee
                      ?.joiningDate ||
                    ""
                  }
                  onChange={(event) =>
                    updateEmployee({
                      joiningDate:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>


              <Field label="Location">
                <input
                  value={
                    form.employee
                      ?.location ||
                    ""
                  }
                  placeholder="Select location"
                  onChange={(event) =>
                    updateEmployee({
                      location:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>


              <Field label="Time Zone">
                <SelectField
                  value={
                    form.employee
                      ?.timeZone ||
                    "Asia/Kolkata"
                  }
                  onChange={(
                    value
                  ) =>
                    updateEmployee({
                      timeZone:
                        value,
                    })
                  }
                >
                  <option value="Asia/Kolkata">
                    (UTC+05:30) Asia/Kolkata
                  </option>

                  <option value="UTC">
                    UTC
                  </option>

                  <option value="Asia/Dubai">
                    (UTC+04:00) Asia/Dubai
                  </option>
                </SelectField>
              </Field>


              <Field label="Work Shift">
                <input
                  value={
                    form.employee
                      ?.workShift ||
                    ""
                  }
                  placeholder="General Shift (9 AM - 6 PM)"
                  onChange={(event) =>
                    updateEmployee({
                      workShift:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>


              <Field label="Cost Center">
                <input
                  value={
                    form.employee
                      ?.costCenter ||
                    ""
                  }
                  placeholder="Select cost center"
                  onChange={(event) =>
                    updateEmployee({
                      costCenter:
                        event.target
                          .value,
                    })
                  }
                />
              </Field>


              <Field label="Primary Project Access">
                <SelectField
                  value={
                    form.employee
                      ?.primaryProjectId ||
                    ""
                  }
                  onChange={(
                    value
                  ) =>
                    updateEmployee({
                      primaryProjectId:
                        value,
                    })
                  }
                >
                  <option value="">
                    Select Project
                  </option>

                  {projects.map(
                    (project) => (
                      <option
                        key={normalizeId(
                          project
                        )}
                        value={normalizeId(
                          project
                        )}
                      >
                        {
                          project.name ||
                          project.code
                        }
                      </option>
                    )
                  )}
                </SelectField>
              </Field>


              <div className="user-field-full">
                <Field label="Bio">
                  <textarea
                    value={
                      form.employee
                        ?.bio ||
                      ""
                    }
                    placeholder="Write a short bio about the user"
                    rows={4}
                    onChange={(event) =>
                      updateEmployee({
                        bio:
                          event.target
                            .value,
                      })
                    }
                  />
                </Field>
              </div>

            </div>

          </div>
        ) : null}


        {/* ==================================================
            STEP 3
        ================================================== */}

        {step === 3 ? (
          <div className="user-step-panel">

            <div className="user-panel-heading">
              <div>
                <span>
                  STEP 3
                </span>

                <h2>
                  Role & Access
                </h2>

                <p>
                  Assign roles and configure data access policies.
                </p>
              </div>

              <ShieldCheck
                size={24}
              />
            </div>


            <div className="user-access-grid">

              {/* ROLES */}

              <div className="user-access-card">
                <div className="user-card-heading">
                  <div>
                    <h3>
                      Assign Roles
                    </h3>

                    <p>
                      Select one or more roles.
                    </p>
                  </div>

                  <span>
                    {roles.length} available
                  </span>
                </div>

                <div className="user-role-list">

                  {roles.map(
                    (role) => {
                      const id =
                        normalizeId(
                          role
                        );

                      const checked =
                        (form.roleIds || []).includes(
                          id
                        );

                      return (
                        <label
                          key={id}
                          className={`user-role-row ${
                            checked
                              ? "selected"
                              : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={
                              checked
                            }
                            onChange={() => {
                              setForm(
                                (
                                  previous
                                ) => {
                                  const currentIds = previous.roleIds || [];
                                  const exists =
                                    currentIds.includes(
                                      id
                                    );

                                  return {
                                    ...previous,

                                    roleIds:
                                      exists
                                        ? currentIds.filter(
                                            (
                                              roleId
                                            ) =>
                                              roleId !==
                                              id
                                          )
                                        : [
                                            ...currentIds,
                                            id,
                                          ],
                                  };
                                }
                              );
                            }}
                          />

                          <span className="user-checkbox-box">
                            {checked ? (
                              <Check
                                size={12}
                              />
                            ) : null}
                          </span>

                          <span className="user-role-text">
                            <strong>
                              {
                                role.name
                              }
                            </strong>

                            <small>
                              {role.description ||
                                role.code ||
                                "Organization role"}
                            </small>
                          </span>
                        </label>
                      );
                    }
                  )}

                </div>

                {fieldErrors.roles ? (
                  <div className="user-field-error">
                    <AlertCircle
                      size={13}
                    />

                    {
                      fieldErrors.roles
                    }
                  </div>
                ) : null}
              </div>


              {/* PERMISSIONS */}

              <div className="user-access-card">
                <div className="user-card-heading">
                  <div>
                    <h3>Effective Role Access</h3>
                    <p>
                      Permissions are resolved from the selected roles by the backend RBAC engine.
                    </p>
                  </div>
                </div>

                <div className="permission-preview">
                  {selectedRoles.length === 0 ? (
                    <div className="permission-empty">
                      <ShieldCheck size={24} />
                      <span>
                        Select a role to review its access scope.
                      </span>
                    </div>
                  ) : (
                    <div className="permission-groups">
                      {selectedRoles.map((role) => (
                        <div
                          key={normalizeId(role)}
                          className="permission-group"
                        >
                          <button type="button">
                            <span>{role.name}</span>
                            <span>{role.scope || "ORGANIZATION"}</span>
                          </button>
                          <small>
                            {role.description ||
                              `Role code: ${role.code || "—"}. Effective permissions are enforced server-side.`}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ACCESS */}

            <div className="user-access-section">

              <div className="user-access-card">
                <div className="user-card-heading">
                  <div>
                    <h3>Project Access</h3>
                    <p>Control which projects the user can access.</p>
                  </div>
                </div>

                <div className="user-radio-grid">
                  {[
                    {
                      value: "ALL" as const,
                      title: "All Projects",
                      description: "User can access all organization projects.",
                    },
                    {
                      value: "ASSIGNED" as const,
                      title: "Assigned Projects",
                      description: "User can access projects explicitly assigned to them.",
                    },
                    {
                      value: "SELECTED" as const,
                      title: "Selected Projects",
                      description: "User can access only the selected projects below.",
                    },
                    {
                      value: "OWNED" as const,
                      title: "Owned Projects",
                      description: "User can access projects they own or manage.",
                    },
                  ].map((item) => (
                    <label
                      key={item.value}
                      className={`user-radio-card ${
                        form.accessPolicy.projectAccess === item.value
                          ? "selected"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="projectAccess"
                        checked={form.accessPolicy.projectAccess === item.value}
                        onChange={() => {
                          updateAccess({
                            projectAccess: item.value,
                            projectIds:
                              item.value === "SELECTED"
                                ? form.accessPolicy.projectIds
                                : [],
                          });
                        }}
                      />
                      <span className="user-radio-dot" />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                      </span>
                    </label>
                  ))}
                </div>

                {form.accessPolicy.projectAccess === "SELECTED" ? (
                  <div className="selected-project-list">
                    {projects.length === 0 ? (
                      <div className="permission-empty">
                        <span>No projects available.</span>
                      </div>
                    ) : (
                      projects.map((project) => {
                        const id = normalizeId(project);
                        if (!id) return null;
                        const checked = form.accessPolicy.projectIds.includes(id);

                        return (
                          <Checkbox
                            key={id}
                            checked={checked}
                            onChange={(enabled) => {
                              const next = enabled
                                ? Array.from(
                                    new Set([
                                      ...form.accessPolicy.projectIds,
                                      id,
                                    ])
                                  )
                                : form.accessPolicy.projectIds.filter(
                                    (value) => value !== id
                                  );
                              updateAccess({ projectIds: next });
                            }}
                            label={project.name || project.code || "Project"}
                            description={
                              project.code && project.name
                                ? project.code
                                : undefined
                            }
                          />
                        );
                      })
                    )}
                  </div>
                ) : null}

                {fieldErrors.projects ? (
                  <div className="user-field-error">
                    <AlertCircle size={13} />
                    {fieldErrors.projects}
                  </div>
                ) : null}
              </div>

              <div className="user-access-card">
                <div className="user-card-heading">
                  <div>
                    <h3>Data Access Scope</h3>
                    <p>Define the user's visibility boundary.</p>
                  </div>
                </div>

                <div className="user-radio-grid">
                  {[
                    {
                      value: "SELF" as const,
                      title: "Self",
                      description: "Own records and actions only.",
                    },
                    {
                      value: "TEAM" as const,
                      title: "Team",
                      description: "Records within the user's team.",
                    },
                    {
                      value: "DEPARTMENT" as const,
                      title: "Department",
                      description: "Records within the user's department.",
                    },
                    {
                      value: "PROJECT" as const,
                      title: "Project",
                      description: "Records within permitted projects.",
                    },
                    {
                      value: "CLIENT" as const,
                      title: "Client",
                      description: "Records within permitted clients.",
                    },
                    {
                      value: "ORGANIZATION" as const,
                      title: "Organization",
                      description: "Organization-wide data access.",
                    },
                    {
                      value: "ALL" as const,
                      title: "All",
                      description: "Full data visibility where permitted by role.",
                    },
                  ].map((item) => (
                    <label
                      key={item.value}
                      className={`user-radio-card ${
                        form.accessPolicy.dataScope === item.value
                          ? "selected"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="dataScope"
                        checked={form.accessPolicy.dataScope === item.value}
                        onChange={() =>
                          updateAccess({ dataScope: item.value })
                        }
                      />
                      <span className="user-radio-dot" />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* CONDITIONS */}

            <div className="user-access-card">
              <div className="user-card-heading">
                <div>
                  <h3>Access Conditions</h3>
                  <p>
                    Apply additional authorization conditions to the selected scope.
                  </p>
                </div>
              </div>

              <div className="user-toggle-grid">
                <Checkbox
                  checked={form.accessPolicy.conditions.ifAssigned}
                  onChange={(value) =>
                    toggleCondition("ifAssigned", value)
                  }
                  label="Only If Assigned"
                  description="Allow access only when the user is assigned to the record or project."
                />
                <Checkbox
                  checked={form.accessPolicy.conditions.ownDepartment}
                  onChange={(value) =>
                    toggleCondition("ownDepartment", value)
                  }
                  label="Own Department"
                  description="Restrict access to the user's department."
                />
                <Checkbox
                  checked={form.accessPolicy.conditions.ownTeam}
                  onChange={(value) =>
                    toggleCondition("ownTeam", value)
                  }
                  label="Own Team"
                  description="Restrict access to the user's team."
                />
                <Checkbox
                  checked={form.accessPolicy.conditions.ownProjects}
                  onChange={(value) =>
                    toggleCondition("ownProjects", value)
                  }
                  label="Own Projects"
                  description="Restrict access to projects owned by the user."
                />
              </div>
            </div>

            {/* ADDITIONAL ACCESS */}

            <div className="user-access-card">
              <div className="user-card-heading">
                <div>
                  <h3>Additional Access</h3>
                  <p>Fine-grained capabilities for this user.</p>
                </div>
              </div>

              <div className="user-toggle-grid">
                {ADDITIONAL_ACCESS_OPTIONS.map((item) => (
                  <Checkbox
                    key={item.code}
                    checked={form.accessPolicy.additionalAccess.includes(
                      item.code
                    )}
                    onChange={(value) =>
                      toggleAdditionalAccess(item.code, value)
                    }
                    label={item.label}
                    description={item.description}
                  />
                ))}
              </div>
            </div>

          </div>
        ) : null}

        {/* ==================================================
            STEP 4
        ================================================== */}

        {step === 4 ? (
          <div className="user-step-panel">

            <div className="user-panel-heading">
              <div>
                <span>
                  STEP 4
                </span>

                <h2>
                  Review & Confirm
                </h2>

                <p>
                  Verify the information before saving the user.
                </p>
              </div>

              <CheckCircle2
                size={24}
              />
            </div>


            <div className="user-review-grid">

              {/* USER */}

              <div className="user-review-card">

                <div className="user-review-title">
                  <UserRound
                    size={18}
                  />

                  <span>
                    User Summary
                  </span>
                </div>

                <div className="user-review-profile">
                  <div className="user-review-avatar">
                    {(
                      (form.firstName || "").charAt(0) +
                      (form.lastName || "").charAt(0)
                    ).toUpperCase()}
                  </div>

                  <div>
                    <strong>
                      {form.firstName || ""}{" "}
                      {form.lastName || ""}
                    </strong>

                    <span>
                      {form.email}
                    </span>

                    <small>
                      {form.username}
                    </small>
                  </div>

                  <span className="user-active-badge">
                    {form.status}
                  </span>
                </div>

                <div className="user-review-details">

                  <div>
                    <span>
                      Phone
                    </span>

                    <strong>
                      {form.phone ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Employee ID
                    </span>

                    <strong>
                      {form.employee
                        ?.employeeCode ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Department
                    </span>

                    <strong>
                      {departments.find(
                        (item) =>
                          normalizeId(
                            item
                          ) ===
                          form.employee
                            ?.departmentId
                      )?.name ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Designation
                    </span>

                    <strong>
                      {designations.find(
                        (item) =>
                          normalizeId(
                            item
                          ) ===
                          form.employee
                            ?.designationId
                      )?.name ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Location
                    </span>

                    <strong>
                      {form.employee
                        ?.location ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      MFA
                    </span>

                    <strong>
                      {form.mfaEnabled
                        ? "Enabled"
                        : "Disabled"}
                    </strong>
                  </div>

                </div>

              </div>


              {/* ACCESS */}

              <div className="user-review-card">
                <div className="user-review-title">
                  <LockKeyhole size={18} />
                  <span>Access Summary</span>
                </div>

                <div className="user-review-list">
                  <div>
                    <span>Roles</span>
                    <strong>
                      {selectedRoles.map((role) => role.name).join(", ") || "No role"}
                    </strong>
                  </div>

                  <div>
                    <span>Project Access</span>
                    <strong>
                      {({
                        ALL: "All Projects",
                        ASSIGNED: "Assigned Projects",
                        SELECTED: `Selected Projects (${form.accessPolicy.projectIds.length})`,
                        OWNED: "Owned Projects",
                      } as Record<ProjectAccessMode, string>)[
                        form.accessPolicy.projectAccess
                      ]}
                    </strong>
                  </div>

                  <div>
                    <span>Data Scope</span>
                    <strong>{form.accessPolicy.dataScope}</strong>
                  </div>

                  <div>
                    <span>Conditions</span>
                    <strong>
                      {Object.values(form.accessPolicy.conditions).filter(Boolean)
                        .length || "None"}
                    </strong>
                  </div>

                  <div>
                    <span>MFA</span>
                    <strong>
                      {form.mfaEnabled ? "Enabled" : "Disabled"}
                    </strong>
                  </div>
                </div>

                <div className="review-access-chips">
                  {form.accessPolicy.additionalAccess.map((code) => (
                    <span key={code}>
                      {ADDITIONAL_ACCESS_OPTIONS.find(
                        (item) => item.code === code
                      )?.label.replace(/^Allow /, "") || code}
                    </span>
                  ))}
                </div>
              </div>


            </div>

          </div>
        ) : null}

      </div>


      {/* FOOTER */}

      <div className="user-wizard-footer">

        <button
          type="button"
          className="user-secondary-btn"
          onClick={() => {
            if (step === 1) {
              window.location.assign(
                "/users"
              );
              return;
            }

            setStep(
              (value) =>
                Math.max(
                  1,
                  value - 1
                ) as Step
            );
          }}
        >
          <ArrowLeft size={15} />

          {step === 1
            ? "Cancel"
            : "Back"}
        </button>


        <div className="user-footer-right">

          {step < 4 ? (
            <button
              type="button"
              className="user-primary-btn"
              onClick={
                nextStep
              }
            >
              Next

              <ArrowRight
                size={15}
              />
            </button>
          ) : (
            <button
              type="button"
              className="user-create-btn"
              disabled={saving}
              onClick={
                handleSubmit
              }
            >
              {saving ? (
                <>
                  <Loader2
                    size={15}
                    className="spin"
                  />

                  Saving...
                </>
              ) : (
                <>
                  <Check
                    size={15}
                  />

                  {isEdit
                    ? "Save Changes"
                    : "Create User"}
                </>
              )}
            </button>
          )}

        </div>

      </div>

    </section>
  );
}