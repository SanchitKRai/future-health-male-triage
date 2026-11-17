import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CircleAlert, Clock3, Download,
  LockKeyhole, ShieldAlert, ShieldCheck, Sparkles
} from "lucide-react";
import SectionHeading from "../components/ui/SectionHeading";
import { submitScreening, ScreeningApiError } from "../services/screeningApi";
import type {
  BooleanQuestionKey, ScreeningAnswer, ScreeningAnswers, ScreeningConsent,
  ScreeningResult, ScreeningSubmissionPayload
} from "../types/screening";

type Step = "consent" | "urgent" | "about" | "history" | "lifestyle" | "review" | "result";
type TryingChoice = "now" | "within_year" | "not_planning" | "prefer_not" | "";
type AlcoholChoice = "none" | "occasional" | "regular" | "heavy" | "prefer_not" | "";

interface ProfileState {
  age: string;
  trying: TryingChoice;
  monthsTrying: string;
  partner35Plus: ScreeningAnswer | undefined;
  heightCm: string;
  weightKg: string;
  alcohol: AlcoholChoice;
  medications: string[];
}

interface Question { key: BooleanQuestionKey; prompt: string; helper?: string; }
interface QuestionGroup { title: string; description: string; questions: Question[]; }

const URGENT_GROUP: QuestionGroup = {
  title: "Symptoms that should not wait",
  description: "Please answer about symptoms you have right now. A sudden or severe symptom may need in-person care immediately.",
  questions: [
    { key: "d1_sudden_severe_pain", prompt: "Sudden, severe pain in one or both testicles that started within the last day" },
    { key: "d2_sudden_swelling", prompt: "Sudden swelling, redness or warmth of the scrotum" },
    { key: "d3_fever_with_pain_swelling", prompt: "Fever together with testicular pain or swelling" },
    { key: "d4_prolonged_erection", prompt: "A painful erection lasting more than 4 hours" },
    { key: "d8_recent_groin_injury_swelling", prompt: "A recent injury to the groin, with swelling" },
    { key: "d5_lump_or_size_change", prompt: "A new lump, hardness or change in size of a testicle" },
    { key: "d6_blood_in_semen_or_persistent_ache", prompt: "Blood in semen, or ongoing pain or heaviness in the scrotum for more than 2 weeks" },
  ],
};

const HISTORY_GROUPS: QuestionGroup[] = [
  {
    title: "Your medical history",
    description: "Share only what you are comfortable sharing. These questions help organise the context you may want to discuss with a clinician.",
    questions: [
      { key: "b1_abnormal_semen_test", prompt: "Have you ever been told a semen test result was abnormal?" },
      { key: "b2_undescended_testis", prompt: "Was one or both testes undescended in childhood (needed treatment or surgery)?" },
      { key: "b3_mumps_orchitis", prompt: "Have you ever had mumps with testicular pain or swelling?" },
      { key: "b4_testis_groin_surgery_injury", prompt: "Have you had surgery, torsion or a serious injury involving the testes, groin or pelvis?" },
      { key: "b5_varicocele", prompt: "Have you been told you have a varicocele (enlarged veins in the scrotum)?" },
      { key: "b6_cancer_treatment", prompt: "Have you had chemotherapy, radiotherapy or other cancer treatment?" },
      { key: "b7_genetic_condition", prompt: "Have you been told you have a genetic or chromosomal condition that affects fertility?" },
      { key: "b8_untreated_infection", prompt: "Have you had a sexually transmitted infection, or a genital or urinary infection that was not fully treated?" },
    ],
  },
];

const LIFESTYLE_GROUPS: QuestionGroup[] = [
  {
    title: "Health and lifestyle",
    description: "These are optional context questions. Do not change or stop prescribed medicines because of anything shown here.",
    questions: [
      { key: "c2_diabetes_metabolic", prompt: "Do you have diabetes or another metabolic condition?" },
      { key: "c3_tobacco", prompt: "Do you smoke or use tobacco or vaping products?" },
      { key: "c5_testosterone_steroids", prompt: "Have you used testosterone, anabolic steroids or muscle-building supplements?" },
      { key: "c6_recreational_drugs", prompt: "Do you regularly use recreational drugs?" },
      { key: "c7_heat_exposure", prompt: "Do you have regular heat exposure around the groin?", helper: "For example, long hot baths or saunas, a laptop on your lap, or a hot work environment." },
      { key: "c8_work_chemicals", prompt: "Do you have work exposure to chemicals, pesticides, heavy metals or radiation?" },
      { key: "c9_recent_fever_illness", prompt: "Have you had a high fever or serious illness in the last 3 months?" },
      { key: "d7_sexual_function_issue", prompt: "Have you had difficulty getting or keeping an erection, low desire, or trouble with ejaculation?" },
    ],
  },
];

const EMERGENCY_FIELDS: BooleanQuestionKey[] = [
  "d1_sudden_severe_pain", "d2_sudden_swelling", "d3_fever_with_pain_swelling",
  "d4_prolonged_erection", "d8_recent_groin_injury_swelling",
];
const PROMPT_FIELDS: BooleanQuestionKey[] = ["d5_lump_or_size_change", "d6_blood_in_semen_or_persistent_ache"];

const MEDICATIONS = [
  "Finasteride or dutasteride",
  "Sulfasalazine",
  "Methotrexate",
  "Opioid painkillers",
  "Long-term antidepressants (SSRIs)",
  "Alpha-blockers (for prostate or blood pressure)",
];
const MEDICATION_NONE = "None of these";
const MEDICATION_SKIP = "Prefer not to say";
const MEDICATION_OPTIONS = [...MEDICATIONS, MEDICATION_NONE, MEDICATION_SKIP];

const OUTCOMES: Record<string, { title: string; timeframe: string; explanation: string; steps: string[] }> = {
  urgent_emergency: {
    title: "Get urgent medical care now",
    timeframe: "Today, without waiting",
    explanation: "Sudden severe pain, swelling or a prolonged painful erection can need emergency assessment. Do not wait for an online booking or a call back.",
    steps: ["Go to the nearest emergency department or contact your local emergency service.", "Tell the care team exactly when the symptoms started."],
  },
  urgent_assessment: {
    title: "Arrange an in-person assessment soon",
    timeframe: "Within the next few days",
    explanation: "A new lump, blood in semen or an ache that lasts more than two weeks should be examined promptly. This screening result does not identify the cause.",
    steps: ["Arrange an appointment with a urologist or a primary care doctor who can refer you promptly.", "If symptoms become sudden or severe, seek emergency care instead."],
  },
  andrology_urology: {
    title: "Arrange a men’s health specialist visit",
    timeframe: "In the next few weeks",
    explanation: "Your answers include factors that the existing screening protocol routes to andrology or urology. This is not a diagnosis.",
    steps: ["Ask about an andrology or urology appointment.", "Bring any previous test results and a current medicine list, if available."],
  },
  fertility_services: {
    title: "Discuss a fertility assessment",
    timeframe: "In the next few weeks",
    explanation: "Based on the trying-to-conceive timing you reported, the existing protocol suggests discussing an assessment with a qualified clinician.",
    steps: ["Arrange a discussion with a fertility service or a clinician who can advise on assessment.", "A clinician can explain which tests, if any, are appropriate."],
  },
  primary_care: {
    title: "Arrange a primary care check-up",
    timeframe: "In the next month or so",
    explanation: "Your answers point to topics that the existing screening protocol routes to a routine primary care review. This is not a diagnosis.",
    steps: ["Arrange a general check-up and mention the concerns you entered.", "Ask the clinician whether a metabolic, infection or medicine review is relevant."],
  },
  self_care: {
    title: "No additional visit is suggested by this screening protocol right now",
    timeframe: "Review sooner if anything changes",
    explanation: "Your answers did not trigger a clinic pathway in the current rules. This does not rule out a health problem or replace routine preventive care.",
    steps: ["Keep up with routine preventive care.", "Seek care if new symptoms appear or a concern persists."],
  },
};

const INITIAL_PROFILE: ProfileState = {
  age: "", trying: "", monthsTrying: "", partner35Plus: undefined,
  heightCm: "", weightKg: "", alcohol: "", medications: [],
};
const INITIAL_CONSENT: ScreeningConsent = {
  adult_confirmed: false, screening_acknowledged: false, session_processing_consent: false,
};

function QuestionCard({ question, value, onChange }: {
  question: Question; value: ScreeningAnswer | undefined; onChange: (next: ScreeningAnswer) => void;
}) {
  const options: { label: string; value: ScreeningAnswer }[] = [
    { label: "Yes", value: true }, { label: "No", value: false }, { label: "Prefer not to say", value: null },
  ];
  return (
    <fieldset className="screen-question">
      <legend>{question.prompt}</legend>
      {question.helper && <p className="screen-question-help">{question.helper}</p>}
      <div className="screen-choice-row">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label key={option.label} className={`screen-choice ${selected ? "screen-choice-selected" : ""}`}>
              <input type="radio" name={question.key} checked={selected} onChange={() => onChange(option.value)} />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      <div className="screen-skip-hint">{value === undefined ? "Not answered — you can leave this blank." : value === null ? "Marked as prefer not to say." : "Answer recorded for this session only."}</div>
    </fieldset>
  );
}

function QuestionGroupView({ group, answers, onAnswer }: {
  group: QuestionGroup; answers: ScreeningAnswers; onAnswer: (key: BooleanQuestionKey, value: ScreeningAnswer) => void;
}) {
  return (
    <section className="screen-group">
      <div className="screen-group-heading"><h2>{group.title}</h2><p>{group.description}</p></div>
      <div className="screen-question-list">
        {group.questions.map((question) => (
          <QuestionCard key={question.key} question={question} value={answers[question.key]} onChange={(value) => onAnswer(question.key, value)} />
        ))}
      </div>
    </section>
  );
}

function displayAnswer(value: ScreeningAnswer | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return value === null ? "Prefer not to say" : "Skipped";
}

export default function Screening() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("consent");
  const [consent, setConsent] = useState<ScreeningConsent>(INITIAL_CONSENT);
  const [profile, setProfile] = useState<ProfileState>(INITIAL_PROFILE);
  const [answers, setAnswers] = useState<ScreeningAnswers>({});
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasEmergencyFlag = EMERGENCY_FIELDS.some((field) => answers[field] === true);
  const hasPromptFlag = PROMPT_FIELDS.some((field) => answers[field] === true);
  const progressSteps: Step[] = ["urgent", "about", "history", "lifestyle", "review"];
  const progressIndex = progressSteps.indexOf(step);
  const progress = step === "result" ? 100 : step === "consent" ? 0 : Math.max(0, ((progressIndex + 1) / progressSteps.length) * 100);

  const profileReady = useMemo(() => {
    const age = Number(profile.age);
    return Number.isInteger(age) && age >= 18 && age <= 90 && consent.adult_confirmed && consent.screening_acknowledged && consent.session_processing_consent;
  }, [profile.age, consent]);

  function setProfileField<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function setAnswer(key: BooleanQuestionKey, value: ScreeningAnswer) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function updateConsent(key: keyof ScreeningConsent, value: boolean) {
    setConsent((current) => ({ ...current, [key]: value }));
  }

  async function evaluateScreening() {
    setLoading(true);
    setError("");
    const payload = {
      consent,
      age: Number(profile.age),
      trying: profile.trying === "prefer_not" || !profile.trying ? null : profile.trying,
      months_trying: profile.trying === "now" && profile.monthsTrying !== "" ? Number(profile.monthsTrying) : null,
      partner_35_plus: profile.trying === "now" ? profile.partner35Plus ?? null : null,
      height_cm: profile.heightCm === "" ? null : Number(profile.heightCm),
      weight_kg: profile.weightKg === "" ? null : Number(profile.weightKg),
      c4_alcohol: profile.alcohol === "" || profile.alcohol === "prefer_not" ? null : profile.alcohol,
      medications: profile.medications,
      ...answers,
    } as ScreeningSubmissionPayload;

    try {
      const response = await submitScreening(payload);
      setResult(response);
      setStep("result");
    } catch (caught) {
      setError(caught instanceof ScreeningApiError ? caught.message : "The screening could not be completed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function resetScreening() {
    setStep("consent"); setConsent(INITIAL_CONSENT); setProfile(INITIAL_PROFILE);
    setAnswers({}); setResult(null); setError(""); setLoading(false);
  }

  function downloadSummary() {
    if (!result) return;
    const outcome = OUTCOMES[result.triage];
    const lines = [
      "LOC — Private screening summary",
      "Screening support only. Not a diagnosis or a substitute for clinical assessment.",
      "",
      `Suggested next step: ${outcome?.title ?? result.triage}`,
      `Timeframe: ${outcome?.timeframe ?? "See the screening result"}`,
      `Rules protocol: ${result.rule}`,
      `Rules band: ${result.band ?? "Not available"}`,
      "",
      "Factors from the existing rules engine:",
      ...(result.top_factors.length ? result.top_factors.map((factor) => `- ${factor.label}`) : ["- No scored factors were returned."]),
      "",
      "This summary was generated locally at the user’s request. It has not been sent to a clinician.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "loc-screening-summary.txt"; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const outcome = result ? OUTCOMES[result.triage] : undefined;
  const isEmergency = result?.triage === "urgent_emergency";

  return (
    <div className="subpage screening-page">
      <SectionHeading eyebrow="YOUR PRIVATE CHECK-IN" title="Health screening"
        description="A guided, self-paced check-in. You choose what to share, and your answers stay in this local session."
        action={<span className="secure-chip"><LockKeyhole size={14}/> Local session only</span>} />

      {step !== "consent" && step !== "result" && (
        <div className="screen-progress-wrap">
          <div className="screen-progress-meta"><span>YOUR CHECK-IN</span><span>{Math.round(progress)}% complete</span></div>
          <div className="screen-progress-track"><span style={{ width: `${progress}%` }} /></div>
          <div className="screen-step-label">Step {progressIndex + 1} of {progressSteps.length}: {({ urgent: "Urgent symptoms", about: "About you", history: "Your history", lifestyle: "Health and lifestyle", review: "Review" } as Record<string, string>)[step]}</div>
        </div>
      )}

      {step === "consent" && (
        <div className="screen-card">
          <div className="screen-card-icon"><ShieldCheck size={23}/></div>
          <div className="eyebrow">PRIVATE SCREENING · ABOUT 5 MINUTES</div>
          <h2>A health check on your terms.</h2>
          <p className="screen-lede">This check-in helps organise relevant symptoms and history, then shows a next step from LOC’s existing screening rules. You can skip any optional question.</p>
          <div className="screen-info-grid">
            <div className="screen-info-item"><ShieldCheck size={17}/><div><strong>Screening, not diagnosis</strong><span>LOC does not diagnose a condition or predict fertility.</span></div></div>
            <div className="screen-info-item"><LockKeyhole size={17}/><div><strong>Local session</strong><span>Answers are sent only to the local service on this device and are not stored by LOC.</span></div></div>
            <div className="screen-info-item"><Clock3 size={17}/><div><strong>Your pace</strong><span>Skip what you prefer not to answer. You can review before submitting.</span></div></div>
          </div>
          <div className="screen-form-section">
            <label className="screen-field-label" htmlFor="screen-age">Your age</label>
            <input id="screen-age" className="screen-input screen-age-input" type="number" min="1" max="90" inputMode="numeric" value={profile.age} onChange={(event) => setProfileField("age", event.target.value)} placeholder="Enter age in years" />
            {profile.age !== "" && Number(profile.age) < 18 && <p className="screen-field-error">This prototype is available only to adults aged 18 or over.</p>}
          </div>
          <div className="screen-consent-list">
            <label className="screen-consent-row"><input type="checkbox" checked={consent.adult_confirmed} onChange={(event) => updateConsent("adult_confirmed", event.target.checked)} /><span>I confirm that I am 18 years or older.</span></label>
            <label className="screen-consent-row"><input type="checkbox" checked={consent.screening_acknowledged} onChange={(event) => updateConsent("screening_acknowledged", event.target.checked)} /><span>I understand this is screening and care-navigation support, not a diagnosis or treatment service.</span></label>
            <label className="screen-consent-row"><input type="checkbox" checked={consent.session_processing_consent} onChange={(event) => updateConsent("session_processing_consent", event.target.checked)} /><span>I consent to my answers being processed by the local service on this device to produce a screening result.</span></label>
          </div>
          <div className="screen-privacy-note"><LockKeyhole size={15}/><span>No account is required. No cloud upload, analytics or automatic saving is used by this screening flow. Do not use a shared or untrusted device for sensitive information.</span></div>
          <div className="screen-actions screen-actions-end">
            <button className="button button-primary" disabled={!profileReady || Number(profile.age) < 18} onClick={() => setStep("urgent")}>Start private check <ArrowRight size={16}/></button>
          </div>
          <p className="screen-clinical-note">If you are experiencing a sudden or severe symptom, seek urgent in-person medical care rather than waiting to complete this questionnaire.</p>
        </div>
      )}

      {step === "urgent" && (
        <div className="screen-card">
          <QuestionGroupView group={URGENT_GROUP} answers={answers} onAnswer={setAnswer}/>
          {hasEmergencyFlag && (
            <div className="screen-alert screen-alert-danger" role="alert"><ShieldAlert size={20}/><div><strong>Do not wait for the rest of this questionnaire.</strong><span>A “Yes” to a sudden severe symptom needs immediate in-person medical attention. Use the button below for the urgent screening pathway, but do not delay seeking care.</span></div></div>
          )}
          {!hasEmergencyFlag && hasPromptFlag && (
            <div className="screen-alert screen-alert-warn" role="status"><CircleAlert size={20}/><div><strong>This should be assessed promptly.</strong><span>A new lump, blood in semen or a persistent ache should be checked in person within the next few days.</span></div></div>
          )}
          {error && <div className="screen-alert screen-alert-danger" role="alert"><CircleAlert size={18}/><div><strong>Unable to complete screening</strong><span>{error}</span></div></div>}
          <div className="screen-actions">
            <button className="button button-secondary" onClick={() => setStep("consent")}><ArrowLeft size={15}/> Back</button>
            {hasEmergencyFlag || hasPromptFlag
              ? <button className="button button-primary" disabled={loading} onClick={evaluateScreening}>{loading ? "Preparing guidance…" : "Get urgent next-step guidance"} <ArrowRight size={16}/></button>
              : <button className="button button-primary" onClick={() => setStep("about")}>Continue <ArrowRight size={16}/></button>}
          </div>
        </div>
      )}

      {step === "about" && (
        <div className="screen-card">
          <div className="screen-group-heading"><h2>About you</h2><p>These details provide context for the existing rules. Height and weight are used only to calculate BMI for this check and are not retained.</p></div>
          <div className="screen-form-section">
            <span className="screen-field-label">Are you, or is anyone you are with, trying to conceive?</span>
            <div className="screen-stack-options">
              {([{ value: "now", label: "Yes, we are trying now" }, { value: "within_year", label: "Planning to within the next year" }, { value: "not_planning", label: "Not planning to" }, { value: "prefer_not", label: "Prefer not to say" }] as const).map((option) => (
                <label key={option.value} className={`screen-select-option ${profile.trying === option.value ? "screen-select-option-active" : ""}`}><input type="radio" name="trying" checked={profile.trying === option.value} onChange={() => setProfileField("trying", option.value)}/><span>{option.label}</span></label>
              ))}
            </div>
          </div>
          {profile.trying === "now" && (
            <div className="screen-form-grid">
              <div className="screen-form-section"><label htmlFor="months-trying" className="screen-field-label">How many months have you been trying?</label><input id="months-trying" className="screen-input" type="number" min="0" max="240" inputMode="numeric" value={profile.monthsTrying} onChange={(event) => setProfileField("monthsTrying", event.target.value)} placeholder="Months (optional)"/></div>
              <div className="screen-form-section"><span className="screen-field-label">Is your partner aged 35 or over?</span><ChoiceMini value={profile.partner35Plus} onChange={(value) => setProfileField("partner35Plus", value)} /></div>
            </div>
          )}
          <div className="screen-form-grid">
            <div className="screen-form-section"><label htmlFor="height-cm" className="screen-field-label">Height <span>(optional)</span></label><div className="screen-input-with-unit"><input id="height-cm" className="screen-input" type="number" min="120" max="230" value={profile.heightCm} onChange={(event) => setProfileField("heightCm", event.target.value)} placeholder="Height"/><span>cm</span></div></div>
            <div className="screen-form-section"><label htmlFor="weight-kg" className="screen-field-label">Weight <span>(optional)</span></label><div className="screen-input-with-unit"><input id="weight-kg" className="screen-input" type="number" min="35" max="250" value={profile.weightKg} onChange={(event) => setProfileField("weightKg", event.target.value)} placeholder="Weight"/><span>kg</span></div></div>
          </div>
          <div className="screen-actions"><button className="button button-secondary" onClick={() => setStep("urgent")}><ArrowLeft size={15}/> Back</button><button className="button button-primary" onClick={() => setStep("history")}>Continue <ArrowRight size={16}/></button></div>
        </div>
      )}

      {step === "history" && (
        <div className="screen-card">
          {HISTORY_GROUPS.map((group) => <QuestionGroupView key={group.title} group={group} answers={answers} onAnswer={setAnswer}/>)}
          <div className="screen-actions"><button className="button button-secondary" onClick={() => setStep("about")}><ArrowLeft size={15}/> Back</button><button className="button button-primary" onClick={() => setStep("lifestyle")}>Continue <ArrowRight size={16}/></button></div>
        </div>
      )}

      {step === "lifestyle" && (
        <div className="screen-card">
          {LIFESTYLE_GROUPS.map((group) => <QuestionGroupView key={group.title} group={group} answers={answers} onAnswer={setAnswer}/>)}
          <div className="screen-form-section">
            <div className="screen-field-label">How much alcohol do you drink?</div>
            <div className="screen-stack-options">
              {([{ value: "none", label: "I don’t drink alcohol" }, { value: "occasional", label: "Occasionally (1 to 7 drinks a week)" }, { value: "regular", label: "Regularly (8 to 14 drinks a week)" }, { value: "heavy", label: "Heavily (15 or more drinks a week)" }, { value: "prefer_not", label: "Prefer not to say" }] as const).map((option) => (
                <label key={option.value} className={`screen-select-option ${profile.alcohol === option.value ? "screen-select-option-active" : ""}`}><input type="radio" name="alcohol" checked={profile.alcohol === option.value} onChange={() => setProfileField("alcohol", option.value)}/><span>{option.label}</span></label>
              ))}
            </div>
          </div>
          <div className="screen-form-section">
            <div className="screen-field-label">Do you regularly take any of these medicines?</div>
            <p className="screen-question-help">Optional. Do not stop any prescribed medicine without asking your doctor.</p>
            <div className="screen-stack-options">
              {MEDICATION_OPTIONS.map((medicine) => {
                const selected = profile.medications.includes(medicine);
                const exclusive = medicine === MEDICATION_NONE || medicine === MEDICATION_SKIP;
                return <label key={medicine} className={`screen-select-option ${selected ? "screen-select-option-active" : ""}`}><input type="checkbox" checked={selected} onChange={() => setProfile((current) => ({ ...current, medications: exclusive ? (selected ? [] : [medicine]) : selected ? current.medications.filter((item) => item !== medicine) : [...current.medications.filter((item) => item !== MEDICATION_NONE && item !== MEDICATION_SKIP), medicine] }))}/><span>{medicine}</span></label>;
              })}
            </div>
          </div>
          <div className="screen-actions"><button className="button button-secondary" onClick={() => setStep("history")}><ArrowLeft size={15}/> Back</button><button className="button button-primary" onClick={() => setStep("review")}>Review answers <ArrowRight size={16}/></button></div>
        </div>
      )}

      {step === "review" && (
        <div className="screen-card">
          <div className="screen-group-heading"><h2>Review before submitting</h2><p>Nothing is submitted until you choose “Get my screening result”. Blank answers remain unknown; they are not changed to “No”.</p></div>
          <div className="screen-review-section"><div className="screen-review-heading"><h3>Urgent symptoms</h3><button onClick={() => setStep("urgent")}>Edit</button></div>{URGENT_GROUP.questions.map((question) => <ReviewRow key={question.key} label={question.prompt} value={answers[question.key]}/>)}</div>
          <div className="screen-review-section"><div className="screen-review-heading"><h3>About you</h3><button onClick={() => setStep("about")}>Edit</button></div>
            <ReviewRow label="Age" value={profile.age ? `${profile.age} years` : "Skipped"}/>
            <ReviewRow label="Trying to conceive" value={profile.trying === "now" ? "Trying now" : profile.trying === "within_year" ? "Planning within a year" : profile.trying === "not_planning" ? "Not planning to" : "Skipped / prefer not to say"}/>
            {profile.trying === "now" && <ReviewRow label="Months trying" value={profile.monthsTrying || "Skipped"}/>}
            {profile.trying === "now" && <ReviewRow label="Partner aged 35 or over" value={displayAnswer(profile.partner35Plus)}/>}
            {profile.heightCm && <ReviewRow label="Height" value={`${profile.heightCm} cm`}/>}
            {profile.weightKg && <ReviewRow label="Weight" value={`${profile.weightKg} kg`}/>}
          </div>
          <div className="screen-review-section"><div className="screen-review-heading"><h3>Medical history</h3><button onClick={() => setStep("history")}>Edit</button></div>{HISTORY_GROUPS.flatMap((group) => group.questions).map((question) => <ReviewRow key={question.key} label={question.prompt} value={displayAnswer(answers[question.key])}/>)}</div>
          <div className="screen-review-section"><div className="screen-review-heading"><h3>Health and lifestyle</h3><button onClick={() => setStep("lifestyle")}>Edit</button></div>{LIFESTYLE_GROUPS.flatMap((group) => group.questions).map((question) => <ReviewRow key={question.key} label={question.prompt} value={displayAnswer(answers[question.key])}/>)}
            <ReviewRow label="Alcohol" value={profile.alcohol === "none" ? "I don’t drink alcohol" : profile.alcohol === "occasional" ? "Occasionally (1 to 7 drinks a week)" : profile.alcohol === "regular" ? "Regularly (8 to 14 drinks a week)" : profile.alcohol === "heavy" ? "Heavily (15 or more drinks a week)" : profile.alcohol === "prefer_not" ? "Prefer not to say" : "Skipped"}/><ReviewRow label="Medicines" value={profile.medications.length ? profile.medications.join(", ") : "Skipped"}/>
          </div>
          {error && <div className="screen-alert screen-alert-danger" role="alert"><CircleAlert size={18}/><div><strong>Unable to complete screening</strong><span>{error}</span></div></div>}
          <div className="screen-actions"><button className="button button-secondary" onClick={() => setStep("lifestyle")}><ArrowLeft size={15}/> Back</button><button className="button button-primary" disabled={loading || !profileReady} onClick={evaluateScreening}>{loading ? "Evaluating locally…" : "Get my screening result"} <ArrowRight size={16}/></button></div>
          <p className="screen-clinical-note">Your answers are sent to the local service on this device for this request only. They are not saved to a database or sent to a cloud service.</p>
        </div>
      )}

      {step === "result" && result && (
        <div className="screen-card">
          {result.status === "cannot_continue" ? (
            <div className="screen-result-neutral"><ShieldAlert size={26}/><h2>We can’t continue yet</h2><p>The existing screening rules require adult age and consent before evaluation.</p></div>
          ) : (
            <>
              <div className={`screen-result-banner ${isEmergency ? "screen-result-emergency" : ""}`}>
                <div className="screen-result-kicker">{isEmergency ? "URGENT RESULT" : "YOUR SCREENING RESULT"}</div>
                <h2>{outcome?.title ?? "Your screening result"}</h2>
                <div className="screen-result-time">{outcome?.timeframe ?? "See the next steps below"}</div>
                <p>{outcome?.explanation ?? "The existing screening rules have returned a result."}</p>
              </div>
              <div className="screen-result-actions"><h3>Suggested next steps</h3><ol>{(outcome?.steps ?? []).map((item) => <li key={item}>{item}</li>)}</ol></div>
              {result.low_confidence && <div className="screen-alert screen-alert-warn"><CircleAlert size={18}/><div><strong>Limited answers</strong><span>This result is based on limited information. The existing rules use a cautious pathway when many optional answers are missing.</span></div></div>}
              {result.safety_net && <div className="screen-alert screen-alert-warn"><CircleAlert size={18}/><div><strong>Some urgent symptom questions were skipped</strong><span>This screening cannot rule out an urgent problem when those answers are missing. Seek immediate care for sudden severe testicular pain, sudden swelling, fever with pain or swelling, a painful erection lasting over 4 hours, or a groin injury with swelling. A new lump, blood in semen or persistent ache also needs prompt medical assessment.</span></div></div>}
              {result.top_factors.length > 0 && <div className="screen-factor-panel"><h3>What shaped this rules-based result</h3><p>These are factors you reported that the written rules considered. They are not diagnoses or proof of causation.</p><ul>{result.top_factors.map((factor) => <li key={factor.id}><span>{factor.label}</span><small>{factor.modifiable ? "Can be changed" : "Cannot be changed"}</small></li>)}</ul></div>}
              <div className="screen-model-note"><Sparkles size={16}/><span>This V2 screening workflow used the existing deterministic rules engine. The experimental ML second opinion and SHAP explanations are not connected to this workflow yet.</span></div>
            </>
          )}
          <div className="screen-actions screen-result-footer">
            {!isEmergency && result.status === "result" && <button className="button button-secondary" onClick={downloadSummary}><Download size={15}/> Download clinician summary</button>}
            {isEmergency
              ? <button className="button button-secondary" onClick={() => { resetScreening(); navigate("/"); }}>Clear answers and return to overview</button>
              : <button className="button button-primary" onClick={resetScreening}>Clear answers and start again <ArrowRight size={16}/></button>}
          </div>
          <div className="screen-final-disclaimer"><ShieldCheck size={15}/><span>LOC is screening and care-navigation support only. It is not a diagnosis, medical advice or a replacement for an in-person clinician. If symptoms are severe or worsening, seek appropriate medical care.</span></div>
        </div>
      )}

      {step !== "consent" && step !== "result" && <div className="screen-bottom-note"><LockKeyhole size={14}/> Your answers remain in this browser session and the local service only.</div>}
      <div className="screen-bottom-return"><Link to="/">Return to overview</Link></div>
    </div>
  );
}

function ChoiceMini({ value, onChange }: { value: ScreeningAnswer | undefined; onChange: (value: ScreeningAnswer) => void }) {
  return <div className="screen-choice-row screen-choice-row-compact">
    {[{ label: "Yes", value: true as const }, { label: "No", value: false as const }, { label: "Prefer not", value: null }].map((option) => (
      <label key={option.label} className={`screen-choice ${value === option.value ? "screen-choice-selected" : ""}`}><input type="radio" name="partner-35" checked={value === option.value} onChange={() => onChange(option.value)}/><span>{option.label}</span></label>
    ))}
  </div>;
}

function ReviewRow({ label, value }: { label: string; value: ScreeningAnswer | string | undefined }) {
  const shown = typeof value === "boolean" || value === null || value === undefined ? displayAnswer(value) : value;
  return <div className="screen-review-row"><span>{label}</span><strong>{shown}</strong></div>;
}
