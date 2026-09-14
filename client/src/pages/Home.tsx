import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Activity,
  ArrowUpRight,
  BatteryCharging,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Download,
  Gauge,
  History,
  LayoutDashboard,
  Radio,
  Satellite,
  Settings2,
  ShieldCheck,
  Signal,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Reading = {
  time: string;
  rms: number;
  vibration: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  status: "NORMAL" | "HIGH_VIBRATION";
};

const seed: Reading[] = Array.from({ length: 34 }, (_, index) => {
  const phase = index / 4.2;
  const spike = index > 22 && index < 28 ? 0.018 : 0;
  const rms = 0.034 + Math.sin(phase) * 0.008 + Math.cos(index / 2.4) * 0.004 + spike;
  return {
    time: `${String(14 + Math.floor(index / 6)).padStart(2, "0")}:${String((index * 10) % 60).padStart(2, "0")}`,
    rms: Number(rms.toFixed(3)),
    vibration: Number((rms * 0.74 + Math.sin(index) * 0.003).toFixed(3)),
    ax: Number((Math.sin(phase * 1.4) * 0.08 + 0.02).toFixed(3)),
    ay: Number((Math.cos(phase * 1.1) * 0.06 - 0.01).toFixed(3)),
    az: Number((0.98 + Math.sin(phase * 0.7) * 0.025).toFixed(3)),
    gx: Number((Math.sin(phase * 1.6) * 12).toFixed(1)),
    gy: Number((Math.cos(phase * 1.25) * 8).toFixed(1)),
    gz: Number((Math.sin(phase * 0.8) * 6).toFixed(1)),
    status: rms > 0.08 ? "HIGH_VIBRATION" : "NORMAL",
  };
});

const formatTime = (date = new Date()) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function MetricCard({ label, value, unit, hint, accent = "cyan", icon }: { label: string; value: string; unit?: string; hint: string; accent?: "cyan" | "amber" | "lime"; icon: React.ReactNode }) {
  return (
    <div className={`metric-card metric-${accent}`}>
      <div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div>
      <div className="metric-value">{value}<small>{unit}</small></div>
      <div className="metric-hint">{hint}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, legend }: { title: string; subtitle: string; children: React.ReactNode; legend: React.ReactNode }) {
  return <section className="panel chart-card">
    <div className="panel-heading"><div><div className="eyebrow">{title}</div><div className="panel-subtitle">{subtitle}</div></div>{legend}</div>
    <div className="chart-wrap">{children}</div>
  </section>;
}

export default function Home() {
  const [readings, setReadings] = useState(seed);
  const [range, setRange] = useState("LAST 10 MIN");
  const [isLive, setIsLive] = useState(true);
  const [lastSeen, setLastSeen] = useState(new Date());
  const current = readings[readings.length - 1];
  const peak = Math.max(...readings.map((reading) => reading.rms));
  const chartData = useMemo(() => readings.slice(-24), [readings]);

  useEffect(() => {
    if (!isLive) return;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
    if (supabase) {
      const channel = supabase
        .channel("sensor-readings-live")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_readings" }, ({ new: row }) => {
          const reading = row as Partial<Reading> & { created_at?: string; timestamp_ms?: number; status?: string };
          const rms = Number(reading.rms ?? 0);
          const realtimeReading: Reading = {
            time: reading.created_at ? formatTime(new Date(reading.created_at)) : formatTime(),
            rms: Number(rms.toFixed(3)),
            vibration: Number(Number(reading.vibration ?? 0).toFixed(3)),
            ax: Number(Number(reading.ax ?? 0).toFixed(3)), ay: Number(Number(reading.ay ?? 0).toFixed(3)), az: Number(Number(reading.az ?? 0).toFixed(3)),
            gx: Number(Number(reading.gx ?? 0).toFixed(1)), gy: Number(Number(reading.gy ?? 0).toFixed(1)), gz: Number(Number(reading.gz ?? 0).toFixed(1)),
            status: reading.status === "HIGH_VIBRATION" || rms > 0.08 ? "HIGH_VIBRATION" : "NORMAL",
          };
          setReadings((previous) => [...previous.slice(-39), realtimeReading]);
          setLastSeen(new Date());
        })
        .subscribe();
      return () => { void supabase.removeChannel(channel); };
    }
    const timer = window.setInterval(() => {
      setReadings((previous) => {
        const last = previous[previous.length - 1];
        const index = previous.length;
        const nextRms = Math.max(0.01, Math.min(0.11, last.rms + (Math.sin(index * 1.7) * 0.004) + (Math.random() - 0.48) * 0.003));
        const next: Reading = {
          ...last,
          time: formatTime(),
          rms: Number(nextRms.toFixed(3)),
          vibration: Number((nextRms * 0.74 + (Math.random() - 0.5) * 0.004).toFixed(3)),
          ax: Number((Math.sin(index / 3) * 0.08 + (Math.random() - 0.5) * 0.01).toFixed(3)),
          ay: Number((Math.cos(index / 3.8) * 0.06 + (Math.random() - 0.5) * 0.01).toFixed(3)),
          gx: Number((Math.sin(index / 2) * 12 + (Math.random() - 0.5) * 2).toFixed(1)),
          gy: Number((Math.cos(index / 2.7) * 8 + (Math.random() - 0.5) * 1.5).toFixed(1)),
          gz: Number((Math.sin(index / 4) * 6 + (Math.random() - 0.5)).toFixed(1)),
          status: nextRms > 0.08 ? "HIGH_VIBRATION" : "NORMAL",
        };
        return [...previous.slice(-39), next];
      });
      setLastSeen(new Date());
    }, 2600);
    return () => window.clearInterval(timer);
  }, [isLive]);

  const exportCsv = () => {
    const header = "timestamp,device_id,rms_g,vibration_g,status\n";
    const body = readings.map((reading) => `${reading.time},DRIFT-IMU-01,${reading.rms},${reading.vibration},${reading.status}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "drift-mount-sensor-readings.csv"; anchor.click(); URL.revokeObjectURL(url);
  };

  const tooltipStyle = { background: "#101923", border: "1px solid #233543", borderRadius: 6, color: "#e8f3f6", fontSize: 11 };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span>✦</span></div><div><div className="brand-name">DRIFT</div><div className="brand-caption">MOUNT SENSOR / 01</div></div></div>
      <div className="side-status"><span className="pulse-dot" /> SYSTEM OPERATIONAL</div>
      <nav className="nav-list">
        <div className="nav-section">WORKSPACE</div>
        <a className="nav-item active"><LayoutDashboard size={16} /> Overview <span className="nav-kbd">01</span></a>
        <a className="nav-item"><History size={16} /> Flight history</a>
        <a className="nav-item"><Satellite size={16} /> Device health</a>
        <div className="nav-section second">CONFIGURATION</div>
        <a className="nav-item"><SlidersHorizontal size={16} /> Calibration</a>
        <a className="nav-item"><Settings2 size={16} /> System settings</a>
      </nav>
      <div className="sidebar-bottom"><div className="connection-card"><div className="connection-label"><Wifi size={14} /> SUPABASE LINK</div><div className="connection-state"><span className="tiny-dot" /> READY FOR REALTIME</div><div className="connection-meta">RLS protected · anon key only</div></div><a className="back-link" href="#drift"><ArrowUpRight size={15} /> Back to DRIFT</a></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div><div className="crumb">DRIFT / SENSOR NETWORK / <strong>OVERVIEW</strong></div><h1>Mount Sensor <span>Telemetry</span></h1></div><div className="top-actions"><div className="refresh-readout"><span className="pulse-dot" /> LAST SYNC <strong>{formatTime(lastSeen)}</strong></div><button className="icon-button"><CircleHelp size={17} /></button><div className="avatar">DS</div></div></header>
      <div className="content-inner">
        <div className="hero-row"><div><div className="section-kicker"><span className="live-line" /> LIVE FLIGHT QUALITY</div><p className="hero-copy">Real-time vibration intelligence for <strong>DRIFT</strong> aerial capture systems.</p></div><div className="range-control"><button className="range-button">{range} <ChevronDown size={14} /></button><button className="export-button" onClick={exportCsv}><Download size={15} /> EXPORT CSV</button></div></div>
        <section className="overview-grid">
          <MetricCard label="CURRENT RMS" value={current.rms.toFixed(3)} unit="g" hint="1 sec rolling window" accent="cyan" icon={<Gauge size={17} />} />
          <MetricCard label="VIBRATION" value={current.vibration.toFixed(3)} unit="g" hint="Live acceleration variance" accent="amber" icon={<Activity size={17} />} />
          <MetricCard label="PEAK RMS" value={peak.toFixed(3)} unit="g" hint={`Highest · ${range.toLowerCase()}`} accent="lime" icon={<Zap size={17} />} />
          <div className={`quality-card ${current.status === "HIGH_VIBRATION" ? "high" : "normal"}`}><div className="quality-head"><span className="metric-label">FLIGHT QUALITY</span><ShieldCheck size={18} /></div><div className="quality-status">{current.status === "HIGH_VIBRATION" ? "HIGH VIBRATION" : "NORMAL"}</div><div className="quality-foot"><span className="quality-bar"><i style={{ width: `${Math.min(100, (current.rms / 0.08) * 100)}%` }} /></span><span>THRESHOLD {current.rms > 0.08 ? "EXCEEDED" : "NOMINAL"}</span></div></div>
        </section>

        <div className="section-title-row"><div><div className="eyebrow">SIGNAL MONITORING</div><div className="panel-subtitle">High-frequency telemetry from the MPU6050 sensor</div></div><div className="live-toggle" onClick={() => setIsLive(!isLive)}><span className={isLive ? "toggle active" : "toggle"}><i /></span>{isLive ? "REALTIME ON" : "PAUSED"}</div></div>
        <div className="chart-grid">
          <ChartCard title="VIBRATION SIGNAL" subtitle="RMS + instantaneous vibration / g" legend={<div className="legend"><span><i className="legend-cyan" /> RMS</span><span><i className="legend-amber" /> VIBRATION</span></div>}>
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 14, right: 12, left: -24, bottom: 0 }}><defs><linearGradient id="rmsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60e5df" stopOpacity={0.26} /><stop offset="100%" stopColor="#60e5df" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#1c2a35" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="time" tick={{ fill: "#627887", fontSize: 10 }} axisLine={false} tickLine={false} interval={5} /><YAxis domain={[0, 0.12]} tick={{ fill: "#627887", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value.toFixed(3)} g`]} /><Area type="monotone" dataKey="rms" stroke="#60e5df" strokeWidth={2} fill="url(#rmsFill)" /><Line type="monotone" dataKey="vibration" stroke="#e9aa58" strokeWidth={1.5} dot={false} /></AreaChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="ACCELEROMETER" subtitle="3-axis acceleration / g" legend={<div className="legend"><span><i className="legend-red" /> X</span><span><i className="legend-blue" /> Y</span><span><i className="legend-lime" /> Z</span></div>}>
            <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 14, right: 12, left: -24, bottom: 0 }}><CartesianGrid stroke="#1c2a35" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="time" tick={{ fill: "#627887", fontSize: 10 }} axisLine={false} tickLine={false} interval={5} /><YAxis domain={[-0.2, 1.1]} tick={{ fill: "#627887", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="ax" stroke="#ff7d75" strokeWidth={1.5} dot={false} /><Line type="monotone" dataKey="ay" stroke="#6fa8ff" strokeWidth={1.5} dot={false} /><Line type="monotone" dataKey="az" stroke="#b6e36a" strokeWidth={1.5} dot={false} /></LineChart></ResponsiveContainer></ChartCard>
        </div>

        <div className="lower-grid"><ChartCard title="GYROSCOPE" subtitle="3-axis angular velocity / °/s" legend={<div className="legend"><span><i className="legend-red" /> X</span><span><i className="legend-blue" /> Y</span><span><i className="legend-lime" /> Z</span></div>}><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 14, right: 12, left: -24, bottom: 0 }}><CartesianGrid stroke="#1c2a35" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="time" tick={{ fill: "#627887", fontSize: 10 }} axisLine={false} tickLine={false} interval={5} /><YAxis domain={[-16, 16]} tick={{ fill: "#627887", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="gx" stroke="#ff7d75" strokeWidth={1.5} dot={false} /><Line type="monotone" dataKey="gy" stroke="#6fa8ff" strokeWidth={1.5} dot={false} /><Line type="monotone" dataKey="gz" stroke="#b6e36a" strokeWidth={1.5} dot={false} /></LineChart></ResponsiveContainer></ChartCard>
          <section className="panel session-card"><div className="panel-heading"><div><div className="eyebrow">FLIGHT SESSION</div><div className="panel-subtitle">Current capture context</div></div><Radio size={17} color="#60e5df" /></div><div className="session-list"><div><span>DEVICE ID</span><strong>DRIFT-IMU-01</strong></div><div><span>SESSION START</span><strong>14:06:12 <em>UTC</em></strong></div><div><span>LATEST READING</span><strong>{formatTime(lastSeen)} <em>LOCAL</em></strong></div><div><span>READINGS RECEIVED</span><strong>{(readings.length * 31).toLocaleString()}</strong></div></div><div className="threshold"><div className="threshold-head"><span><SlidersHorizontal size={13} /> PROTOTYPE THRESHOLD</span><strong>0.08 g RMS</strong></div><p>Calibration value for flight testing. Not a scientifically validated drone safety threshold.</p></div></section></div>

        <section className="panel events-panel"><div className="panel-heading"><div><div className="eyebrow">SENSOR EVENT HISTORY</div><div className="panel-subtitle">Latest readings from the selected time range</div></div><div className="table-filter"><Signal size={13} /> ALL DEVICES <ChevronDown size={13} /></div></div><div className="table-scroll"><table><thead><tr><th>TIMESTAMP</th><th>DEVICE</th><th>RMS</th><th>VIBRATION</th><th>STATUS</th></tr></thead><tbody>{readings.slice(-6).reverse().map((reading, index) => <tr key={`${reading.time}-${index}`}><td>{reading.time}</td><td><span className="device-cell"><span className="tiny-dot" /> DRIFT-IMU-01</span></td><td className="mono">{reading.rms.toFixed(3)} g</td><td className="mono">{reading.vibration.toFixed(3)} g</td><td><span className={`status-pill ${reading.status === "HIGH_VIBRATION" ? "warning" : "good"}`}>{reading.status === "HIGH_VIBRATION" ? "HIGH VIBRATION" : "NORMAL"}</span></td></tr>)}</tbody></table></div></section>
        <footer className="footer"><span><BatteryCharging size={14} /> ESP32 DEV MODULE · MPU6050 · 200 Hz SAMPLING</span><span>SUPABASE REALTIME <i className="footer-dot" /> ENVIRONMENT READY</span></footer>
      </div>
    </main>
  </div>;
}
