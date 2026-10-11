import type { ComponentType, ReactNode } from "react";

/** Icon + one line of store information (04-ui-design-system.md §6.10). */
export function InfoRow({
  icon: Icon,
  iconClassName = "size-5",
  children,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  iconClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className={`${iconClassName} shrink-0`} aria-hidden={true} />
      <span>{children}</span>
    </div>
  );
}
