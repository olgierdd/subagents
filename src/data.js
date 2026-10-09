// ---------------------------------------------------------------------------
// Run data (verbatim from single-agent-run.txt and subagent-run.txt)
// ---------------------------------------------------------------------------
export const FILES = [
  { name: "Asha_Kulkarni_Resume (2).txt",       chars: 231, flat: "work",     sub: "work" },
  { name: "Asha_Kulkarni_Resume.txt",           chars: 231, flat: "work",     sub: "work" },
  { name: "electricity_bill_august.txt",        chars: 240, flat: "finance",  sub: "finance" },
  { name: "electricity_bill_july.txt",          chars: 238, flat: "finance",  sub: "finance" },
  { name: "form16_fy2025_26.txt",               chars: 211, flat: "finance",  sub: "finance" },
  { name: "grocery_list.txt",                   chars: 79,  flat: "personal", sub: "personal" },
  { name: "insurance_policy_health.txt",        chars: 222, flat: "finance",  sub: "finance" },
  { name: "meeting_notes_ruteway_sprint12.txt", chars: 351, flat: "work",     sub: "work" },
  { name: "rent_receipt_july.txt",              chars: 198, flat: "finance",  sub: "personal" },
  { name: "screenshot_error_2026_08_11.txt",    chars: 199, flat: "work",     sub: "work" },
  { name: "sip_statement_q2.txt",               chars: 194, flat: "finance",  sub: "finance" },
  { name: "trek_photos_note.txt",               chars: 167, flat: "personal", sub: "personal" },
  { name: "untitled_1.txt",                     chars: 110, flat: "personal", sub: "personal" },
  { name: "wedding_invite_shreya.txt",          chars: 183, flat: "personal", sub: "personal" },
];

// Final ledgers exactly as printed by the two runs.
export const RUN = {
  flat:      { turns: 4,  tools: 29, in: 11928, out: 3256 },
  manager:   { turns: 0,  tools: 14, in: 86,    out: 0 },
  subagents: { turns: 14, tools: 0,  in: 1976,  out: 56 },
};
export const MODELS = { flat: "claude-sonnet-5", manager: "claude-sonnet-5", subagent: "claude-haiku-4-5-20251001" };

export const COLORS = {
  finance: "#4f8cff", work: "#f5a524", personal: "#22c58b",
  base: "#64748b", list: "#94a3b8", move: "#a78bfa", system: "#5b6b8c", word: "#ffffff",
  agent: "#ef5f67", turn: "#f48a90", manager: "#7c5cff", subagent: "#22b8cf",
};
export const LEGEND = [
  ["base", "system prompt + tools + task"], ["list", "list_files output"], ["finance", "file body · finance"],
  ["work", "file body · work"], ["personal", "file body · personal"], ["move", "move_file result"],
  ["system", "subagent system prompt"], ["word", "one-word answer (output)"],
];

export const DURATION = 10000; // the whole animation: 10 seconds
const N = FILES.length;
const TOTAL_CHARS = FILES.reduce((s, f) => s + f.chars, 0); // 2,854

// ---------------------------------------------------------------------------
// Token splits. Totals come from the logs; the per-node split is an estimate
// that adds up exactly to those totals.
//   flat:  4 turns, each turn resends everything before it
//          4*BASE + 3*LIST + 2*READS + 14*MOVE = 11,928 input
//   sub :  each call = its own system prompt (~90 tok) + file snippet (chars/4)
//          14 calls = 1,976 input, 14 one-word answers = 56 output
// ---------------------------------------------------------------------------
const BASE = 2052, LIST = 140, READS = 1300, MOVE = 50;
const FILE_TOK = FILES.map((f) => (READS * f.chars) / TOTAL_CHARS);
const TURN_OUT = [60, 1400, 1700, 96]; // sums to 3,256
export const SUB_SYSTEM = (RUN.subagents.in - TOTAL_CHARS / 4) / N; // ≈ 90.2
const SUB_WORD = RUN.subagents.out / N; // 4

// ---------------------------------------------------------------------------
// Event streams: each event adds one node to a tree at time t (ms).
//   { t, id, parent, kind, tok, io: "in" | "out" | null, label, cat, tip }
// The tree at time T = all events with e.t <= T.
// ---------------------------------------------------------------------------
function flatEvents() {
  const ev = [{ t: 0, id: "agent", parent: null, kind: "agent", tok: 0, io: null, label: "Flat agent", tip: `${MODELS.flat} · one context` }];
  const turn = (k, t) => {
    ev.push({ t, id: `t${k}`, parent: "agent", kind: "turn", tok: TURN_OUT[k - 1], io: "out", label: `turn ${k}`, tip: `turn ${k}: request resends the whole context · ${TURN_OUT[k - 1]} output tok` });
  };
  const leaf = (k, t, key, kind, tok, tip, cat) =>
    ev.push({ t, id: `t${k}-${key}`, parent: `t${k}`, kind, tok, io: "in", cat, tip: `turn ${k} · ${tip} · ${Math.round(tok)} tok` });
  const files = (k, t0, step) => FILES.forEach((f, i) => leaf(k, t0 + i * step, `f${i}`, f.flat, FILE_TOK[i], f.name, f.flat));
  const moves = (k, t0, step) => FILES.forEach((f, i) => leaf(k, t0 + i * step, `m${i}`, "move", MOVE, `move ${f.name} → ${f.flat}`));

  turn(1, 150);  leaf(1, 300, "base", "base", BASE, "system + tools + task");
  turn(2, 800);  leaf(2, 950, "base", "base", BASE, "system + tools + task (resent)");
                 leaf(2, 1100, "list", "list", LIST, "list_files output");
  turn(3, 1500); leaf(3, 1650, "base", "base", BASE, "resent");
                 leaf(3, 1750, "list", "list", LIST, "resent");
                 files(3, 1900, 190);                       // the 14 bodies arrive
  turn(4, 4800); leaf(4, 4950, "base", "base", BASE, "resent");
                 leaf(4, 5050, "list", "list", LIST, "resent");
                 files(4, 5200, 140);                       // all 14 bodies resent
                 moves(4, 7300, 175);                       // + 14 move results
  return ev.sort((a, b) => a.t - b.t);
}

function subEvents() {
  const ev = [
    { t: 0, id: "mgr", parent: null, kind: "manager", tok: 0, io: null, label: "Manager", tip: `${MODELS.manager} · never reads a file` },
    { t: 250, id: "mgr-list", parent: "mgr", kind: "list", tok: RUN.manager.in, io: "in", tip: `manager context: list_files only · ${RUN.manager.in} tok` },
  ];
  FILES.forEach((f, i) => {
    const t = 600 + i * 660;
    ev.push({ t, id: `s${i}`, parent: "mgr", kind: "subagent", tok: 0, io: null, label: `#${i + 1}`, doneAt: t + 420,
      tip: `subagent #${i + 1} (${MODELS.subagent}) · fresh context for ${f.name}` });
    ev.push({ t: t + 90, id: `s${i}-sys`, parent: `s${i}`, kind: "system", tok: SUB_SYSTEM, io: "in", tip: `own system prompt · ${Math.round(SUB_SYSTEM)} tok` });
    ev.push({ t: t + 180, id: `s${i}-file`, parent: `s${i}`, kind: f.sub, tok: f.chars / 4, io: "in", cat: f.sub,
      tip: `${f.name} · saw ${f.chars} chars · ${Math.round(f.chars / 4)} tok` });
    ev.push({ t: t + 420, id: `s${i}-word`, parent: `s${i}`, kind: "word", tok: SUB_WORD, io: "out", cat: f.sub,
      tip: `returns "${f.sub}" · ${SUB_WORD} output tok → manager moves file` });
  });
  return ev.sort((a, b) => a.t - b.t);
}

export const FLAT_EVENTS = flatEvents();
export const SUB_EVENTS = subEvents();

// ---------------------------------------------------------------------------
// Token accounting at time T
// ---------------------------------------------------------------------------
export function tokensAt(events, T) {
  let input = 0, output = 0;
  for (const e of events) {
    if (e.t > T) break;
    if (e.io === "in") input += e.tok;
    else if (e.io === "out") output += e.tok;
  }
  return { input, output };
}

export function ledgerAt(T) {
  const f = tokensAt(FLAT_EVENTS, T);
  const s = tokensAt(SUB_EVENTS, T);
  const mgrIn = T >= 250 ? RUN.manager.in : 0;
  const turns = FLAT_EVENTS.filter((e) => e.kind === "turn" && e.t <= T);
  const lastTurn = turns.length ? turns[turns.length - 1].id : null;
  const spawned = SUB_EVENTS.filter((e) => e.kind === "subagent" && e.t <= T).length;
  return {
    flat: {
      in: f.input, out: f.output, turns: turns.length,
      context: FLAT_EVENTS.filter((e) => e.parent === lastTurn && e.t <= T).reduce((a, e) => a + e.tok, 0),
    },
    sub: { in: s.input, out: s.output, managerIn: mgrIn, subagentsIn: s.input - mgrIn, managerContext: mgrIn, spawned },
  };
}

// Pre-computed cumulative series for the token chart (one sample per 50 ms).
export const SERIES = (() => {
  const pts = [];
  for (let T = 0; T <= DURATION; T += 50) {
    const l = ledgerAt(T);
    pts.push({ T, flat: l.flat.in, sub: l.sub.in, mgr: l.sub.managerIn, flatOut: l.flat.out, subOut: l.sub.out });
  }
  return pts;
})();

export const nodeRadius = (e) =>
  e.kind === "agent" || e.kind === "manager" ? 13 : e.kind === "turn" ? 8 : e.kind === "subagent" ? 6.5 : Math.max(3, Math.sqrt(e.tok) * 0.5);
