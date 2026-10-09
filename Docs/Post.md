# Are you preparing for Anthropic Developer Certification 📎

This demo help you understand agentic loop and tool callin with _single agent_ and _manager + subagents_ design.

![Subagents](./Subagents.gif)

---

## 🧪 The experiment

Two agents get the same job: **sort 14 loose files** (resumes, bills, meeting notes, a grocery list…) into `finance`, `work` or `personal`.

**1️⃣ The flat agent**
One conversation, one context window. It reads all 14 files and then moves them.
Every file it reads **stays in its context**. On every later turn it resends the full text of the grocery list, the wedding invite and the electricity bill, long after it has decided each file's folder.

**2️⃣ The manager with subagents**
The manager **never reads a file**. For each file it starts a fresh, throwaway conversation on a smaller model:

```
Subagent gets:  "Here are 198 characters. One word: which folder?"
Subagent says:  "finance"
Subagent is thrown away.
```

The file body lives and dies inside that subagent. The manager only ever sees **one word**.

---

## 📊 The numbers

|                               | Input tokens | Output tokens |
| ----------------------------- | -----------: | ------------: |
| 🔴 Flat agent (one context)   |   **11,928** |         3,256 |
| 🟣 Manager only               |       **86** |             0 |
| 🔵 Manager + all 14 subagents |    **2,062** |            56 |

➡️ The manager's context is **~139× smaller**.
➡️ Total input is **~5.8× lower**, even counting all 14 subagents.
➡️ And the part that matters most: the manager's context **stays at ~86 tokens whether there are 14 files or 1,400.**

---

## 💡 What I took away

✅ **Evidence is big. The conclusion is one word.** Only the conclusion needed to come back.

✅ **A subagent is a separate conversation**, with its own context, prompt and tools. It's not a separate library.

✅ **Delegation buys context isolation.** The manager's context stops growing with the size of the job. Cheaper models per subtask and parallel execution are bonuses.

⚠️ **It is not automatically cheaper.** About 90 of each subagent's ~141 input tokens are its own system prompt. Small tasks can cost more when you delegate them.

⚠️ **Isolation has a price.** The specialist loses the bigger picture. In my run, one file (a rent receipt) went to `finance` with the flat agent and to `personal` with the subagent. **Validate what comes back.**

---

## 🛠️ How the visual works

Built with **React + D3.js**:

🌳 Two **force-directed trees** (d3-force) grow over a 10-second timeline. Node area is proportional to tokens. The flat agent's tree keeps **duplicating** the same file bodies on every turn; each subagent branch **fades** as soon as it returns its answer.

📈 A live **cumulative token chart** and comparison bars that land exactly on the logged totals from both runs.

🐍 Underneath, the agents are a hand-written agentic loop on the Claude Messages API: **Claude Sonnet** as the manager, **Claude Haiku** as the subagent.

## 🔗 The full agentic loop, both runs and the D3 visual are in the repo. Clone it, swap in your own files and watch the two trees grow. We build multi-agent systems because a single agent’s context grows with every file it touches, while a manager that delegates keeps only the conclusions and can scale from 14 tasks to 1,400 without drowning in its own history.

#AI #AgenticAI #MultiAgentSystems #LLM #ContextEngineering #Claude #D3js #DataVisualization #SoftwareEngineering
