import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { RUN, MODELS, COLORS, LEGEND, DURATION, FLAT_EVENTS, SUB_EVENTS, SUB_SYSTEM, ledgerAt } from "./data.js";
import ForceTree from "./components/ForceTree.jsx";
import { AnimatedNumber, TokenTimeline, TokenBars } from "./components/Charts.jsx";

function Stat({ label, value, color }) {
  return (
    <div className="stat">
      <div className="stat-v" style={{ color }}><AnimatedNumber value={Math.round(value)} /></div>
      <div className="stat-l">{label}</div>
    </div>
  );
}

const ratio = (a, b) => (a / b).toFixed(1);

export default function App() {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(null);
  const offset = useRef(0);

  // 10-second clock driven by d3.timer
  useEffect(() => {
    if (!playing) return;
    const start = offset.current;
    timer.current = d3.timer((t) => {
      const now = Math.min(DURATION, start + t);
      offset.current = now;
      setElapsed(now);
      if (now >= DURATION) { timer.current.stop(); setPlaying(false); }
    });
    return () => timer.current && timer.current.stop();
  }, [playing]);

  const play = () => {
    if (offset.current >= DURATION) { offset.current = 0; setElapsed(0); }
    setPlaying(true);
  };
  const reset = () => { setPlaying(false); offset.current = 0; setElapsed(0); };

  const l = ledgerAt(elapsed);
  const done = elapsed >= DURATION;

  return (
    <div className="app">
      <header>
        <h1>Single agent <span className="vs">vs</span> manager + subagents</h1>
        <p className="lede">
          Two trees grow over 10 seconds. Node area is proportional to tokens. There are 14 files being processed into different folder category marked by different circle color. Orange color represents the iteration. Each implementation uses the same tools and processes the same files.
        </p>
      </header>

      <div className="controls">
        {playing
          ? <button onClick={() => setPlaying(false)}>❚❚ Pause</button>
          : <button className="primary" onClick={play}>▶ {elapsed === 0 ? "Play (10 s)" : done ? "Replay" : "Resume"}</button>}
        <button onClick={reset}>↺ Reset</button>
        <div className="progress"><div style={{ width: `${(100 * elapsed) / DURATION}%` }} /></div>
        <span className="phase">{(elapsed / 1000).toFixed(1)} s / 10 s</span>
      </div>

      <section className="race">
        <article className="card flat">
          <div className="card-h">
            <h2><span className="dot" style={{ background: COLORS.agent }} />Single agent</h2>
            <span className="chip">{MODELS.flat}</span>
          </div>
          <ForceTree events={FLAT_EVENTS} elapsed={elapsed} />
          <div className="stats">
            <Stat label="input tokens" value={l.flat.in} color={COLORS.agent} />
            <Stat label="output tokens" value={l.flat.out} />
            <Stat label="context now" value={l.flat.context} />
            <Stat label="turns" value={l.flat.turns} />
          </div>
        </article>

        <article className="card sub">
          <div className="card-h">
            <h2><span className="dot" style={{ background: COLORS.subagent }} />Manager + subagents</h2>
            <span className="chip">{MODELS.manager} → {MODELS.subagent}</span>
          </div>
          <ForceTree events={SUB_EVENTS} elapsed={elapsed} />
          <div className="stats">
            <Stat label="input tokens" value={l.sub.in} color={COLORS.subagent} />
            <Stat label="output tokens" value={l.sub.out} />
            <Stat label="manager context" value={l.sub.managerContext} color={COLORS.manager} />
            <Stat label="subagents" value={l.sub.spawned} />
          </div>
        </article>
      </section>

      <div className="legend">
        {LEGEND.map(([k, txt]) => (
          <span key={k}><i style={{ background: COLORS[k], outline: k === "word" ? "2px solid #22c58b" : "none" }} />{txt}</span>
        ))}
        <span className="hint">Drag nodes · hover for tokens</span>
      </div>

      <section className="grid2">
        <article className="card">
          <div className="card-h"><h2>Token consumption over time</h2><span className="chip">cumulative input</span></div>
          <TokenTimeline elapsed={elapsed} />
        </article>
        <article className="card">
          <div className="card-h"><h2>Single agent vs subagents</h2><span className="chip">lands on logged totals</span></div>
          <TokenBars elapsed={elapsed} />
        </article>
      </section>

      <section className={`card summary ${done ? "lit" : ""}`}>
        <table className="ledger">
          <thead><tr><th>from the run logs</th><th>turns</th><th>tools</th><th>input</th><th>output</th></tr></thead>
          <tbody>
            <tr><td>single agent</td><td>{RUN.flat.turns}</td><td>{RUN.flat.tools}</td><td>11,928</td><td>3,256</td></tr>
            <tr><td>manager context</td><td>{RUN.manager.turns}</td><td>{RUN.manager.tools}</td><td>86</td><td>0</td></tr>
            <tr><td>subagents (total)</td><td>{RUN.subagents.turns}</td><td>{RUN.subagents.tools}</td><td>1,976</td><td>56</td></tr>
          </tbody>
        </table>
        <div className="kpi-row">
          <div className="kpi"><b>{ratio(RUN.flat.in, RUN.manager.in)}×</b><span>smaller manager context (11,928 → 86)</span></div>
          <div className="kpi"><b>{ratio(RUN.flat.in, RUN.manager.in + RUN.subagents.in)}×</b><span>fewer input tokens in total (11,928 → 2,062)</span></div>
          <div className="kpi"><b>{ratio(RUN.flat.out, RUN.subagents.out)}×</b><span>fewer output tokens (3,256 → 56)</span></div>
        </div>
        <p className="note">
          Delegation is not automatically cheaper: each subagent resends its own system prompt (~{Math.round(SUB_SYSTEM)} of its ~141 input tokens).
          What it buys is a manager context that does not grow with the job. Totals are from <code>single-agent-run.txt</code> and <code>subagent-run.txt</code>;
          the per-node split is an estimate that sums exactly to them.
        </p>
      </section>
    </div>
  );
}
