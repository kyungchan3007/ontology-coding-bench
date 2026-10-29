// 숨은 테스트 — 실험 중 AI에게 보여 주지 않는다.
// 실행: LEAVE_MODULE=<채점할 leave.js 경로> node --test hidden/tests/leave.test.mjs
// 기대값은 knowledge/source.md 규정으로 손계산한 값이다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const target = process.env.LEAVE_MODULE
  ? path.resolve(process.env.LEAVE_MODULE)
  : new URL('../reference/leave.js', import.meta.url).pathname;
const { getGrants, getBalance, requestLeave, yearEndPayout } = await import(pathToFileURL(target).href);

const emp = (hireDate, absences = [], annualSalary = 50000000) => ({ hireDate, annualSalary, absences });
const total = (grants) => grants.reduce((s, g) => s + g.days, 0);

const A = emp('2025-03-01'); // 기본: 3월 1일 입사, 결근 없음

// ---------- R1. 1년 미만 월 단위 발생 ----------
test('R1: 입사 한 달 전에는 발생 없음', () => {
  assert.deepEqual(getGrants(A, '2025-03-31'), []);
});
test('R1: 한 달 개근하면 다음 달 같은 날 1일', () => {
  assert.deepEqual(getGrants(A, '2025-04-01'), [{ date: '2025-04-01', days: 1 }]);
});
test('R1: 입사 첫해 말 잔여 9일 (4월~12월)', () => {
  assert.equal(getBalance(A, [], '2025-12-31'), 9);
});
test('R1: 월 단위 발생은 최대 11일, 1주년 당일에는 발생 없음', () => {
  const g = getGrants(A, '2026-03-31');
  assert.equal(total(g), 11);
  assert.ok(!g.some((x) => x.date === '2026-03-01'));
});
test('R1/R8: 해가 바뀌면 전년 잔여는 이월되지 않음', () => {
  assert.equal(getBalance(A, [], '2026-02-28'), 2);
});

// ---------- R2. 1주년 다음 달 1일에 14일 ----------
test('R2: 1주년 달(3월)에는 아직 14일 없음', () => {
  assert.equal(getBalance(A, [], '2026-03-31'), 2);
});
test('R2: 3월이 끝난 4월 1일에 14일 발생', () => {
  assert.equal(getBalance(A, [], '2026-04-01'), 16);
});
test('R2: 1주년 전 1월 1일에는 연간 연차 없음', () => {
  assert.ok(!getGrants(A, '2026-01-01').some((x) => x.date === '2026-01-01' && x.days > 1));
});
test('R2: 3월 중순 입사도 다음 해 4월 1일에 14일', () => {
  const D = emp('2025-03-20');
  assert.ok(getGrants(D, '2026-04-01').some((x) => x.date === '2026-04-01' && x.days === 14));
  assert.equal(getBalance(D, [], '2026-04-01'), 16);
});
test('R2: 1월 1일 입사 — 1주년 당일(1/1)은 연간 연차 없음', () => {
  const B = emp('2025-01-01');
  assert.equal(getBalance(B, [], '2026-01-01'), 0);
  assert.equal(getBalance(B, [], '2026-02-01'), 14);
});
test('R2: R2 발생일이 1월 1일이면 14일만 (28일 아님)', () => {
  const C = emp('2025-12-15');
  assert.equal(getBalance(C, [], '2027-01-01'), 14);
});

// ---------- R2-1 / R3. 기준일 연간 연차 ----------
test('R3: 1주년 뒤 첫 1월 1일, 근속 1년 → 14일', () => {
  assert.equal(getBalance(A, [], '2027-01-01'), 14);
});
test('R3: 근속 2년 → 15일', () => {
  assert.equal(getBalance(A, [], '2028-01-01'), 15);
});
test('R3: 근속 4년 → 17일', () => {
  assert.equal(getBalance(A, [], '2030-01-01'), 17);
});
test('R3: 근속 12년 → 25일', () => {
  assert.equal(getBalance(A, [], '2038-01-01'), 25);
});
test('R3: 상한 25일', () => {
  assert.equal(getBalance(A, [], '2045-01-01'), 25);
});
test('R3: 1월 1일 입사는 첫 기준일에 근속 2년 → 15일', () => {
  assert.equal(getBalance(emp('2025-01-01'), [], '2027-01-01'), 15);
});
test('R3: 12월 입사, R2 다음 기준일에 근속 2년 → 15일', () => {
  assert.equal(getBalance(emp('2025-12-15'), [], '2028-01-01'), 15);
});

// ---------- R5. 출근 간주 (R1 개근) ----------
const oneDay = (reason) => [{ from: '2025-05-12', to: '2025-05-12', reason }]; // 월요일
test('R5: 개인 사유 결근 1일 → 그 달 발생 없음', () => {
  assert.equal(getBalance(emp('2025-03-01', oneDay('personal')), [], '2025-12-31'), 8);
});
test('R5: 병가는 출근 간주 아님', () => {
  assert.equal(getBalance(emp('2025-03-01', oneDay('sick')), [], '2025-12-31'), 8);
});
test('R5: 예비군 훈련은 출근 간주', () => {
  assert.equal(getBalance(emp('2025-03-01', oneDay('reserveTraining')), [], '2025-12-31'), 9);
});
test('R5: 산재 휴업은 출근 간주', () => {
  const abs = [{ from: '2025-05-12', to: '2025-05-16', reason: 'industrialAccident' }];
  assert.equal(getBalance(emp('2025-03-01', abs), [], '2025-12-31'), 9);
});

// ---------- R4. 출근율 80% 미만 ----------
// 2026년 소정근로일 261일. 80% 기준선: 결근 52일 → 80.07%, 53일 → 79.69%
const H = '2023-03-01'; // 2027-01-01 기준 근속 3년 → 정상이면 16일
test('R4: 결근 64일(2~4월) → 개근월 9개월 = 9일', () => {
  const abs = [{ from: '2026-02-02', to: '2026-04-30', reason: 'personal' }];
  assert.equal(getBalance(emp(H, abs), [], '2027-01-01'), 9);
});
test('R4/R5: 같은 기간 육아휴직이면 정상 16일', () => {
  const abs = [{ from: '2026-02-02', to: '2026-04-30', reason: 'parentalLeave' }];
  assert.equal(getBalance(emp(H, abs), [], '2027-01-01'), 16);
});
test('R4: 결근 52일(출근율 80.07%) → 정상 16일', () => {
  const abs = [{ from: '2026-02-02', to: '2026-04-14', reason: 'personal' }];
  assert.equal(getBalance(emp(H, abs), [], '2027-01-01'), 16);
});
test('R4: 결근 53일(출근율 79.69%) → 개근월 9일', () => {
  const abs = [{ from: '2026-02-02', to: '2026-04-15', reason: 'personal' }];
  assert.equal(getBalance(emp(H, abs), [], '2027-01-01'), 9);
});
test('R4/R5: 출근 간주 달은 개근월로 셈', () => {
  const abs = [
    { from: '2026-01-02', to: '2026-03-31', reason: 'personal' },
    { from: '2026-06-01', to: '2026-06-30', reason: 'parentalLeave' },
  ];
  assert.equal(getBalance(emp(H, abs), [], '2027-01-01'), 9);
});

// ---------- R6. 사용 ----------
test('R6: 잔여 안에서 1일 신청 승인', () => {
  assert.equal(requestLeave(A, [], { date: '2025-06-16', unit: 'day' }).approved, true);
});
test('R6: 반반차 차감 후 잔여', () => {
  const u = [{ date: '2025-04-10', unit: 'quarter' }, { date: '2025-05-09', unit: 'half' }];
  assert.equal(getBalance(A, u, '2025-06-16'), 2.25);
});
test('R6: 잔여 0.5일에 반차 승인, 1일 거부', () => {
  const u = [
    { date: '2025-04-10', unit: 'day' },
    { date: '2025-05-09', unit: 'day' },
    { date: '2025-06-10', unit: 'half' },
  ];
  assert.equal(requestLeave(A, u, { date: '2025-06-16', unit: 'half' }).approved, true);
  assert.equal(requestLeave(A, u, { date: '2025-06-16', unit: 'day' }).approved, false);
});
test('R6: 허용하지 않는 단위는 거부', () => {
  assert.equal(requestLeave(A, [], { date: '2025-06-16', unit: 'hour' }).approved, false);
});
test('R6/R8: 전년 잔여로는 신청할 수 없음', () => {
  const u = [{ date: '2026-01-02', unit: 'day' }];
  assert.equal(requestLeave(A, u, { date: '2026-01-05', unit: 'day' }).approved, false);
});

// ---------- R9. 수당 ----------
test('R9: 잔여 9일, 연봉 5천만 원', () => {
  assert.deepEqual(yearEndPayout(A, [], 2025), {
    remainingDays: 9, paidDays: 9, dailyWage: 159489, amount: 1435401,
  });
});
test('R9: 잔여 8.75일 → 8.5일분, 원 미만 버림', () => {
  const r = yearEndPayout(A, [{ date: '2025-05-09', unit: 'quarter' }], 2025);
  assert.equal(r.remainingDays, 8.75);
  assert.equal(r.paidDays, 8.5);
  assert.equal(r.amount, 1355656);
});
test('R9: 잔여 8.25일 → 8일분', () => {
  const u = [{ date: '2025-05-09', unit: 'quarter' }, { date: '2025-07-09', unit: 'half' }];
  assert.equal(yearEndPayout(A, u, 2025).amount, 1275912);
});
test('R9: 연봉 3,700만 원 1일 통상임금', () => {
  const r = yearEndPayout(emp('2025-03-01', [], 37000000), [], 2025);
  assert.equal(r.dailyWage, 118022);
  assert.equal(r.amount, 1062198);
});
test('R9: 1주년 해 수당 (월 발생 2 + 14 − 0.25 = 15.75 → 15.5일분)', () => {
  const r = yearEndPayout(A, [{ date: '2026-05-04', unit: 'quarter' }], 2026);
  assert.equal(r.remainingDays, 15.75);
  assert.equal(r.amount, 2472079);
});
test('R9: 잔여 0.25일 → 수당 0원', () => {
  const u = [
    { date: '2025-04-10', unit: 'day' }, { date: '2025-05-09', unit: 'day' },
    { date: '2025-06-10', unit: 'day' }, { date: '2025-07-09', unit: 'day' },
    { date: '2025-08-11', unit: 'day' }, { date: '2025-09-10', unit: 'day' },
    { date: '2025-10-10', unit: 'day' }, { date: '2025-11-10', unit: 'day' },
    { date: '2025-12-10', unit: 'half' }, { date: '2025-12-11', unit: 'quarter' },
  ];
  const r = yearEndPayout(A, u, 2025);
  assert.equal(r.paidDays, 0);
  assert.equal(r.amount, 0);
});
