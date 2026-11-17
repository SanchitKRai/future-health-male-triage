import { ArrowRight, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import SectionHeading from "../components/ui/SectionHeading";

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  next: string;
  nextLabel: string;
}

export default function PlaceholderPage({ eyebrow, title, description, next, nextLabel }: Props) {
  return (
    <div className="subpage">
      <SectionHeading eyebrow={eyebrow} title={title} description={description}/>
      <section className="coming-soon-panel">
        <div className="coming-icon"><LockKeyhole size={22}/></div>
        <div className="eyebrow">FOUNDATION MILESTONE</div>
        <h2>This space is being built with care.</h2>
        <p>The navigation and product foundation are ready. This module will be added in its own milestone, with privacy and safety checks built in from the start.</p>
        <Link to={next} className="text-link">{nextLabel} <ArrowRight size={15}/></Link>
      </section>
    </div>
  );
}
