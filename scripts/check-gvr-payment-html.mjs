import { readFileSync } from "node:fs";
import vm from "node:vm";

const files = [
  "frontend/confirmar-gvr.html",
  "frontend/confirmaciones-gvr.html",
];

let checked = 0;
for (const file of files) {
  const html = readFileSync(file, "utf8");
  const blocks = [...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)];
  for (const [index, match] of blocks.entries()) {
    const source = match[1].trim();
    if (!source) continue;
    new vm.Script(source, { filename: `${file}#inline-script-${index + 1}` });
    checked++;
  }
}
if (checked === 0) throw new Error("No inline JavaScript blocks were checked.");
console.log(`Validated ${checked} inline JavaScript blocks across the GVR payment pages.`);
