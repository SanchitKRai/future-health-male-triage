import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Screening from "./pages/Screening";
import HealthTimeline from "./pages/HealthTimeline";
import PlaceholderPage from "./pages/PlaceholderPage";
import Privacy from "./pages/Privacy";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell/>}>
        <Route path="/" element={<Dashboard/>}/>
        <Route path="/screening" element={<Screening/>}/>
        <Route path="/timeline" element={<HealthTimeline/>}/>
        <Route path="/insights" element={<PlaceholderPage eyebrow="UNDERSTAND THE SIGNALS" title="Health insights" description="Plain-language screening insights, with clear explanations and uncertainty." next="/screening" nextLabel="Start with a health check"/>}/>
        <Route path="/care" element={<PlaceholderPage eyebrow="A CLEARER NEXT STEP" title="Care navigation" description="Explore appropriate preventive screening and prepare for conversations with qualified professionals." next="/screening" nextLabel="Start with a health check"/>}/>
        <Route path="/privacy" element={<Privacy/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Route>
    </Routes>
  );
}
