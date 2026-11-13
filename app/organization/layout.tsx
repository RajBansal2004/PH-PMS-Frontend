
import type { ReactNode } from "react";

import { Shell } from "../../components/Shell";

type OrganizationLayoutProps = Readonly<{
  children: ReactNode;
}>;

/**
 * Organization route layout.
 *
 * Keeps organization pages inside the shared application shell.
 * Authentication and organization authorization must be enforced
 * by the existing AuthProvider and backend middleware.
 */
export default function OrganizationLayout({
  children,
}: OrganizationLayoutProps) {
  return (
    <Shell>
      {children}
    </Shell>
  );
}
