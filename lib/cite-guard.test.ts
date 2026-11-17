// Cite guard: every dated plan-doc filename cited in a tracked file
// (YYYY-MM-DD-<slug>.md) must resolve to a tracked file of that basename.
// Catches cites left dangling when a doc is deleted or renamed.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CITE = /\d{4}-\d{2}-\d{2}-[\w.-]+\.md/g;

// Known dangles accepted as of the guard's introduction. Each entry is a
// cited basename; remove it once its cite is fixed (a stale entry fails too).
const BASELINE: string[] = [];

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

function findDangles(): Map<string, string[]> {
  const files = trackedFiles();
  const known = new Set(files.map((f) => basename(f)));
  const dangles = new Map<string, string[]>();
  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(join(ROOT, file), "utf8");
    } catch {
      continue; // listed but absent from the working tree
    }
    if (text.includes("\0")) continue; // binary
    for (const m of text.matchAll(CITE)) {
      const cited = m[0];
      if (known.has(cited)) continue;
      dangles.set(cited, [...(dangles.get(cited) ?? []), file]);
    }
  }
  return dangles;
}

describe("dated doc cites", () => {
  const dangles = findDangles();

  it("resolve to tracked files (outside the baseline)", () => {
    const unexpected = [...dangles]
      .filter(([cited]) => !BASELINE.includes(cited))
      .map(([cited, from]) => `${cited} <- ${[...new Set(from)].join(", ")}`);
    expect(unexpected).toEqual([]);
  });

  it("baseline lists only still-dangling cites", () => {
    expect(BASELINE.filter((b) => !dangles.has(b))).toEqual([]);
  });
});
