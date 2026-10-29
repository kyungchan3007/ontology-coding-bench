<div align="center">

# 🧪 ontology-coding-bench

**코딩 AI에게 온톨로지를 주면 정말 더 잘 짤까?**

같은 과제를 지식 문서만 바꿔 가며 Claude Code에 시키고, 숨은 테스트로 채점합니다.

![Node](https://img.shields.io/badge/node-22-339933?logo=node.js&logoColor=white)
![Tests](https://img.shields.io/badge/hidden%20tests-38-blue)
![Models](https://img.shields.io/badge/models-Haiku%205.5%20·%20Sonnet%205.5-8A2BE2)
![Status](https://img.shields.io/badge/status-1차%20실행%20완료-brightgreen)

</div>

---

## 📌 한눈에 보기

- **질문**: 온톨로지 · PRD · SDD 중 무엇을 주면 정확하고 싸게 코드를 짜는가?
- **과제**: 가상회사 '온톨컴퍼니'의 연차휴가 모듈 `leave.js` 만들기
- **방법**: 조건마다 빈 폴더 → 같은 과제 → 다른 지식 문서 → 숨은 테스트 채점
- **측정**: 정답률 · 비용(USD) · 시간 · 턴 수
- **반복**: 조건마다 3회

---

## 📊 결과 (2026-10-29, 24회)

### 정답률

| 조건 | Haiku 5.5 | Sonnet 5.5 |
|---|---:|---:|
| task-only | 44% | 47% |
| ontology | 100% | 100% |
| spec | 100% | 100% |
| both | 100% | 100% |

### 1회 평균 비용

| 조건 | Haiku 5.5 | Sonnet 5.5 |
|---|---:|---:|
| task-only | $1.41 | $0.38 |
| ontology | $1.18 | $0.45 |
| spec | **$0.92** | **$0.39** |
| both | $1.11 | $0.48 |

### 1회 평균 시간 · 턴

| 조건 | Haiku 5.5 | Sonnet 5.5 |
|---|---:|---:|
| task-only | 199s · 6.0 | 60s · 6.0 |
| ontology | 130s · 6.7 | 68s · 6.3 |
| spec | **100s** · 7.3 | **49s** · 6.7 |
| both | 114s · 10.7 | 64s · 8.0 |

### 정리

- **지식을 하나라도 주면 100%**, 안 주면 절반도 못 맞힘
- **spec(PRD+SDD)이 가장 싸고 빠름** — 두 모델 모두
- **both는 spec보다 비쌈** — Haiku +21%, Sonnet +24%
  - 턴도 늘어남 (Haiku 7.3 → 10.7)
- **ontology는 spec보다 비쌈** — Haiku +29%, Sonnet +17%
  - 원 영상(거의 같음)과 다른 점
- **Haiku가 Sonnet보다 2.4~3.7배 비쌈**
  - 출력 토큰이 약 3.7배 (31k vs 8.5k)
  - 더 오래 짜고 더 많이 확인함
- 원 영상과 같은 방향: **작은 과제에서는 스펙 하나면 충분**
- 총비용: $18.97

### task-only가 틀린 곳 (6회 중)

| 틀린 횟수 | 테스트 |
|---:|---|
| 6/6 | 근속 1년 → 14일 |
| 6/6 | 1주년 다음 달 1일에 14일 |
| 6/6 | 월 발생 11일 상한 |
| 6/6 | 연간 상한 25일 |
| 6/6 | 출근율 80% 미만 처리 |
| 6/6 | 전년 잔여 이월 없음 |
| 6/6 | 수당 0.5일 내림 |
| 1/6 | 근속 2년 → 15일 |

- 모델은 **근로기준법(기본 15일)** 을 기본값으로 짐작
  - 그래서 "근속 2년 → 15일"은 대부분 우연히 맞음
- 회사만 아는 규칙(1주년 다음 달, 수당 내림, 이월 없음)은 전부 틀림
- 원본 결과: [`results/2026-10-29-run1.md`](results/2026-10-29-run1.md)

---

## 🤔 왜 이 실험을 하나

- 출발점: [단테](https://www.youtube.com/watch?v=bZJa_I8EnUc) 채널의 온톨로지 실험 영상
- 영상에서 따릉이 요금 모듈로 비교했더니:
  - 지식을 하나라도 넣으면 정답률 100%
  - 온톨로지 + 스펙을 둘 다 넣으면 비용 · 시간만 늘어남
- 그런데 그 과제는 **함수 하나짜리 작은 과제**였음
- 이 저장소는 다음을 다시 재 봅니다
  - 모델이 **미리 알 수 없는** 회사 규칙이 많으면?
  - 규칙끼리 얽힌 **경계값 함정**이 많으면?
  - 값을 **JSON 한 곳**에만 두면? (원 실험에서 재지 않은 조건)

---

## 🏢 도메인: 온톨컴퍼니 연차휴가

> 가상회사 규정이라 근로기준법과 다릅니다. 모델이 "상식"으로 맞히지 못하게 일부러 비틀었습니다.

| 규칙 | 내용 |
|---|---|
| 1년 미만 | 개근한 달마다 1일 (최대 11일) |
| 첫 연간 연차 | 1주년 달의 다음 달 1일에 14일 |
| 이후 | 매년 1월 1일, 14일 + 근속 1년당 1일 |
| 상한 | 25일 |
| 출근율 80% 미만 | 개근월 수만큼만 |
| 출근 간주 | 육아휴직 · 산재 휴업 · 예비군 |
| 사용 단위 | 1일 · 반차 · 반반차 |
| 미사용 연차 | 소멸 없이 수당 지급 |
| 1일 통상임금 | 연봉 ÷ 12 ÷ 209 × 8 |
| 수당 일수 | 0.5일 단위 내림 |

- 전체 규정: [`knowledge/source.md`](knowledge/source.md)
- 원본에서 정하지 않은 것 3개 → 각 문서에 **미정**으로 표시
- 숨은 테스트는 미정 항목을 건드리지 않음
- R7(사용 순서)은 결과에 영향이 없어 테스트하지 않음

---

## 🪤 숨은 테스트가 노리는 함정

- 1주년 **당일**에는 14일이 아직 없음 → 다음 달 1일에 생김
- 1월 1일 입사자는 첫 기준일에 **15일** (근속 2년)
- 12월 입사자는 1월 1일에 14일 **한 번만** (28일 아님)
- 결근 52일은 정상, **53일**부터 출근율 80% 미만
- 육아휴직 달은 **개근월**로 셈
- 작년 남은 연차로 올해 신청 **불가** (연말에 수당으로 정산)
- 잔여 8.75일 → 수당은 **8.5일분**

---

## 🧫 실험 조건

> 모든 조건에 [`task/TASK.md`](task/TASK.md)는 똑같이 들어갑니다. 바뀌는 건 지식 문서뿐입니다.

| 조건 | 넣는 지식 문서 |
|---|---|
| `task-only` | 없음 |
| `ontology` | ontology.md |
| `spec` | prd.md + sdd.md |
| `both` | ontology + prd + sdd |

| 모델 | ID |
|---|---|
| haiku | claude-haiku-5-5 |
| sonnet | claude-sonnet-5-5 |

- 조건 4개 × 모델 2개 × 3회 = **24회**
- 조건 정의: [`bench/conditions.mjs`](bench/conditions.mjs)
- 다음에 더할 후보
  - `drift`: 한 문서만 옛날 값
  - `json`: 값은 JSON 한 곳에만

### 공정하게 만든 장치

- 작업 폴더는 **저장소 밖** 임시 폴더 → `hidden/` 접근 불가
- 모든 조건에 같은 프롬프트 · 같은 `TASK.md`
- 사용자 설정 · MCP 끔 (`--setting-sources project`, `--strict-mcp-config`)
- 허용 도구: 파일 읽기/쓰기 + `node` 실행만

---

## 📂 폴더 구조

```
ontology-coding-bench/
├── knowledge/              # 지식 문서 (조건별로 골라 넣음)
│   ├── source.md           # 원본 규정 = 정답 기준
│   ├── ontology.md         # 개념 · 속성 · 관계 · 규칙
│   ├── prd.md              # 기능 요구사항 FR-1~10
│   ├── sdd.md              # Key Entities · 설계 · 검증 항목
│   └── leave-policy.json   # 기계가 읽는 값
├── task/
│   └── TASK.md             # 모든 조건 공통 과제 (함수 · 입출력만)
├── bench/
│   ├── conditions.mjs      # 조건 · 모델 · 프롬프트
│   ├── run.mjs             # 실행 + 채점
│   └── report.mjs          # 결과표
├── runs/                   # 실행 원본 (git 제외)
├── results/                # 실행별 결과표 · 원자료
└── hidden/                 # ⚠️ AI에게 절대 보여 주지 않음
    ├── reference/leave.js  # 정답 구현
    └── tests/              # 숨은 테스트 38개
```

---

## 📄 지식 문서 비교

| 문서 | 형태 | 줄 수 |
|---|---|---|
| source.md | 회사 규정 원문 | 95 |
| ontology.md | 개념 · 관계 · 규칙 | 125 |
| prd.md | 요구사항 FR | 53 |
| sdd.md | 엔티티 · 함수 설계 | 102 |
| leave-policy.json | 값 · 공식 | 61 |

- 모두 `source.md` **하나만** 근거로 작성
- 담긴 사실은 같고 **모양만** 다름 → 공정한 비교

---

## 🧩 과제 API

| 함수 | 돌려주는 것 |
|---|---|
| `getGrants(emp, asOf)` | 발생 내역 목록 |
| `getBalance(emp, usages, asOf)` | 잔여 일수 |
| `requestLeave(emp, usages, req)` | 승인 여부 |
| `yearEndPayout(emp, usages, year)` | 연말 수당 |

- 입력 형식: [`task/TASK.md`](task/TASK.md)

---

## ▶️ 실행

- 정답 구현으로 테스트 검증

```bash
npm run test:reference
```

- AI가 만든 `leave.js` 채점

```bash
LEAVE_MODULE=path/to/leave.js npm run test:reference
```

- 전체 실험 (24회)

```bash
npm run bench
```

- 일부만 (예: Haiku · spec · 1회)

```bash
node bench/run.mjs --models haiku --conditions spec --reps 1
```

- 결과표 (가장 최근 실행)

```bash
npm run report
```

| 옵션 | 기본값 |
|---|---|
| `--models` | haiku,sonnet |
| `--conditions` | 4개 전부 |
| `--reps` | 3 |
| `--concurrency` | 1 |

- 필요: Node 22, 로그인된 `claude` CLI
- 전체 24회 소요: 약 20분 (동시 2), $18.97

---

## 🚧 진행 상황

- [x] 원본 규정 `source.md`
- [x] 공통 과제 `TASK.md`
- [x] 정답 구현 + 숨은 테스트 38개
- [x] 지식 문서 4종
- [x] 실행 · 채점 · 결과표 스크립트
- [x] 전체 24회 실행
- [x] 결과표
- [ ] 그래프
- [ ] drift · json 조건 ([#1](https://github.com/kyungchan3007/ontology-coding-bench/issues/1), [#2](https://github.com/kyungchan3007/ontology-coding-bench/issues/2))

---

## 🙏 출처

- 영상: [단테 — 온톨로지 실험](https://www.youtube.com/watch?v=bZJa_I8EnUc)
  - 따릉이 요금 코딩 실험 · 보험 DB 챗봇 실험
  - 이 저장소는 그중 **코딩 실험**을 다른 도메인으로 다시 재 본 것

## 🔗 관련

- 챗봇 실험: `ontology-sql-bench` (예정)
