// Unitário: sem banco
import assert from 'node:assert/strict'
import { it } from 'node:test'
import { dayInSaoPaulo, streaks } from '../src/modules/sessions/frequency.ts'

it('conta dias corridos seguidos; a sequência atual vale até o dia seguinte', () => {
  const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10', '2026-09-11']
  assert.deepEqual(streaks(days, '2026-09-11'), { currentStreak: 2, bestStreak: 3 })
  assert.deepEqual(streaks(days, '2026-09-12'), { currentStreak: 2, bestStreak: 3 })
  assert.deepEqual(streaks(days, '2026-09-13'), { currentStreak: 0, bestStreak: 3 })
  // virada de mês
  assert.deepEqual(streaks(['2026-02-28', '2026-03-01'], '2026-03-01'), {
    currentStreak: 2,
    bestStreak: 2,
  })
  assert.deepEqual(streaks([], '2026-09-13'), { currentStreak: 0, bestStreak: 0 })
})

it('dia em Brasília: 01:00 UTC ainda é o dia anterior', () => {
  assert.equal(dayInSaoPaulo(new Date('2026-09-02T01:00:00Z')), '2026-09-01')
  assert.equal(dayInSaoPaulo(new Date('2026-09-02T03:00:00Z')), '2026-09-02')
})
