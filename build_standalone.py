"""Generate standalone.html (no npm needed) from the React sources in src/.
React, ReactDOM, D3 and Babel are loaded from cdnjs, so an internet connection is required."""
import re, pathlib
root = pathlib.Path(__file__).parent
order = ["src/data.js", "src/components/Charts.jsx", "src/components/ForceTree.jsx", "src/App.jsx"]
code = []
for p in order:
    s = (root / p).read_text(encoding="utf-8")
    s = re.sub(r'^import[^\n]*\n', '', s, flags=re.M)
    s = re.sub(r'^export default function', 'function', s, flags=re.M)
    s = re.sub(r'^export (const|function)', r'\1', s, flags=re.M)
    code.append(f"// ===== {p} =====\n{s}")
css = (root / "src/styles.css").read_text(encoding="utf-8")
CDN = "https://cdnjs.cloudflare.com/ajax/libs"
html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Flat agent vs Manager + Subagents · D3 (standalone)</title>
<style>
{css}
</style>
<script src="{CDN}/react/18.3.1/umd/react.production.min.js"></script>
<script src="{CDN}/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="{CDN}/d3/7.9.0/d3.min.js"></script>
<script src="{CDN}/babel-standalone/7.29.0/babel.min.js"></script>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
const {{ useState, useEffect, useRef }} = React;
{chr(10).join(code)}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
</script>
</body>
</html>
"""
(root / "standalone.html").write_text(html, encoding="utf-8")
print("wrote standalone.html", len(html), "bytes")
