import { useState } from "react";
import { Download, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";
import SectionHeading from "../components/ui/SectionHeading";
import { useLocStore } from "../store/useLocStore";

export default function Privacy() {
  const preferences = useLocStore((state) => state.preferences);
  const setPreference = useLocStore((state) => state.setPreference);
  const clearLocalData = useLocStore((state) => state.clearLocalData);
  const records = useLocStore((state) => state.records);
  const [notice, setNotice] = useState("");

  function exportData() {
    const payload = { exportedAt: new Date().toISOString(), records, preferences };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "loc-health-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Your current session data has been exported.");
  }

  function deleteData() {
    if (!window.confirm("Clear all health records and preferences in this session? This cannot be undone.")) return;
    clearLocalData();
    setNotice("Session data cleared.");
  }

  return (
    <div className="subpage">
      <SectionHeading eyebrow="YOUR CONTROL CENTRE" title="Privacy, without fine print."
        description="Understand what happens to your information and choose what you are comfortable with."/>
      <div className="privacy-hero">
        <div className="privacy-hero-icon"><ShieldCheck size={25}/></div>
        <div><h2>Private by default.</h2><p>This foundation build keeps information in application memory for the current browser session. It does not send health information to a cloud database.</p></div>
        <span className="secure-chip"><LockKeyhole size={13}/> Local session</span>
      </div>
      <section className="settings-panel">
        <div className="settings-heading"><div><h3>Your choices</h3><p>Optional settings are off until you choose otherwise.</p></div></div>
        <div className="setting-row"><div><strong>Optional analytics</strong><span>Help improve product usability with non-health usage metrics. Not active in this build.</span></div><button className={`toggle ${preferences.analyticsConsent ? "toggle-on" : ""}`} aria-pressed={preferences.analyticsConsent} onClick={() => setPreference("analyticsConsent", !preferences.analyticsConsent)}><span/></button></div>
        <div className="setting-row"><div><strong>Remember data on this device</strong><span>Persistent encrypted local storage is planned for a later milestone. This switch does not enable persistence yet.</span></div><button className={`toggle ${preferences.localStorageConsent ? "toggle-on" : ""}`} aria-pressed={preferences.localStorageConsent} onClick={() => { setPreference("localStorageConsent", !preferences.localStorageConsent); setNotice("Preference recorded for this session. Persistent storage is not enabled in this milestone."); }}><span/></button></div>
      </section>
      <div className="privacy-actions">
        <button className="button button-secondary" onClick={exportData}><Download size={16}/> Export session data</button>
        <button className="button button-danger" onClick={deleteData}><Trash2 size={16}/> Clear session data</button>
      </div>
      {notice && <div className="inline-notice" role="status">{notice}</div>}
      <div className="privacy-footnote"><LockKeyhole size={15}/><span><strong>Important:</strong> this version uses in-memory state, not encrypted persistent storage. Closing or refreshing the page may clear session data. Do not use real sensitive health information in this development prototype.</span></div>
    </div>
  );
}
