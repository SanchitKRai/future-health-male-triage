import { useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowUpRight, Beaker, BriefcaseBusiness, CalendarDays,
  ClipboardList, FilePlus2, HeartPulse, ListFilter, ShieldCheck, Trash2,
} from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import SectionHeading from "../components/ui/SectionHeading";
import RecordComposer from "../components/health/RecordComposer";
import { useLocStore } from "../store/useLocStore";
import type { HealthRecord, HealthRecordCategory, LabResultRecord, VitalRecord } from "../types/health-records";

type FilterKind = "all" | HealthRecordCategory;
interface TrendPoint { date: string; value: number; label: string; }
interface TrendMetric { key: string; label: string; unit: string; points: TrendPoint[]; }

function recordDate(record: HealthRecord): string {
  if (record.category === "lab") return record.collectedOn;
  if (record.category === "lifestyle") return record.periodEnd;
  return record.recordedAt.slice(0, 10);
}

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function vitalLabel(record: VitalRecord): string {
  const labels: Record<VitalRecord["measurement"]["type"], string> = {
    weight: "Weight", height: "Height", "systolic-blood-pressure": "Systolic blood pressure",
    "diastolic-blood-pressure": "Diastolic blood pressure", "resting-heart-rate": "Resting heart rate",
  };
  return labels[record.measurement.type];
}

function recordTitle(record: HealthRecord): string {
  if (record.category === "lab") return record.testName;
  if (record.category === "vital") return vitalLabel(record);
  if (record.category === "lifestyle") return "Lifestyle check-in";
  return `Work exposure · ${record.exposureType.replace("-", " ")}`;
}

function recordValue(record: HealthRecord): string {
  if (record.category === "lab") {
    return record.value.kind === "numeric" ? `${record.value.value} ${record.value.unit}` : record.value.value;
  }
  if (record.category === "vital") return `${record.measurement.value} ${record.measurement.unit}`;
  if (record.category === "lifestyle") {
    const details = [
      record.sleepHoursAverage !== undefined ? `${record.sleepHoursAverage} h avg sleep` : null,
      record.activityMinutesPerWeek !== undefined ? `${record.activityMinutesPerWeek} min activity/week` : null,
      record.tobaccoUse ? `Tobacco: ${record.tobaccoUse.replaceAll("-", " ")}` : null,
      record.alcoholPattern ? `Alcohol: ${record.alcoholPattern}` : null,
      record.stressSelfRating !== undefined ? `Self-rated stress: ${record.stressSelfRating}/5` : null,
    ].filter(Boolean);
    return details.length ? details.join(" · ") : "No optional values recorded";
  }
  return `${record.frequency} · ${record.durationMonths !== undefined ? `${record.durationMonths} months` : "duration not recorded"} · PPE: ${record.protectiveEquipmentUsed ?? "not recorded"}`;
}

function categoryLabel(category: HealthRecordCategory): string {
  return { lab: "Laboratory", vital: "Vital", lifestyle: "Lifestyle", exposure: "Work exposure" }[category];
}

function categoryIcon(category: HealthRecordCategory) {
  return { lab: Beaker, vital: Activity, lifestyle: ClipboardList, exposure: BriefcaseBusiness }[category];
}

function buildTrendMetrics(records: HealthRecord[]): TrendMetric[] {
  const groups = new Map<string, TrendMetric>();
  for (const record of records) {
    let key: string; let label: string; let unit: string; let value: number; let date: string;
    if (record.category === "lab" && record.value.kind === "numeric") {
      key = `lab:${record.testName.toLocaleLowerCase()}:${record.value.unit}`;
      label = record.testName; unit = record.value.unit; value = record.value.value; date = record.collectedOn;
    } else if (record.category === "vital") {
      key = `vital:${record.measurement.type}:${record.measurement.unit}`;
      label = vitalLabel(record); unit = record.measurement.unit; value = record.measurement.value; date = record.recordedAt.slice(0, 10);
    } else continue;
    const group = groups.get(key) ?? { key, label, unit, points: [] };
    group.points.push({ date, value, label: formatDate(date) });
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((metric) => ({ ...metric, points: metric.points.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function downloadRecords(records: HealthRecord[]) {
  const payload = {
    exportedAt: new Date().toISOString(),
    purpose: "User-requested export of LOC session records. Not a clinical report.",
    records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "loc-health-timeline.json"; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function HealthTimeline() {
  const records = useLocStore((state) => state.records);
  const addRecord = useLocStore((state) => state.addRecord);
  const deleteRecord = useLocStore((state) => state.deleteRecord);
  const [showComposer, setShowComposer] = useState(false);
  const [filter, setFilter] = useState<FilterKind>("all");
  const metrics = useMemo(() => buildTrendMetrics(records), [records]);
  const [selectedMetric, setSelectedMetric] = useState("");
  const activeMetric = metrics.find((metric) => metric.key === selectedMetric) ?? metrics[0];
  const filteredRecords = records
    .filter((record) => filter === "all" || record.category === filter)
    .slice()
    .sort((a, b) => recordDate(b).localeCompare(recordDate(a)) || b.recordedAt.localeCompare(a.recordedAt));
  const labCount = records.filter((record) => record.category === "lab").length;
  const vitalCount = records.filter((record) => record.category === "vital").length;
  const contextCount = records.filter((record) => record.category === "lifestyle" || record.category === "exposure").length;

  function removeRecord(record: HealthRecord) {
    if (!window.confirm(`Remove this ${categoryLabel(record.category).toLowerCase()} record from the current session?`)) return;
    deleteRecord(record.id);
    if (record.category === "lab" || record.category === "vital") {
      // The selected trend is derived from records; it will fall back if this metric no longer exists.
    }
  }

  return (
    <div className="subpage health-timeline-page">
      <SectionHeading eyebrow="YOUR HEALTH HISTORY" title="Your health, over time."
        description="Bring your own measurements and health notes together in one private timeline. You control what gets added."
        action={<span className="secure-chip"><ShieldCheck size={14}/> Session only</span>} />

      <section className="timeline-intro-strip">
        <div className="timeline-intro-icon"><HeartPulse size={21}/></div>
        <div><strong>A personal record, not a diagnosis.</strong><span>LOC displays information you enter. It does not decide whether a result is healthy, abnormal or caused by a condition.</span></div>
      </section>

      <div className="timeline-stat-grid">
        <TimelineStat label="Total records" value={records.length} detail="In this browser session" icon={ClipboardList}/>
        <TimelineStat label="Lab results" value={labCount} detail="Manually entered" icon={Beaker}/>
        <TimelineStat label="Vital measurements" value={vitalCount} detail="Dated measurements" icon={Activity}/>
        <TimelineStat label="Lifestyle & exposure" value={contextCount} detail="Self-reported context" icon={BriefcaseBusiness}/>
      </div>

      <div className="timeline-toolbar">
        <div><div className="eyebrow">YOUR RECORDS</div><h2>Health timeline</h2><p>{records.length ? `${records.length} record${records.length === 1 ? "" : "s"} currently held in this session.` : "Your timeline is ready when you are."}</p></div>
        <div className="timeline-toolbar-actions">
          {records.length > 0 && <button className="button button-secondary" onClick={() => downloadRecords(records)}><ArrowDownToLine size={15}/> Export records</button>}
          <button className="button button-primary" onClick={() => setShowComposer((value) => !value)}><FilePlus2 size={16}/>{showComposer ? "Close form" : "Add a record"}</button>
        </div>
      </div>

      {showComposer && <RecordComposer onAdd={(record) => { addRecord(record); setShowComposer(false); }} onCancel={() => setShowComposer(false)}/ >}

      {metrics.length > 0 && (
        <section className="timeline-panel trend-chart-panel">
          <div className="timeline-panel-heading"><div><div className="eyebrow">REPEATED MEASUREMENTS</div><h3>View a trend</h3><p>Only matching measurement names and units are shown together. A line is displayed only when there are at least two dated readings.</p></div>
            <label className="trend-select-wrap"><span>Measurement</span><select className="screen-input" aria-label="Choose a measurement trend" value={activeMetric?.key ?? ""} onChange={(event) => setSelectedMetric(event.target.value)}>{metrics.map((metric) => <option key={metric.key} value={metric.key}>{metric.label} · {metric.unit}</option>)}</select></label>
          </div>
          {activeMetric && activeMetric.points.length >= 2 ? (
            <div className="timeline-chart-wrap">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={activeMetric.points} margin={{ top: 10, right: 18, bottom: 5, left: 0 }}>
                  <CartesianGrid stroke="#edf0e9" strokeDasharray="3 3"/>
                  <XAxis dataKey="label" tick={{ fill: "#7d897f", fontSize: 10 }} axisLine={{ stroke: "#e5eae2" }} tickLine={false}/>
                  <YAxis tick={{ fill: "#7d897f", fontSize: 10 }} axisLine={false} tickLine={false} width={46}/>
                  <Tooltip formatter={(value) => [`${value} ${activeMetric.unit}`, activeMetric.label]} contentStyle={{ border: "1px solid #e3e9e0", borderRadius: 8, fontSize: 11 }}/>
                  <Line type="monotone" dataKey="value" stroke="#5f8963" strokeWidth={2.5} dot={{ r: 4, fill: "#5f8963", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }}/>
                </LineChart>
              </ResponsiveContainer>
              <div className="chart-unit-note">Recorded values · {activeMetric.unit} · not clinically interpreted</div>
            </div>
          ) : (
            <div className="trend-single-point"><Activity size={19}/><div><strong>One reading recorded</strong><span>Add another {activeMetric?.label.toLowerCase()} reading with the same unit to see a trend. LOC will display the values without classifying them.</span></div></div>
          )}
        </section>
      )}

      <section className="timeline-panel records-panel">
        <div className="records-panel-top">
          <div><div className="eyebrow">SESSION HISTORY</div><h3>All health records</h3></div>
          <div className="timeline-filter-label"><ListFilter size={14}/><span>Filter</span></div>
        </div>
        <div className="timeline-filter-tabs" role="group" aria-label="Filter health records">
          {([{ id: "all", label: "All" }, { id: "lab", label: "Laboratory" }, { id: "vital", label: "Vitals" }, { id: "lifestyle", label: "Lifestyle" }, { id: "exposure", label: "Work exposure" }] as const).map((option) => <button key={option.id} className={`timeline-filter-tab ${filter === option.id ? "timeline-filter-active" : ""}`} onClick={() => setFilter(option.id)}>{option.label}</button>)}
        </div>
        {filteredRecords.length === 0 ? (
          <div className="timeline-empty-state"><div className="timeline-empty-icon"><CalendarDays size={24}/></div><h3>{records.length === 0 ? "Your timeline starts here" : "No records in this filter"}</h3><p>{records.length === 0 ? "Add a lab result, vital measurement, lifestyle check-in or workplace exposure note. Records stay in memory for this session only." : "Choose another category or add a new record."}</p>{records.length === 0 && <button className="button button-primary" onClick={() => setShowComposer(true)}><FilePlus2 size={15}/> Add your first record</button>}</div>
        ) : (
          <div className="timeline-record-list">
            {filteredRecords.map((record) => {
              const Icon = categoryIcon(record.category);
              const dateLabel = record.category === "lifestyle" ? `${formatDate(record.periodStart)} – ${formatDate(record.periodEnd)}` : formatDate(recordDate(record));
              return (
                <article className="timeline-record" key={record.id}>
                  <div className={`timeline-record-icon timeline-record-${record.category}`}><Icon size={18}/></div>
                  <div className="timeline-record-main"><div className="timeline-record-meta"><span>{categoryLabel(record.category)}</span><span>·</span><span>{dateLabel}</span></div><h4>{recordTitle(record)}</h4><p>{recordValue(record)}</p>
                    {record.category === "lab" && record.value.kind === "numeric" && record.referenceInterval && <div className="record-reference-display">Reference interval as reported: {record.referenceInterval.low ?? "—"} to {record.referenceInterval.high ?? "—"} {record.referenceInterval.unit}</div>}
                    {record.category === "lab" && record.laboratoryName && <div className="record-reference-display">Source: {record.laboratoryName}</div>}
                  </div>
                  <button className="timeline-delete-button" aria-label={`Delete ${recordTitle(record)}`} onClick={() => removeRecord(record)}><Trash2 size={15}/></button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="timeline-storage-note"><ShieldCheck size={15}/><span><strong>Local session only.</strong> These records live in application memory and may be cleared when you refresh or close the app. They are not uploaded or persistently saved in this milestone.</span></div>
      <div className="timeline-disclaimer">LOC is screening and care-navigation support. A timeline entry is not a diagnosis, reference ranges can vary between laboratories, and a clinician should interpret results in context.</div>
    </div>
  );
}

function TimelineStat({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: typeof Activity }) {
  return <article className="timeline-stat-card"><div className="timeline-stat-top"><span>{label}</span><span><Icon size={17}/></span></div><strong>{value.toString().padStart(2, "0")}</strong><small>{detail}</small></article>;
}
