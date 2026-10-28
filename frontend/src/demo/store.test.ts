import { beforeEach, describe, expect, it } from 'vitest'
import {
  addPoll, castDemoVote, createSampleState, loadDemoState, pollToCsv,
  saveDemoState, STORAGE_KEY, toggleDemoPoll, totalVotes,
} from './store'

beforeEach(() => localStorage.clear())

describe('local poll behavior', () => {
  it('records one vote, updates the total, and preserves the previous state', () => {
    const before = createSampleState()
    const after = castDemoVote(before, 'onboarding', 'checklist')
    expect(totalVotes(before.polls[0])).toBe(36)
    expect(totalVotes(after.polls[0])).toBe(37)
    expect(after.votes.onboarding).toBe('checklist')
    expect(after.polls[0].options[0].count).toBe(19)
    expect(() => castDemoVote(after, 'onboarding', 'walkthrough')).toThrow('already voted')
  })

  it('rejects a missing poll, invalid choice, and closed question', () => {
    const state = createSampleState()
    expect(() => castDemoVote(state, 'missing', 'checklist')).toThrow('no longer available')
    expect(() => castDemoVote(state, 'onboarding', 'missing')).toThrow('available answers')
    expect(() => castDemoVote(state, 'support', 'docs')).toThrow('closed')
  })

  it('reopens a question without forgetting an existing browser vote', () => {
    const voted = castDemoVote(createSampleState(), 'onboarding', 'checklist')
    const closed = toggleDemoPoll(voted, 'onboarding')
    expect(closed.polls[0].closed).toBe(true)
    const reopened = toggleDemoPoll(closed, 'onboarding')
    expect(reopened.polls[0].closed).toBe(false)
    expect(() => castDemoVote(reopened, 'onboarding', 'walkthrough')).toThrow('already voted')
  })

  it('creates a clean question with zero votes and trims blank answer lines', () => {
    const next = addPoll(createSampleState(), {
      title: '  What should we try next?  ', description: ' Class feedback ', options: [' More practice ', '', 'Q&A'],
    }, 'new-question', '2026-10-28T10:00:00.000Z')
    expect(next.polls[0]).toMatchObject({ title: 'What should we try next?', description: 'Class feedback', sample: false, closed: false })
    expect(next.polls[0].options.map((option) => option.label)).toEqual(['More practice', 'Q&A'])
    expect(totalVotes(next.polls[0])).toBe(0)
  })

  it('rejects ambiguous or incomplete questions', () => {
    const state = createSampleState()
    expect(() => addPoll(state, { title: 'Hi', description: '', options: ['Yes', 'No'] }, 'new')).toThrow('5 and 160')
    expect(() => addPoll(state, { title: 'Choose a topic', description: '', options: ['Yes'] }, 'new')).toThrow('2 and 10')
    expect(() => addPoll(state, { title: 'Choose a topic', description: '', options: ['Yes', ' YES '] }, 'new')).toThrow('different label')
  })
})

describe('browser persistence and export', () => {
  it('restores both results and the repeat-vote marker after reload', () => {
    const state = castDemoVote(createSampleState(), 'onboarding', 'checklist')
    expect(saveDemoState(state)).toBe(true)
    const restored = loadDemoState()
    expect(totalVotes(restored.polls[0])).toBe(37)
    expect(() => castDemoVote(restored, 'onboarding', 'walkthrough')).toThrow('already voted')
  })

  it('recovers safely from corrupted data and incompatible schemas', () => {
    localStorage.setItem(STORAGE_KEY, '{bad json')
    expect(loadDemoState().polls).toHaveLength(3)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, polls: [], votes: {} }))
    expect(loadDemoState().polls).toHaveLength(3)
    const invalid = createSampleState()
    invalid.polls[0].options[0].count = -1
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invalid))
    expect(totalVotes(loadDemoState().polls[0])).toBe(36)
  })

  it('keeps running when a browser blocks storage', () => {
    const blocked = { getItem: () => { throw new Error('Blocked') }, setItem: () => { throw new Error('Blocked') } }
    expect(loadDemoState(blocked).polls).toHaveLength(3)
    expect(saveDemoState(createSampleState(), blocked)).toBe(false)
  })

  it('exports matching counts, quotes commas, and neutralises spreadsheet formulas', () => {
    const state = addPoll(createSampleState(), {
      title: '=A1+1', description: '', options: ['A choice, with "quotes"', '+SUM(A1:A2)'],
    }, 'csv')
    const voted = castDemoVote(state, 'csv', 'csv-2')
    const csv = pollToCsv(voted.polls[0])
    expect(csv).toContain('"\'=A1+1"')
    expect(csv).toContain('"A choice, with ""quotes"""')
    expect(csv).toContain('"\'+SUM(A1:A2)","1","100.0","Local browser votes"')
  })
})
