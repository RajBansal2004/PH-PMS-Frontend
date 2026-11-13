import type { BrdCreateInput } from "./types";

export type BrdFormErrors = Partial<
  Record<keyof BrdCreateInput, string>
>;

export function validateBrdForm(
  input: BrdCreateInput,
): BrdFormErrors {
  const errors: BrdFormErrors = {};

  if (!input.title.trim()) {
    errors.title = "BRD title is required.";
  } else if (input.title.trim().length < 3) {
    errors.title = "Title must contain at least 3 characters.";
  } else if (input.title.trim().length > 200) {
    errors.title = "Title cannot exceed 200 characters.";
  }

  if (!input.projectId.trim()) {
    errors.projectId = "Please select a project.";
  }

  if (!input.clientName.trim()) {
    errors.clientName = "Client name is required.";
  } else if (input.clientName.trim().length > 200) {
    errors.clientName = "Client name cannot exceed 200 characters.";
  }

  if (!input.description.trim()) {
    errors.description = "Description is required.";
  } else if (input.description.trim().length > 5000) {
    errors.description = "Description cannot exceed 5000 characters.";
  }

  if (!input.tags.every((tag) => tag.trim().length <= 50)) {
    errors.tags = "Each tag must be 50 characters or fewer.";
  }

  return errors;
}