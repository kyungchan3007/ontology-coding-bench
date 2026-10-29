# 과제: 온톨컴퍼니 연차휴가 모듈 `leave.js`

온톨컴퍼니의 연차휴가 규정에 맞게 연차 발생·사용·수당을 계산하는 모듈을 만든다.

- 파일: 작업 폴더 루트의 `leave.js` (ES Module, Node 22, 외부 패키지 없이)
- 아래 네 함수를 `export` 한다. 이름과 입출력 모양을 바꾸지 않는다.
- 규정은 이 폴더에 함께 있는 문서를 따른다.

## 데이터 형식

날짜는 모두 `'YYYY-MM-DD'` 문자열이다. 시간대는 고려하지 않는다.

```js
// 직원
const employee = {
  hireDate: '2025-03-01',      // 입사일
  annualSalary: 50000000,      // 연봉(원)
  absences: [                  // 소정근로일에 출근하지 않은 기간 (양 끝 포함)
    { from: '2025-07-21', to: '2025-07-21', reason: 'personal' },
  ],
};
// reason: 'personal'(개인 사유) | 'sick'(병가) | 'parentalLeave'(육아휴직)
//       | 'industrialAccident'(산재 휴업) | 'reserveTraining'(예비군 훈련)

// 연차 사용 기록
const usages = [
  { date: '2025-08-19', unit: 'day' },   // unit: 'day' | 'half' | 'quarter'
];
```

## 함수

### `getGrants(employee, asOf) → Array<{ date, days }>`
입사일부터 `asOf`(당일 포함)까지 발생한 연차를 발생일 순으로 돌려준다.
`days`가 0인 항목은 넣지 않는다.

### `getBalance(employee, usages, asOf) → number`
`asOf` 시점의 잔여 연차 일수.

### `requestLeave(employee, usages, request) → { approved: boolean }`
`request = { date, unit }`. 기존 사용 기록 `usages`가 있는 상태에서 `request.date`에 연차를 새로 신청했을 때 승인 여부.

### `yearEndPayout(employee, usages, year) → { remainingDays, paidDays, dailyWage, amount }`
`year`년 회계연도 말의 미사용 연차 수당.
- `remainingDays`: 그해 말 잔여 일수
- `paidDays`: 수당 지급 대상 일수
- `dailyWage`: 1일 통상임금(원)
- `amount`: 지급액(원)
