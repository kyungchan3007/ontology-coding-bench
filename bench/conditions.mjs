// 실험 조건 — 조건마다 작업 폴더에 넣을 지식 문서만 다르다. task/TASK.md는 모든 조건에 들어간다.

export const CONDITIONS = {
  'task-only': [],
  ontology: ['ontology.md'],
  spec: ['prd.md', 'sdd.md'],
  both: ['ontology.md', 'prd.md', 'sdd.md'],
};

// 별칭(haiku, sonnet)은 최신 모델이 아닌 버전으로 연결될 수 있어 ID를 직접 쓴다.
export const MODELS = {
  haiku: 'claude-haiku-5-5',
  sonnet: 'claude-sonnet-5-5',
};

// 작업 폴더의 CLAUDE.md. 조건마다 넣은 문서 목록만 다르다.
export function claudeMd(files) {
  const lines = ['# 작업 안내', '', '- 과제: `TASK.md`'];
  if (files.length) {
    lines.push('- 규정 문서:');
    for (const f of files) lines.push(`  - \`${f}\``);
  }
  return lines.join('\n') + '\n';
}

export const PROMPT =
  'TASK.md에 적힌 과제를 수행해 leave.js를 만들어라. 사용자에게 질문하지 말고 끝까지 완성하라.';
