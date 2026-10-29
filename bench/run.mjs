// 실험 실행 — 모델 × 조건 × 반복마다 빈 폴더에서 Claude Code에 과제를 주고 숨은 테스트로 채점한다.
//
// 사용법:
//   node bench/run.mjs                                   # 전체 (모델 2 × 조건 4 × 3회)
//   node bench/run.mjs --models sonnet --conditions spec --reps 1
//   node bench/run.mjs --concurrency 2
//
// 결과: runs/<runId>/results.jsonl, runs/<runId>/<model>/<condition>/rep<n>/

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONDITIONS, MODELS, PROMPT, claudeMd } from './conditions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST_FILE = path.join(ROOT, 'hidden/tests/leave.test.mjs');
const CLAUDE_TIMEOUT_MS = 10 * 60 * 1000;
const GRADE_TIMEOUT_MS = 60 * 1000;

// ---- 인자 ----
function parseArgs(argv) {
  const opts = { models: Object.keys(MODELS), conditions: Object.keys(CONDITIONS), reps: 3, concurrency: 1 };
  for (let i = 0; i < argv.length; i += 2) {
    const [key, value] = [argv[i], argv[i + 1]];
    if (key === '--models') opts.models = value.split(',');
    else if (key === '--conditions') opts.conditions = value.split(',');
    else if (key === '--reps') opts.reps = Number(value);
    else if (key === '--concurrency') opts.concurrency = Number(value);
    else throw new Error(`알 수 없는 인자: ${key}`);
  }
  for (const c of opts.conditions) if (!CONDITIONS[c]) throw new Error(`알 수 없는 조건: ${c}`);
  for (const m of opts.models) if (!MODELS[m]) throw new Error(`알 수 없는 모델: ${m}`);
  return opts;
}

// ---- 프로세스 실행 ----
// Claude Code 안에서 이 스크립트를 돌리면 부모 세션의 변수가 자식 claude로 넘어가 API 오류가 난다
const PARENT_SESSION_VARS = ['ANTHROPIC_BASE_URL', 'CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT'];

function exec(cmd, args, { cwd, env, timeoutMs }) {
  return new Promise((resolve) => {
    const childEnv = { ...process.env, ...env };
    for (const v of PARENT_SESSION_VARS) delete childEnv[v];
    const child = spawn(cmd, args, { cwd, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, timedOut: signal === 'SIGKILL' });
    });
  });
}

// ---- 작업 폴더 준비 ----
// 저장소 밖 임시 폴더에 만든다. 저장소 안에 두면 상위 폴더의 hidden/ 을 볼 수 있다.
async function prepareWorkdir(condition) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `leave-${condition}-`));
  await fs.copyFile(path.join(ROOT, 'task/TASK.md'), path.join(dir, 'TASK.md'));
  for (const f of CONDITIONS[condition]) await fs.copyFile(path.join(ROOT, 'knowledge', f), path.join(dir, f));
  await fs.writeFile(path.join(dir, 'CLAUDE.md'), claudeMd(CONDITIONS[condition]));
  return dir;
}

// ---- Claude Code 실행 ----
async function runClaude(model, cwd) {
  const args = [
    '-p', PROMPT,
    '--model', MODELS[model],
    '--output-format', 'json',
    '--permission-mode', 'dontAsk',
    '--allowedTools', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash(node:*)', 'Bash(ls:*)', 'Bash(cat:*)',
    '--setting-sources', 'project',
    '--strict-mcp-config',
    '--no-session-persistence',
  ];
  const started = Date.now();
  const res = await exec('claude', args, { cwd, timeoutMs: CLAUDE_TIMEOUT_MS });
  let out = null;
  try {
    out = JSON.parse(res.stdout);
  } catch {}
  return { res, out, wallMs: Date.now() - started };
}

// ---- 채점 ----
async function grade(leavePath) {
  try {
    await fs.access(leavePath);
  } catch {
    return { pass: 0, total: 0, missing: true, tap: '' };
  }
  const res = await exec('node', ['--test', '--test-reporter=tap', TEST_FILE], {
    cwd: ROOT,
    env: { LEAVE_MODULE: leavePath },
    timeoutMs: GRADE_TIMEOUT_MS,
  });
  const num = (name) => Number(res.stdout.match(new RegExp(`^# ${name} (\\d+)`, 'm'))?.[1] ?? 0);
  return { pass: num('pass'), total: num('tests'), missing: false, timedOut: res.timedOut, tap: res.stdout };
}

// ---- 한 번 실행 ----
async function runOne({ runDir, model, condition, rep }) {
  const label = `${model}/${condition}/rep${rep}`;
  const outDir = path.join(runDir, model, condition, `rep${rep}`);
  await fs.mkdir(outDir, { recursive: true });

  const work = await prepareWorkdir(condition);
  const { res, out, wallMs } = await runClaude(model, work);

  // 결과물을 저장소로 복사한 뒤 그 사본을 채점한다
  await fs.cp(work, path.join(outDir, 'work'), { recursive: true });
  await fs.writeFile(path.join(outDir, 'claude.json'), res.stdout || '');
  if (res.stderr) await fs.writeFile(path.join(outDir, 'claude.stderr.txt'), res.stderr);
  const g = await grade(path.join(outDir, 'work', 'leave.js'));
  await fs.writeFile(path.join(outDir, 'grade.tap'), g.tap);
  await fs.rm(work, { recursive: true, force: true });

  const result = {
    model,
    modelIds: out?.modelUsage ? Object.keys(out.modelUsage) : [],
    condition,
    rep,
    pass: g.pass,
    total: g.total,
    leaveMissing: g.missing,
    costUsd: out?.total_cost_usd ?? null,
    durationMs: out?.duration_ms ?? wallMs,
    turns: out?.num_turns ?? null,
    inputTokens: out?.usage ? (out.usage.input_tokens ?? 0) + (out.usage.cache_read_input_tokens ?? 0) + (out.usage.cache_creation_input_tokens ?? 0) : null,
    outputTokens: out?.usage?.output_tokens ?? null,
    claudeError: out ? Boolean(out.is_error) : true,
    claudeTimedOut: res.timedOut,
  };
  await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2));
  await fs.appendFile(path.join(runDir, 'results.jsonl'), JSON.stringify(result) + '\n');

  const cost = result.costUsd == null ? '-' : `$${result.costUsd.toFixed(3)}`;
  console.log(`${label.padEnd(28)} ${String(g.pass).padStart(2)}/${g.total || 38}  ${cost}  ${(result.durationMs / 1000).toFixed(0)}s  turns ${result.turns ?? '-'}`);
  return result;
}

// ---- 메인 ----
const opts = parseArgs(process.argv.slice(2));
const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const runDir = path.join(ROOT, 'runs', runId);
await fs.mkdir(runDir, { recursive: true });
await fs.writeFile(path.join(runDir, 'config.json'), JSON.stringify({ ...opts, prompt: PROMPT }, null, 2));

const jobs = [];
for (let rep = 1; rep <= opts.reps; rep++)
  for (const model of opts.models)
    for (const condition of opts.conditions) jobs.push({ runDir, model, condition, rep });

console.log(`runId ${runId} — ${jobs.length}회 실행 (동시 ${opts.concurrency})`);
let next = 0;
await Promise.all(
  Array.from({ length: opts.concurrency }, async () => {
    while (next < jobs.length) await runOne(jobs[next++]);
  }),
);
console.log(`완료 → node bench/report.mjs ${runId}`);
