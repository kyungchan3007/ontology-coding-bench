// 실험 조건 — 조건마다 작업 폴더에 넣을 지식 문서만 다르다. task/TASK.md는 모든 조건에 들어간다.

export const CONDITIONS = {
  'task-only': [],
  ontology: ['ontology.md'],
  spec: ['prd.md', 'sdd.md'],
  both: ['ontology.md', 'prd.md', 'sdd.md'],
  'source-only': ['source.md'],
};

// 별칭(haiku, sonnet)은 최신 모델이 아닌 버전으로 연결될 수 있어 ID를 직접 쓴다.
export const MODELS = {
  haiku: 'claude-haiku-5-5',
  sonnet: 'claude-sonnet-5-5',
};

// --effort 값. 지정하지 않으면 모델 기본값(default).
export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

// 진행 방식 — 역할마다 별도 세션, 같은 모델, 파일로만 주고받는다.
//   solo:     구현
//   plan-gen: 계획(PLAN.md) → 구현 (구현 담당은 PLAN.md만 본다)
//   gen-eval: 구현 → 평가(REVIEW.md) → 수정
export const MODES = ['solo', 'plan-gen', 'gen-eval'];

// 작업 폴더의 CLAUDE.md. 조건마다 넣은 문서 목록만 다르다.
export function claudeMd(files, label = '규정 문서') {
  const lines = ['# 작업 안내', '', '- 과제: `TASK.md`'];
  if (files.length) {
    lines.push(`- ${label}:`);
    for (const f of files) lines.push(`  - \`${f}\``);
  }
  return lines.join('\n') + '\n';
}

const NO_QUESTIONS = '사용자에게 질문하지 말고 끝까지 완성하라.';

export const PROMPT = `TASK.md에 적힌 과제를 수행해 leave.js를 만들어라. ${NO_QUESTIONS}`;

export const PLAN_PROMPT =
  '너는 계획 담당이다. 규정 문서와 TASK.md를 읽고, 구현 담당이 PLAN.md 하나만 보고 leave.js를 만들 수 있도록 설계 문서 PLAN.md를 작성하라. ' +
  `규칙 · 예시 · 경계값을 빠짐없이 옮겨라. 코드는 작성하지 마라. ${NO_QUESTIONS}`;

export const EVAL_PROMPT =
  '너는 검수 담당이다. 구현 담당이 만든 leave.js가 규정 문서를 정확히 따르는지 검사하라. ' +
  '규정의 예시와 경계값으로 테스트 스크립트를 eval/ 폴더에 직접 만들어 node로 실행하라. ' +
  '규정과 다른 동작을 근거(규정 위치 · 입력 · 기대값 · 실제값)와 함께 REVIEW.md에 적어라. ' +
  `문제가 없다고 쉽게 결론 내리지 말고 의심하라. leave.js는 수정하지 마라. ${NO_QUESTIONS}`;

export const FIX_PROMPT =
  'REVIEW.md는 검수 담당이 leave.js를 검사한 결과다. 지적을 규정 문서와 대조해 맞는 지적이면 leave.js를 고쳐라. ' +
  NO_QUESTIONS;
