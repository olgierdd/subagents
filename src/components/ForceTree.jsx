import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { COLORS, nodeRadius } from "../data.js";

// Force-directed tree after https://observablehq.com/@d3/force-directed-tree
// (link + many-body + x/y forces, drag), extended so nodes are added over time
// and sized by tokens (area ∝ tokens).
const W = 460, H = 420;

const fillOf = (d) => COLORS[d.kind] ?? "#999";

export default function ForceTree({ events, elapsed }) {
  const ref = useRef(null);
  const st = useRef({ nodes: [], byId: new Map(), sim: null });

  // one-time setup: svg layers + simulation
  useEffect(() => {
    const svg = d3.select(ref.current).attr("viewBox", [-W / 2, -H / 2, W, H]);
    svg.selectAll("*").remove();
    svg.append("g").attr("class", "links");
    svg.append("g").attr("class", "nodes");
    svg.append("g").attr("class", "labels");

    const sim = d3.forceSimulation()
      .force("link", d3.forceLink().id((d) => d.id).distance((l) => l.source.r + l.target.r + 12).strength(1))
      .force("charge", d3.forceManyBody().strength(-110))
      .force("collide", d3.forceCollide((d) => d.r + 1.2))
      .force("x", d3.forceX().strength(0.05))
      .force("y", d3.forceY().strength(0.05))
      .on("tick", () => {
        const pad = 14;
        for (const n of st.current.nodes) {
          n.x = Math.max(-W / 2 + pad, Math.min(W / 2 - pad, n.x));
          n.y = Math.max(-H / 2 + pad, Math.min(H / 2 - pad, n.y));
        }
        svg.select(".links").selectAll("line")
          .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
        svg.select(".nodes").selectAll("circle").attr("cx", (d) => d.x).attr("cy", (d) => d.y);
        svg.select(".labels").selectAll("text").attr("x", (d) => d.x).attr("y", (d) => d.y - d.r - 4);
      });
    st.current.sim = sim;
    return () => sim.stop();
  }, []);

  // grow the tree as time passes
  useEffect(() => {
    const s = st.current;
    const svg = d3.select(ref.current);
    const visible = events.filter((e) => e.t <= elapsed);

    if (visible.length < s.nodes.length) { s.nodes = []; s.byId = new Map(); } // reset / replay

    if (visible.length > s.nodes.length) {
      for (const e of visible.slice(s.nodes.length)) {
        const p = s.byId.get(e.parent);
        const a = Math.random() * 2 * Math.PI;
        const n = { ...e, r: nodeRadius(e), x: p ? p.x + Math.cos(a) * 12 : 0, y: p ? p.y + Math.sin(a) * 12 : 0 };
        s.nodes.push(n); s.byId.set(n.id, n);
      }
      const links = s.nodes.filter((n) => n.parent).map((n) => ({ source: n.parent, target: n.id, kind: n.kind }));

      s.sim.nodes(s.nodes);
      s.sim.force("link").links(links);
      s.sim.alpha(0.55).restart();

      svg.select(".links").selectAll("line").data(links, (d) => d.target.id ?? d.target)
        .join((en) => en.append("line").attr("stroke-opacity", 0).call((l) => l.transition().duration(400).attr("stroke-opacity", 0.55)));

      svg.select(".nodes").selectAll("circle").data(s.nodes, (d) => d.id)
        .join((en) => en.append("circle")
          .attr("r", 0)
          .attr("fill", fillOf)
          .attr("stroke", (d) => (d.kind === "word" ? COLORS[d.cat] : d.children ? null : "#0b1020"))
          .attr("stroke-width", (d) => (d.kind === "word" ? 2 : 1))
          .call((c) => c.append("title").text((d) => d.tip))
          .call(drag(s.sim))
          .call((c) => c.transition().duration(500).ease(d3.easeBackOut.overshoot(2)).attr("r", (d) => d.r)));

      svg.select(".labels").selectAll("text").data(s.nodes.filter((n) => n.label), (d) => d.id)
        .join((en) => en.append("text").attr("text-anchor", "middle")
          .attr("class", (d) => "nlabel nl-" + d.kind).text((d) => d.label)
          .attr("opacity", 0).call((t) => t.transition().duration(400).attr("opacity", 1)));
    }

    // subagent that has answered: its context is discarded -> dim it and its leaves (not the word)
    const done = new Set(s.nodes.filter((n) => n.doneAt != null && elapsed >= n.doneAt).map((n) => n.id));
    svg.select(".nodes").selectAll("circle")
      .attr("opacity", (d) => ((done.has(d.id) || (done.has(d.parent) && d.kind !== "word")) ? 0.28 : 1));
    svg.select(".labels").selectAll("text").attr("opacity", (d) => (done.has(d.id) ? 0.35 : 1));
  }, [elapsed, events]);

  return <svg ref={ref} className="viz tree" role="img" aria-label="force-directed tree" />;
}

function drag(simulation) {
  return d3.drag()
    .on("start", (event) => { if (!event.active) simulation.alphaTarget(0.3).restart(); event.subject.fx = event.subject.x; event.subject.fy = event.subject.y; })
    .on("drag", (event) => { event.subject.fx = event.x; event.subject.fy = event.y; })
    .on("end", (event) => { if (!event.active) simulation.alphaTarget(0); event.subject.fx = null; event.subject.fy = null; });
}
