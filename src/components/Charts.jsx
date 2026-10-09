import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { DURATION, SERIES, ledgerAt } from "../data.js";

const fmtN = d3.format(",.0f");
const C = { flat: "#ef5f67", sub: "#22b8cf", mgr: "#7c5cff" };

// Number that tweens with a d3 transition
export function AnimatedNumber({ value, dur = 300 }) {
  const ref = useRef(null);
  const last = useRef(0);
  useEffect(() => {
    const from = last.current; last.current = value;
    d3.select(ref.current).interrupt().transition().duration(dur)
      .tween("text", () => { const i = d3.interpolateNumber(from, value); return (t) => { if (ref.current) ref.current.textContent = fmtN(i(t)); }; });
  }, [value, dur]);
  return <span ref={ref}>0</span>;
}

// Cumulative input tokens over the 10 s run, revealed up to `elapsed`
export function TokenTimeline({ elapsed }) {
  const ref = useRef(null);
  const W = 640, H = 300, M = { t: 18, r: 150, b: 34, l: 56 };
  const x = d3.scaleLinear().domain([0, DURATION]).range([M.l, W - M.r]);
  const y = d3.scaleLinear().domain([0, 12500]).range([H - M.b, M.t]);
  const lines = [
    { key: "flat", label: "flat agent", color: C.flat },
    { key: "sub", label: "manager + subagents", color: C.sub },
    { key: "mgr", label: "manager only", color: C.mgr },
  ];

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    svg.append("defs").append("clipPath").attr("id", "tl-clip").append("rect").attr("x", 0).attr("y", 0).attr("height", H).attr("width", M.l);
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - M.b})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat((d) => d / 1000 + "s"));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${M.l},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")).tickSize(-(W - M.l - M.r)))
      .call((g) => g.selectAll(".tick line").attr("stroke-opacity", 0.15));
    svg.append("text").attr("class", "lbl-s").attr("transform", `translate(14,${H / 2}) rotate(-90)`).attr("text-anchor", "middle").text("cumulative input tokens");
    const g = svg.append("g").attr("clip-path", "url(#tl-clip)");
    for (const l of lines) {
      const area = d3.area().x((d) => x(d.T)).y0(y(0)).y1((d) => y(d[l.key])).curve(d3.curveStepAfter);
      const line = d3.line().x((d) => x(d.T)).y((d) => y(d[l.key])).curve(d3.curveStepAfter);
      if (l.key !== "mgr") g.append("path").attr("d", area(SERIES)).attr("fill", l.color).attr("opacity", 0.12);
      g.append("path").attr("d", line(SERIES)).attr("fill", "none").attr("stroke", l.color).attr("stroke-width", 2.4);
    }
    svg.append("line").attr("class", "cursor").attr("y1", M.t).attr("y2", H - M.b);
    const tag = svg.selectAll("g.tag").data(lines).join("g").attr("class", "tag");
    tag.append("circle").attr("r", 4).attr("fill", (d) => d.color);
    tag.append("text").attr("x", 8).attr("y", 4).attr("fill", (d) => d.color);
  }, []);

  useEffect(() => {
    const svg = d3.select(ref.current);
    const cx = x(elapsed);
    const p = SERIES[Math.min(SERIES.length - 1, Math.floor(elapsed / 50))];
    svg.select("#tl-clip rect").attr("width", cx);
    svg.select(".cursor").attr("x1", cx).attr("x2", cx);
    // keep the three labels from overlapping
    const ys = lines.map((l) => y(p[l.key]));
    const order = [0, 1, 2].sort((a, b) => ys[b] - ys[a]); // bottom first
    for (let k = 1; k < 3; k++) ys[order[k]] = Math.min(ys[order[k]], ys[order[k - 1]] - 13);
    svg.selectAll("g.tag").attr("transform", (d, i) => `translate(${cx},${ys[i]})`)
      .select("text").text((d) => `${d.label}: ${fmtN(p[d.key])}`);
  }, [elapsed]);

  return <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="viz" role="img" aria-label="Cumulative input tokens" />;
}

// Live bars: input and output tokens per solution
export function TokenBars({ elapsed }) {
  const ref = useRef(null);
  const W = 640, H = 300, LX = 190, RX = 560;
  const x = d3.scaleLinear().domain([0, 12000]).range([LX, RX]);
  const yOf = (i) => 30 + i * 40 + (i >= 3 ? 36 : 0);
  const rows = (T) => {
    const l = ledgerAt(T);
    return [
      { id: "fi", label: "flat agent", v: l.flat.in, c: C.flat },
      { id: "si", label: "manager + subagents", v: l.sub.in, c: C.sub },
      { id: "mi", label: "manager only", v: l.sub.managerIn, c: C.mgr },
      { id: "fo", label: "flat agent", v: l.flat.out, c: C.flat },
      { id: "so", label: "subagents (14 words)", v: l.sub.out, c: C.sub },
    ];
  };

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    svg.append("text").attr("class", "lbl-h").attr("x", 0).attr("y", 16).text("Input tokens");
    svg.append("text").attr("class", "lbl-h").attr("x", 0).attr("y", yOf(3) - 12).text("Output tokens");
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - 20})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("~s")));
    const g = svg.selectAll("g.b").data(rows(0), (d) => d.id).join("g").attr("class", "b").attr("transform", (d, i) => `translate(0,${yOf(i)})`);
    g.append("text").attr("class", "blabel").attr("x", LX - 10).attr("y", 18).attr("text-anchor", "end").text((d) => d.label);
    g.append("rect").attr("class", "btrack").attr("x", LX).attr("width", RX - LX).attr("height", 26).attr("rx", 5);
    g.append("rect").attr("class", "bfill").attr("x", LX).attr("height", 26).attr("rx", 5).attr("fill", (d) => d.c);
    g.append("text").attr("class", "bval").attr("y", 18);
  }, []);

  useEffect(() => {
    const g = d3.select(ref.current).selectAll("g.b").data(rows(elapsed), (d) => d.id);
    g.select(".bfill").attr("width", (d) => (d.v ? Math.max(2, x(d.v) - LX) : 0));
    g.select(".bval").attr("x", (d) => Math.max(LX + 2, x(d.v)) + 6).text((d) => fmtN(d.v));
  }, [elapsed]);

  return <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="viz" role="img" aria-label="Token bars" />;
}

