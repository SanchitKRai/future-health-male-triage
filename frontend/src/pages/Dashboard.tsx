import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, ClipboardCheck,
  Clock3, HeartPulse, LockKeyhole, Plus, ShieldCheck, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLocStore } from "../store/useLocStore";
import SectionHeading from "../components/ui/SectionHeading";
import StatCard from "../components/dashboard/StatCard";

export default function Dashboard() {
  const records = useLocStore((state) => state.records);

  return (
    <div className="dashboard-page">
      <SectionHeading eyebrow="TUESDAY, NOVEMBER 17" title="Your health, on your terms."
        description="A private space to understand your health and decide what comes next."
        action={<span className="secure-chip"><LockKeyhole size={14}/> Private workspace</span>} />

      <section className="welcome-banner">
        <div className="welcome-copy">
          <div className="welcome-kicker"><Sparkles size={14}/> A BETTER WAY TO CHECK IN</div>
          <h2>Small steps today.<br/><em>More clarity tomorrow.</em></h2>
          <p>Start with a short, private check-in. No judgement, no assumptions — just useful information to help you make informed next steps.</p>
          <Link to="/screening" className="button button-light">Begin health check <ArrowRight size={16}/></Link>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-orbit orbit-one"/>
          <div className="art-orbit orbit-two"/>
          <div className="art-core"><HeartPulse size={58} strokeWidth={1.15}/></div>
          <div className="art-pill art-pill-one"><ShieldCheck size={15}/> Private by design</div>
          <div className="art-pill art-pill-two"><ActivityIcon/> Wellbeing, at your pace</div>
          <div className="art-spark art-spark-one">✳</div><div className="art-spark art-spark-two">✳</div>
        </div>
      </section>

      <div className="dashboard-section-heading">
        <div><div className="eyebrow">YOUR OVERVIEW</div><h2>A clear place to start</h2></div>
        <span className="muted-inline">Guest session · No account needed</span>
      </div>

      <div className="stats-grid">
        <StatCard label="Health records" value={String(records.length).padStart(2, "0")} detail="Added in this session" icon={ClipboardCheck}/>
        <StatCard label="Last check-in" value="Not yet" detail="Your first check-in awaits" icon={Clock3} tone="sand"/>
        <StatCard label="Privacy status" value="Private" detail="Nothing uploaded" icon={ShieldCheck} tone="blue"/>
      </div>

      <div className="dashboard-grid">
        <section className="panel next-step-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">YOUR NEXT STEP</div><h3>Make your first check-in</h3></div>
            <span className="panel-icon"><CalendarDays size={19}/></span>
          </div>
          <p>A few optional questions can help you organise your health history and understand whether a professional check-up may be worth considering.</p>
          <div className="step-preview">
            <div className="step-check"><Check size={14}/></div>
            <div><strong>Private and self-paced</strong><span>Skip anything you don't want to answer.</span></div>
            <span className="step-time">~5 min</span>
          </div>
          <Link to="/screening" className="text-link">Start screening <ArrowRight size={15}/></Link>
        </section>

        <section className="panel trend-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">HEALTH OVER TIME</div><h3>Your timeline starts here</h3></div>
            <span className="panel-icon panel-icon-soft"><HeartPulse size={19}/></span>
          </div>
          <div className="empty-timeline">
            <div className="timeline-illustration"><div className="timeline-line"/><div className="timeline-dot dot-a"/><div className="timeline-dot dot-b"/><div className="timeline-dot dot-c"/></div>
            <div><strong>No health records yet</strong><span>Add a lab result or health measurement to begin seeing your history in one place.</span></div>
          </div>
          <Link to="/timeline" className="text-link">Explore health timeline <ArrowRight size={15}/></Link>
        </section>
      </div>

      <section className="trust-strip">
        <div className="trust-icon"><LockKeyhole size={19}/></div>
        <div><strong>Your information stays under your control.</strong><span>LOC V2 starts with a local guest session. Persistent storage will only be available through a clear opt-in.</span></div>
        <Link to="/privacy" aria-label="View privacy settings"><ArrowUpRight size={18}/></Link>
      </section>
      <div className="dashboard-note"><ShieldCheck size={14}/> LOC provides screening and navigation support, not a medical diagnosis or treatment recommendation.</div>
    </div>
  );
}

function ActivityIcon() {
  return <HeartPulse size={14}/>;
}
