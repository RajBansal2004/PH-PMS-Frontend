"use client";

import { useState, type FormEvent } from "react";

import type {
  BrdCreateInput,
  BrdPriority,
  BrdType,
} from "../../lib/brd/types";

import {
  validateBrdForm,
  type BrdFormErrors,
} from "../../lib/brd/validation";

type Props = {
  initialValues?: Partial<BrdCreateInput>;
  submitting?: boolean;
  onSubmit: (values: BrdCreateInput) => Promise<void>;
};

const initialForm: BrdCreateInput = {
  title: "",
  projectId: "",
  clientName: "",
  type: "Business Requirement Document",
  priority: "Medium",
  confidentiality: "Internal",
  description: "",
  tags: [],
  targetReleaseDate: "",
  reviewDueDate: "",
};

export default function BrdForm({
  initialValues,
  submitting = false,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<BrdCreateInput>({
    ...initialForm,
    ...initialValues,
  });

  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<BrdFormErrors>({});
  const [submitError, setSubmitError] = useState("");

  function update<K extends keyof BrdCreateInput>(
    key: K,
    value: BrdCreateInput[K],
  ) {
    setValues((previous) => ({
      ...previous,
      [key]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [key]: undefined,
    }));
  }

  function addTag() {
    const tag = tagInput.trim();

    if (!tag || values.tags.includes(tag)) {
      setTagInput("");
      return;
    }

    if (tag.length > 50 || values.tags.length >= 20) {
      setErrors((previous) => ({
        ...previous,
        tags: "Maximum 20 tags allowed; each tag can contain up to 50 characters.",
      }));
      return;
    }

    update("tags", [...values.tags, tag]);
    setTagInput("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const validationErrors = validateBrdForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        clientName: values.clientName.trim(),
        description: values.description.trim(),
        tags: values.tags.map((tag) => tag.trim()),
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to save the BRD.",
      );
    }
  }

  return (
    <form className="brd-form" onSubmit={handleSubmit} noValidate>
      {submitError && (
        <div className="brd-form-error" role="alert">
          {submitError}
        </div>
      )}

      <div className="brd-form-grid">
        <label className="brd-form-field">
          <span>BRD Title *</span>
          <input
            value={values.title}
            maxLength={200}
            onChange={(event) => update("title", event.target.value)}
            required
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title && <small>{errors.title}</small>}
        </label>

        <label className="brd-form-field">
          <span>Project ID *</span>
          <input
            value={values.projectId}
            maxLength={100}
            onChange={(event) => update("projectId", event.target.value)}
            required
            aria-invalid={Boolean(errors.projectId)}
          />
          {errors.projectId && <small>{errors.projectId}</small>}
        </label>

        <label className="brd-form-field">
          <span>Client *</span>
          <input
            value={values.clientName}
            maxLength={200}
            onChange={(event) => update("clientName", event.target.value)}
            required
            aria-invalid={Boolean(errors.clientName)}
          />
          {errors.clientName && <small>{errors.clientName}</small>}
        </label>

        <label className="brd-form-field">
          <span>BRD Type *</span>
          <select
            value={values.type}
            onChange={(event) =>
              update("type", event.target.value as BrdType)
            }
          >
            <option>Business Requirement Document</option>
            <option>Functional Requirement Document</option>
            <option>Technical Requirement Document</option>
          </select>
        </label>

        <label className="brd-form-field">
          <span>Priority *</span>
          <select
            value={values.priority}
            onChange={(event) =>
              update("priority", event.target.value as BrdPriority)
            }
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </label>

        <label className="brd-form-field">
          <span>Confidentiality *</span>
          <select
            value={values.confidentiality}
            onChange={(event) =>
              update("confidentiality", event.target.value)
            }
          >
            <option>Internal</option>
            <option>Confidential</option>
            <option>Restricted</option>
            <option>Public</option>
          </select>
        </label>

        <label className="brd-form-field">
          <span>Target Release</span>
          <input
            type="date"
            value={values.targetReleaseDate || ""}
            onChange={(event) =>
              update("targetReleaseDate", event.target.value)
            }
          />
        </label>

        <label className="brd-form-field">
          <span>Review Due Date</span>
          <input
            type="date"
            value={values.reviewDueDate || ""}
            onChange={(event) =>
              update("reviewDueDate", event.target.value)
            }
          />
        </label>

        <label className="brd-form-field brd-form-full">
          <span>Description *</span>
          <textarea
            value={values.description}
            maxLength={5000}
            rows={6}
            onChange={(event) =>
              update("description", event.target.value)
            }
            required
            aria-invalid={Boolean(errors.description)}
          />
          <small>
            {errors.description || `${values.description.length}/5000 characters`}
          </small>
        </label>

        <div className="brd-form-field brd-form-full">
          <label htmlFor="brd-tag-input">Tags</label>
          <div className="brd-tag-input-row">
            <input
              id="brd-tag-input"
              value={tagInput}
              maxLength={50}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                }
              }}
              placeholder="Enter a tag and press Add"
            />
            <button
              type="button"
              className="brd-button"
              onClick={addTag}
            >
              Add
            </button>
          </div>

          <div className="brd-tags">
            {values.tags.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() =>
                  update(
                    "tags",
                    values.tags.filter((item) => item !== tag),
                  )
                }
                aria-label={`Remove tag ${tag}`}
              >
                {tag} ×
              </button>
            ))}
          </div>

          {errors.tags && <small>{errors.tags}</small>}
        </div>
      </div>

      <div className="brd-form-actions">
        <button
          type="submit"
          className="brd-button brd-button-primary"
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Save BRD"}
        </button>
      </div>
    </form>
  );
}