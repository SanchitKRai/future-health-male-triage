import { FormEvent, useMemo, useState } from "react";
import { Activity, Beaker, BriefcaseBusiness, CalendarDays, Check, ClipboardList, X } from "lucide-react";
import type {
  HealthRecord, LabResultRecord, LifestyleCheckIn, OccupationalExposureRecord, VitalRecord,
} from "../types/health-records";
import {
  validateExposureRecord, validateLabResult, validateLifestyleCheckIn, validateVitalRecord,
} from "../utils/health-record-validation";

type RecordKind = "lab" | "vital" | "lifestyle" | "exposure";
type ResultKind = "numeric" | "text";
type VitalKind = "weight" | "height" | "systolic-blood-pressure" | "diastolic-blood-pressure" | "resting-heart-rate";

function localDateValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function dateAsTimestamp(value: string): string {
  return `${value}T12:00:00.000Z`;
}

interface Props { onAdd: (record: HealthRecord) => void; onCancel: () => void; }

export default function RecordComposer({ onAdd, onCancel }: Props) {
  const today = useMemo(localDateValue, []);
  const [kind, setKind] = useState<RecordKind>("lab");
  const [errors, setErrors] = useState<string[]>([]);

  // Laboratory fields
  const [testName, setTestName] = useState("");
  const [resultKind, setResultKind] = useState<ResultKind>("numeric");
  const [labValue, setLabValue] = useState("");
  const [labUnit, setLabUnit] = useState("");
  const [collectedOn, setCollectedOn] = useState(today);
  const [laboratoryName, setLaboratoryName] = useState("");
  const [hasReference, setHasReference] = useState(false);
  const [referenceLow, setReferenceLow] = useState("");
  const [referenceHigh, setReferenceHigh] = useState("");

  // Vital fields
  const [vitalType, setVitalType] = useState<VitalKind>("weight");
  const [vitalValue, setVitalValue] = useState("");
  const [vitalUnit, setVitalUnit] = useState<"kg" | "lb" | "cm" | "in">("kg");
  const [vitalDate, setVitalDate] = useState(today);

  // Lifestyle fields
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [sleepHours, setSleepHours] = useState("");
  const [activityMinutes, setActivityMinutes] = useState("");
  const [tobaccoUse, setTobaccoUse] = useState<LifestyleCheckIn["tobaccoUse"] | "">("");
  const [alcoholPattern, setAlcoholPattern] = useState<LifestyleCheckIn["alcoholPattern"] | "">("");
  const [stress, setStress] = useState("");

  // Occupational exposure fields
  const [exposureType, setExposureType] = useState<OccupationalExposureRecord["exposureType"]>("heat");
  const [frequency, setFrequency] = useState<OccupationalExposureRecord["frequency"]>("unknown");
  const [durationMonths, setDurationMonths] = useState("");
  const [protectiveEquipment, setProtectiveEquipment] = useState<NonNullable<OccupationalExposureRecord["protectiveEquipmentUsed"]>>("unknown");

  function selectKind(next: RecordKind) {
    setKind(next); setErrors([]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setErrors([]);
    const metadata = { id: crypto.randomUUID(), recordedAt: dateAsTimestamp(today), source: "manual" as const };
    let record: HealthRecord;
    let validation;

    if (kind === "lab") {
      const numericValue = resultKind === "numeric" ? Number(labValue) : null;
      const reference = hasReference && resultKind === "numeric" ? {
        ...(referenceLow.trim() ? { low: Number(referenceLow) } : {}),
        ...(referenceHigh.trim() ? { high: Number(referenceHigh) } : {}),
        unit: labUnit.trim(), source: "laboratory-report" as const,
      } : undefined;
      const labRecord: LabResultRecord = {
        ...metadata, category: "lab", testName: testName.trim(), collectedOn,
        ...(laboratoryName.trim() ? { laboratoryName: laboratoryName.trim() } : {}),
        value: resultKind === "numeric"
          ? { kind: "numeric", value: numericValue as number, unit: labUnit.trim() }
          : { kind: "text", value: labValue.trim() },
        ...(reference ? { referenceInterval: reference } : {}),
      };
      record = labRecord; validation = validateLabResult(labRecord);
      if (hasReference && !referenceLow.trim() && !referenceHigh.trim()) {
        validation.errors.push("Enter at least one reference interval boundary from the laboratory report."); validation.valid = false;
      }
    } else if (kind === "vital") {
      const value = Number(vitalValue);
      const measurement = vitalType === "weight" || vitalType === "height"
        ? { type: vitalType, value, unit: vitalUnit } as const
        : vitalType === "systolic-blood-pressure" || vitalType === "diastolic-blood-pressure"
          ? { type: vitalType, value, unit: "mmHg" as const }
          : { type: "resting-heart-rate" as const, value, unit: "bpm" as const };
      const vitalRecord: VitalRecord = { ...metadata, recordedAt: dateAsTimestamp(vitalDate), category: "vital", measurement };
      record = vitalRecord; validation = validateVitalRecord(vitalRecord);
    } else if (kind === "lifestyle") {
      const lifestyleRecord: LifestyleCheckIn = {
        ...metadata, category: "lifestyle", periodStart, periodEnd,
        ...(sleepHours.trim() ? { sleepHoursAverage: Number(sleepHours) } : {}),
        ...(activityMinutes.trim() ? { activityMinutesPerWeek: Number(activityMinutes) } : {}),
        ...(tobaccoUse ? { tobaccoUse } : {}),
        ...(alcoholPattern ? { alcoholPattern } : {}),
        ...(stress ? { stressSelfRating: Number(stress) as 1 | 2 | 3 | 4 | 5 } : {}),
      };
      record = lifestyleRecord; validation = validateLifestyleCheckIn(lifestyleRecord);
    } else {
      const exposureRecord: OccupationalExposureRecord = {
        ...metadata, category: "exposure", exposureType, frequency,
        ...(durationMonths.trim() ? { durationMonths: Number(durationMonths) } : {}),
        protectiveEquipmentUsed: protectiveEquipment,
      };
      record = exposureRecord; validation = validateExposureRecord(exposureRecord);
    }

    if (!validation.valid) { setErrors(validation.errors); return; }
    onAdd(record);
    onCancel();
  }

  const typeOptions: { id: RecordKind; label: string; icon: typeof Beaker }[] = [
    { id: "lab", label: "Lab result", icon: Beaker },
    { id: "vital", label: "Vital", icon: Activity },
    { id: "lifestyle", label: "Lifestyle", icon: ClipboardList },
    { id: "exposure", label: "Work exposure", icon: BriefcaseBusiness },
  ];

  return (
    <section className="record-composer" aria-labelledby="record-composer-title">
      <div className="record-composer-top">
        <div><div className="eyebrow">ADD TO YOUR PRIVATE TIMELINE</div><h2 id="record-composer-title">Add a health record</h2><p>Enter information as it appears in your report or your own notes. LOC will not interpret it as a diagnosis.</p></div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Close record form"><X size={18}/></button>
      </div>
      <div className="record-kind-tabs" role="tablist" aria-label="Record type">
        {typeOptions.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={kind === id} className={`record-kind-tab ${kind === id ? "record-kind-tab-active" : ""}`} onClick={() => selectKind(id)}><Icon size={16}/><span>{label}</span></button>
        ))}
      </div>
      <form onSubmit={submit} className="record-form">
        {kind === "lab" && (
          <>
            <div className="record-form-grid">
              <div className="record-field record-field-wide"><label htmlFor="lab-test-name">Test name</label><input id="lab-test-name" className="screen-input" value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g. HbA1c, Total cholesterol" required maxLength={100}/></div>
              <div className="record-field"><label htmlFor="lab-result-type">Result format</label><select id="lab-result-type" className="screen-input" value={resultKind} onChange={(e) => { setResultKind(e.target.value as ResultKind); setHasReference(false); }}><option value="numeric">Numeric value</option><option value="text">Text result</option></select></div>
              <div className="record-field"><label htmlFor="lab-collected">Collection date</label><input id="lab-collected" className="screen-input" type="date" value={collectedOn} onChange={(e) => setCollectedOn(e.target.value)} required max={today}/></div>
              <div className="record-field"><label htmlFor="lab-result">Result</label><input id="lab-result" className="screen-input" type={resultKind === "numeric" ? "number" : "text"} step="any" value={labValue} onChange={(e) => setLabValue(e.target.value)} placeholder={resultKind === "numeric" ? "Enter reported value" : "Enter reported text"} required/></div>
              {resultKind === "numeric" && <div className="record-field"><label htmlFor="lab-unit">Unit</label><input id="lab-unit" className="screen-input" value={labUnit} onChange={(e) => setLabUnit(e.target.value)} placeholder="e.g. mmol/L, %" required maxLength={30}/></div>}
              <div className="record-field record-field-wide"><label htmlFor="lab-name">Laboratory / source <span>(optional)</span></label><input id="lab-name" className="screen-input" value={laboratoryName} onChange={(e) => setLaboratoryName(e.target.value)} placeholder="Name printed on the report" maxLength={100}/></div>
            </div>
            {resultKind === "numeric" && <div className="record-reference-box"><label className="record-checkbox-row"><input type="checkbox" checked={hasReference} onChange={(e) => setHasReference(e.target.checked)}/><span>Enter reference interval shown on my laboratory report</span></label>{hasReference && <div className="record-form-grid record-reference-grid"><div className="record-field"><label htmlFor="reference-low">Lower bound <span>(optional)</span></label><input id="reference-low" type="number" step="any" className="screen-input" value={referenceLow} onChange={(e) => setReferenceLow(e.target.value)} placeholder="Lower value"/></div><div className="record-field"><label htmlFor="reference-high">Upper bound <span>(optional)</span></label><input id="reference-high" type="number" step="any" className="screen-input" value={referenceHigh} onChange={(e) => setReferenceHigh(e.target.value)} placeholder="Upper value"/></div><p className="record-field-help">These values are copied as entered. LOC will not decide whether your result is normal or abnormal.</p></div>}</div>}
            <p className="record-field-help"><CalendarDays size={13}/> Use the exact test name, result and unit from the report. Different laboratories may use different methods or reference intervals.</p>
          </>
        )}

        {kind === "vital" && (
          <div className="record-form-grid">
            <div className="record-field"><label htmlFor="vital-type">Measurement</label><select id="vital-type" className="screen-input" value={vitalType} onChange={(e) => { const next = e.target.value as VitalKind; setVitalType(next); if (next === "weight") setVitalUnit("kg"); if (next === "height") setVitalUnit("cm"); }}><option value="weight">Weight</option><option value="height">Height</option><option value="systolic-blood-pressure">Systolic blood pressure</option><option value="diastolic-blood-pressure">Diastolic blood pressure</option><option value="resting-heart-rate">Resting heart rate</option></select></div>
            <div className="record-field"><label htmlFor="vital-value">Value</label><input id="vital-value" className="screen-input" type="number" min="0" step="any" value={vitalValue} onChange={(e) => setVitalValue(e.target.value)} placeholder="Enter measurement" required/></div>
            <div className="record-field"><label htmlFor="vital-date">Measurement date</label><input id="vital-date" className="screen-input" type="date" max={today} value={vitalDate} onChange={(e) => setVitalDate(e.target.value)} required/></div>
            {(vitalType === "weight" || vitalType === "height") ? <div className="record-field"><label htmlFor="vital-unit">Unit</label><select id="vital-unit" className="screen-input" value={vitalUnit} onChange={(e) => setVitalUnit(e.target.value as "kg" | "lb" | "cm" | "in")}>{vitalType === "weight" ? <><option value="kg">kg</option><option value="lb">lb</option></> : <><option value="cm">cm</option><option value="in">in</option></>}</select></div> : <div className="record-field"><label>Unit</label><div className="record-unit-static">{vitalType === "resting-heart-rate" ? "bpm" : "mmHg"}</div></div>}
            <p className="record-field-help record-field-wide">Each measurement is stored separately with its unit and date. LOC does not classify the measurement.</p>
          </div>
        )}

        {kind === "lifestyle" && (
          <div className="record-form-grid">
            <div className="record-field"><label htmlFor="period-start">Period start</label><input id="period-start" type="date" className="screen-input" value={periodStart} max={today} onChange={(e) => setPeriodStart(e.target.value)} required/></div>
            <div className="record-field"><label htmlFor="period-end">Period end</label><input id="period-end" type="date" className="screen-input" value={periodEnd} max={today} onChange={(e) => setPeriodEnd(e.target.value)} required/></div>
            <div className="record-field"><label htmlFor="sleep-average">Average sleep <span>(hours/night, optional)</span></label><input id="sleep-average" type="number" className="screen-input" min="0" max="24" step="0.1" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="e.g. 7.5"/></div>
            <div className="record-field"><label htmlFor="activity-minutes">Activity <span>(minutes/week, optional)</span></label><input id="activity-minutes" type="number" className="screen-input" min="0" step="1" value={activityMinutes} onChange={(e) => setActivityMinutes(e.target.value)} placeholder="e.g. 150"/></div>
            <div className="record-field"><label htmlFor="tobacco-use">Tobacco / vaping</label><select id="tobacco-use" className="screen-input" value={tobaccoUse} onChange={(e) => setTobaccoUse(e.target.value as typeof tobaccoUse)}><option value="">Not recorded</option><option value="never">Never</option><option value="former">Former</option><option value="current">Current</option><option value="prefer-not-to-say">Prefer not to say</option></select></div>
            <div className="record-field"><label htmlFor="alcohol-pattern">Alcohol pattern</label><select id="alcohol-pattern" className="screen-input" value={alcoholPattern} onChange={(e) => setAlcoholPattern(e.target.value as typeof alcoholPattern)}><option value="">Not recorded</option><option value="none">None</option><option value="occasional">Occasional</option><option value="regular">Regular</option><option value="prefer-not-to-say">Prefer not to say</option></select></div>
            <div className="record-field"><label htmlFor="stress-rating">Self-rated stress <span>(optional)</span></label><select id="stress-rating" className="screen-input" value={stress} onChange={(e) => setStress(e.target.value)}><option value="">Not recorded</option><option value="1">1 — Very low</option><option value="2">2 — Low</option><option value="3">3 — Moderate</option><option value="4">4 — High</option><option value="5">5 — Very high</option></select></div>
            <p className="record-field-help record-field-wide">Lifestyle information is self-reported context. LOC will not infer a medical condition from it.</p>
          </div>
        )}

        {kind === "exposure" && (
          <div className="record-form-grid">
            <div className="record-field"><label htmlFor="exposure-type">Exposure type</label><select id="exposure-type" className="screen-input" value={exposureType} onChange={(e) => setExposureType(e.target.value as typeof exposureType)}><option value="heat">Heat</option><option value="chemicals">Industrial chemicals</option><option value="pesticides">Pesticides</option><option value="heavy-metals">Heavy metals</option><option value="radiation">Radiation</option><option value="other">Other</option></select></div>
            <div className="record-field"><label htmlFor="exposure-frequency">How often?</label><select id="exposure-frequency" className="screen-input" value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)}><option value="unknown">Not sure</option><option value="occasional">Occasionally</option><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="daily">Daily</option></select></div>
            <div className="record-field"><label htmlFor="exposure-duration">Approx. duration <span>(months, optional)</span></label><input id="exposure-duration" type="number" min="0" step="1" className="screen-input" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} placeholder="e.g. 12"/></div>
            <div className="record-field"><label htmlFor="protective-equipment">Protective equipment used</label><select id="protective-equipment" className="screen-input" value={protectiveEquipment} onChange={(e) => setProtectiveEquipment(e.target.value as typeof protectiveEquipment)}><option value="unknown">Not sure / not recorded</option><option value="always">Always</option><option value="sometimes">Sometimes</option><option value="never">Never</option></select></div>
            <p className="record-field-help record-field-wide">No employer name or workplace identifier is requested. This is a self-reported history record, not an exposure assessment.</p>
          </div>
        )}

        {errors.length > 0 && <div className="record-errors" role="alert"><strong>Please check these fields:</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
        <div className="record-form-actions"><button className="button button-secondary" type="button" onClick={onCancel}>Cancel</button><button className="button button-primary" type="submit">Add record <Check size={15}/></button></div>
      </form>
    </section>
  );
}
