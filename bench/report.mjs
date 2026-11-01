// 결과표 — runs/<runId>/results.jsonl 을 모델 × 조건 × effort × 방식별로 묶는다.
//
// 사용법:
//   node bench/report.mjs            # 가장 최근 실행
//   node bench/report.mjs <runId>
//
// 지표 (Anthropic "Demystifying evals for AI agents"의 용어를 따른다):
//   정답률  숨은 테스트 통과 비율의 평균
//   완벽    38/38 통과한 회차 수 / 전체 회차
//   pass^3  한 회차가 완벽할 확률을 p라 할 때 3번 연속 완벽할 확률 p³
//   규칙별  테스트 이름 앞의 규칙 태그(R1, R4/R5 …)로 묶은 통과 비율

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONDITIONS, MODELS, MODES } from './conditions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNS = path.join(ROOT, 'runs');

const runId = process.argv[2] ?? (await fs.readdir(RUNS)).filter((d) => !d.startsWith('.')).sort().at(-1);
if (!runId) throw new Error('runs/ 에 실행 결과가 없습니다');
const runDir = path.join(RUNS, runId);

const rows = (await fs.readFile(path.join(runDir, 'results.jsonl'), 'utf8'))
  .trim()
  .split('\n')
  .map((line) => JSON.parse(line))
  // 1차 실행(effort · 방식 도입 전) 기록도 읽는다
  .map((r) => ({ effort: 'default', mode: 'solo', dir: path.join(r.model, r.condition, `rep${r.rep}`), ...r }));

// 회차별 테스트 결과 — grade.tap 의 최상위 ok / not ok 줄
for (const r of rows) {
  const tap = await fs.readFile(path.join(runDir, r.dir, 'grade.tap'), 'utf8').catch(() => '');
  r.tests = [...tap.matchAll(/^(ok|not ok) \d+ - (.+)$/gm)].map((m) => ({ name: m[2], ok: m[1] === 'ok' }));
  // 1차 실행은 생각 토큰을 따로 기록하지 않았다 → claude.json 에서 읽는다
  if (r.thinkingTokens === undefined) {
    const out = await fs.readFile(path.join(runDir, r.dir, 'claude.json'), 'utf8').then(JSON.parse, () => null);
    r.thinkingTokens = out?.usage?.output_tokens_details?.thinking_tokens ?? null;
  }
}

const TOTAL = 38;
const RULES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R8', 'R9'];
const rulesOf = (name) => name.split(':')[0].split('/');

const mean = (xs) => {
  const v = xs.filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const pct = (x) => (x == null ? '-' : `${(x * 100).toFixed(0)}%`);
const fix = (x, d, pre = '') => (x == null ? '-' : `${pre}${x.toFixed(d)}`);
const kTok = (x) => (x == null ? '-' : `${(x / 1000).toFixed(1)}k`);

// ---- 묶기 ----
const order = (list, key) => [...list, ...rows.map((r) => r[key])].filter((v, i, a) => a.indexOf(v) === i);
const groups = [];
for (const model of order(Object.keys(MODELS), 'model'))
  for (const condition of order(Object.keys(CONDITIONS), 'condition'))
    for (const effort of order(['default', 'low', 'medium', 'high', 'xhigh', 'max'], 'effort'))
      for (const mode of order(MODES, 'mode')) {
        const g = rows.filter((r) => r.model === model && r.condition === condition && r.effort === effort && r.mode === mode);
        if (g.length) groups.push({ model, condition, effort, mode, g });
      }

// 실행 안에서 값이 하나뿐인 열은 숨긴다
const varies = (key) => new Set(rows.map((r) => r[key])).size > 1;
const DIMS = [['조건', 'condition'], ['effort', 'effort'], ['방식', 'mode']];
const keyCols = [['모델', 'model'], ...DIMS.filter(([, k]) => varies(k))];
if (keyCols.length === 1) keyCols.push(DIMS[0]);
const head = (cols) => [`| ${cols.join(' | ')} |`, `|${cols.map((_, i) => (i < keyCols.length ? '---' : '---:')).join('|')}|`];
const keyCells = (grp) => keyCols.map(([, k]) => grp[k]);

const fixed = DIMS.filter(([, k]) => !keyCols.some(([, c]) => c === k)).map(([h, k]) => `- ${h}: ${rows[0][k]}`);

const lines = [`# 결과 — ${runId}`, '', ...fixed, ...(fixed.length ? [''] : [])];

// ---- 요약 ----
lines.push(...head([...keyCols.map(([h]) => h), '정답률', '완벽', 'pass^3', '비용', '시간', '턴', '출력', '생각', 'n']));
for (const grp of groups) {
  const { g } = grp;
  const perfect = g.filter((r) => r.pass === TOTAL).length;
  const p = perfect / g.length;
  lines.push(
    `| ${[
      ...keyCells(grp),
      pct(mean(g.map((r) => r.pass / TOTAL))),
      `${perfect}/${g.length}`,
      pct(p ** 3),
      fix(mean(g.map((r) => r.costUsd)), 3, '$'),
      `${fix(mean(g.map((r) => r.durationMs / 1000)), 0)}s`,
      fix(mean(g.map((r) => r.turns)), 1),
      kTok(mean(g.map((r) => r.outputTokens))),
      kTok(mean(g.map((r) => r.thinkingTokens))),
      g.length,
    ].join(' | ')} |`,
  );
}

// ---- 규칙별 ----
lines.push('', '## 규칙별 정답률', '', ...head([...keyCols.map(([h]) => h), ...RULES]));
for (const grp of groups) {
  const cells = RULES.map((rule) => {
    const ts = grp.g.flatMap((r) => r.tests).filter((t) => rulesOf(t.name).includes(rule));
    return ts.length ? pct(ts.filter((t) => t.ok).length / ts.length) : '-';
  });
  lines.push(`| ${[...keyCells(grp), ...cells].join(' | ')} |`);
}

// ---- 자주 틀린 테스트 ----
const failCount = new Map();
for (const r of rows) for (const t of r.tests) if (!t.ok) failCount.set(t.name, (failCount.get(t.name) ?? 0) + 1);
if (failCount.size) {
  lines.push('', '## 자주 틀린 테스트', '', '| 틀린 횟수 | 테스트 |', '|---:|---|');
  for (const [name, n] of [...failCount].sort((a, b) => b[1] - a[1])) lines.push(`| ${n}/${rows.length} | ${name} |`);
}

// ---- 실행별 ----
lines.push(
  '',
  '## 실행별',
  '',
  ...head([...keyCols.map(([h]) => h), '회차', '통과', '비용', '시간', '턴', '도구', '거부']),
);
for (const r of rows)
  lines.push(
    `| ${[
      ...keyCols.map(([, k]) => r[k]),
      r.rep,
      `${r.pass}/${TOTAL}`,
      fix(r.costUsd, 3, '$'),
      `${fix(r.durationMs / 1000, 0)}s`,
      r.turns ?? '-',
      r.toolUses ?? '-',
      r.permissionDenials ?? '-',
    ].join(' | ')} |`,
  );

const md = lines.join('\n') + '\n';
await fs.writeFile(path.join(runDir, 'report.md'), md);
console.log(md);
