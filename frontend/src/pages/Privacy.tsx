import { useState } from "react";
import { Download, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";
import SectionHeading from "../components/ui/SectionHeading";
import { useLocStore } from "../store/useLocStore";

export default function Privacy() {
  const clearLocalData = useLocStore((state) => state.clearLocalData);
  const records = useLocStore((state) => state.records);
  const [notice, setNotice] = useState("");

  function exportData() {
    const payload = { exportedAt: new Date().toISOString(), records };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "loc-health-data.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Your current in-memory session data has been exported.");
  }

  function deleteData() {
    if (!window.confirm("Clear all health records in this session? This cannot be undone.")) return;
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
        <div className="settings-heading"><div><h3>Current data practices</h3><p>What this milestone actually does today.</p></div></div>
        <div className="setting-row"><div><strong>Cloud upload and analytics</strong><span>No health-data upload, third-party analytics or cloud synchronization is implemented in this build.</span></div><span className="state-label">OFF</span></div>
        <div className="setting-row"><div><strong>Persistent device storage</strong><span>Not enabled. Encrypted IndexedDB storage and its consent/key lifecycle will be designed and reviewed in a later milestone.</span></div><span className="state-label state-planned">PLANNED</span></div>
        <div className="setting-row"><div><strong>Session data export</strong><span>Export the records currently held in application memory as a JSON file.</span></div><span className="state-label">AVAILABLE</span></div>
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
