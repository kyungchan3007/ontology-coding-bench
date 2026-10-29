// 결과표 — runs/<runId>/results.jsonl 을 모델 × 조건별 평균으로 묶는다.
//
// 사용법:
//   node bench/report.mjs            # 가장 최근 실행
//   node bench/report.mjs <runId>

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONDITIONS, MODELS } from './conditions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNS = path.join(ROOT, 'runs');

const runId = process.argv[2] ?? (await fs.readdir(RUNS)).filter((d) => !d.startsWith('.')).sort().at(-1);
if (!runId) throw new Error('runs/ 에 실행 결과가 없습니다');
const runDir = path.join(RUNS, runId);

const rows = (await fs.readFile(path.join(runDir, 'results.jsonl'), 'utf8'))
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line));

const mean = (xs) => {
  const v = xs.filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const TOTAL = 38;

const lines = [
  `# 결과 — ${runId}`,
  '',
  '| 모델 | 조건 | 정답률 | 비용 | 시간 | 턴 | n |',
  '|---|---|---:|---:|---:|---:|---:|',
];
const models = [...Object.keys(MODELS), ...rows.map((r) => r.model)].filter((m, i, a) => a.indexOf(m) === i);
for (const model of models) {
  for (const condition of Object.keys(CONDITIONS)) {
    const g = rows.filter((r) => r.model === model && r.condition === condition);
    if (!g.length) continue;
    const acc = mean(g.map((r) => r.pass / TOTAL));
    const cost = mean(g.map((r) => r.costUsd));
    const sec = mean(g.map((r) => r.durationMs / 1000));
    const turns = mean(g.map((r) => r.turns));
    lines.push(
      `| ${model} | ${condition} | ${(acc * 100).toFixed(0)}% | ${cost == null ? '-' : `$${cost.toFixed(3)}`} | ${sec.toFixed(0)}s | ${turns == null ? '-' : turns.toFixed(1)} | ${g.length} |`,
    );
  }
}

lines.push('', '## 실행별', '', '| 모델 | 조건 | 회차 | 통과 | 비용 | 시간 |', '|---|---|---:|---:|---:|---:|');
for (const r of rows)
  lines.push(
    `| ${r.model} | ${r.condition} | ${r.rep} | ${r.pass}/${TOTAL} | ${r.costUsd == null ? '-' : `$${r.costUsd.toFixed(3)}`} | ${(r.durationMs / 1000).toFixed(0)}s |`,
  );

const md = lines.join('\n') + '\n';
await fs.writeFile(path.join(runDir, 'report.md'), md);
console.log(md);
