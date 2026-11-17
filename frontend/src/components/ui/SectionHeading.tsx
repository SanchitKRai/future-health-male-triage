import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function SectionHeading({ eyebrow, title, description, action }: Props) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="section-heading-action">{action}</div>}
    </div>
  );
}
