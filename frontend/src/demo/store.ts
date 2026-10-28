/** Small, pure data functions for the local teaching demo. No server is called. */
export const STORAGE_KEY = 'pulsepoll:demo:v1'

export interface DemoOption {
  id: string
  label: string
  count: number
}

export interface DemoPoll {
  id: string
  title: string
  description: string
  options: DemoOption[]
  createdAt: string
  closed: boolean
  sample: boolean
}

export interface DemoState {
  version: 1
  polls: DemoPoll[]
  votes: Record<string, string>
}

type DemoStorage = Pick<Storage, 'getItem' | 'setItem'>

export function createSampleState(): DemoState {
  return {
    version: 1,
    votes: {},
    polls: [
      {
        id: 'onboarding',
        title: 'What would make onboarding easier?',
        description: 'A sample product feedback question. These starting results are invented demonstration data.',
        createdAt: '2026-10-28T09:00:00.000Z',
        closed: false,
        sample: true,
        options: [
          { id: 'checklist', label: 'A clear first-week checklist', count: 18 },
          { id: 'walkthrough', label: 'A short product walkthrough', count: 11 },
          { id: 'office-hours', label: 'A live question-and-answer session', count: 7 },
        ],
      },
      {
        id: 'workshop',
        title: 'Which workshop should we organise next?',
        description: 'A sample class representative workflow: collect preferences before confirming an event.',
        createdAt: '2026-10-27T09:00:00.000Z',
        closed: false,
        sample: true,
        options: [
          { id: 'interviews', label: 'Interview practice', count: 15 },
          { id: 'excel', label: 'Excel for everyday work', count: 12 },
          { id: 'ai', label: 'Responsible use of AI tools', count: 9 },
        ],
      },
      {
        id: 'support',
        title: 'Where do you look first when you need help?',
        description: 'A completed sample poll for discussing support channels and self-service content.',
        createdAt: '2026-10-26T09:00:00.000Z',
        closed: true,
        sample: true,
        options: [
          { id: 'docs', label: 'Help articles', count: 14 },
          { id: 'chat', label: 'Support chat', count: 19 },
          { id: 'video', label: 'Video tutorials', count: 5 },
        ],
      },
    ],
  }
}

function browserStorage(): DemoStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

function isSavedState(value: unknown): value is DemoState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<DemoState>
  if (candidate.version !== 1 || !Array.isArray(candidate.polls) || !candidate.votes || typeof candidate.votes !== 'object') return false
  const pollIds = new Set<string>()
  for (const poll of candidate.polls) {
    if (!poll || typeof poll.id !== 'string' || !poll.id || pollIds.has(poll.id)) return false
    pollIds.add(poll.id)
    if (typeof poll.title !== 'string' || typeof poll.description !== 'string' || typeof poll.createdAt !== 'string') return false
    if (typeof poll.closed !== 'boolean' || typeof poll.sample !== 'boolean' || !Array.isArray(poll.options)) return false
    if (poll.options.length < 2 || poll.options.length > 10) return false
    const optionIds = new Set<string>()
    for (const option of poll.options) {
      if (!option || typeof option.id !== 'string' || optionIds.has(option.id) || typeof option.label !== 'string') return false
      if (!Number.isSafeInteger(option.count) || option.count < 0) return false
      optionIds.add(option.id)
    }
  }
  return Object.values(candidate.votes).every((vote) => typeof vote === 'string')
}

export function loadDemoState(storage = browserStorage()): DemoState {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (raw) {
      const saved: unknown = JSON.parse(raw)
      if (isSavedState(saved)) return saved
    }
  } catch {
    // A blocked or corrupted browser store should not stop the demonstration.
  }
  return createSampleState()
}

export function saveDemoState(state: DemoState, storage = browserStorage()): boolean {
  try {
    if (!storage) return false
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function totalVotes(poll: DemoPoll): number {
  return poll.options.reduce((total, option) => total + option.count, 0)
}

export function addPoll(
  state: DemoState,
  input: { title: string; description: string; options: string[] },
  id: string,
  createdAt = new Date().toISOString(),
): DemoState {
  const title = input.title.trim()
  const description = input.description.trim()
  const options = input.options.map((option) => option.trim()).filter(Boolean)
  if (title.length < 5 || title.length > 160) throw new Error('Write a question between 5 and 160 characters.')
  if (description.length > 500) throw new Error('Keep the description within 500 characters.')
  if (options.length < 2 || options.length > 10) throw new Error('Add between 2 and 10 choices, one per line.')
  if (options.some((option) => option.length > 100)) throw new Error('Keep each choice within 100 characters.')
  if (new Set(options.map((option) => option.toLocaleLowerCase())).size !== options.length) throw new Error('Use a different label for each choice.')
  if (!id || state.polls.some((poll) => poll.id === id)) throw new Error('This question already exists. Please try again.')
  const poll: DemoPoll = {
    id, title, description, createdAt, closed: false, sample: false,
    options: options.map((label, index) => ({ id: `${id}-${index + 1}`, label, count: 0 })),
  }
  return { ...state, polls: [poll, ...state.polls] }
}

export function castDemoVote(state: DemoState, pollId: string, optionId: string): DemoState {
  const poll = state.polls.find((item) => item.id === pollId)
  if (!poll) throw new Error('This question is no longer available.')
  if (poll.closed) throw new Error('This question is closed. Reopen it to collect another response.')
  if (state.votes[pollId]) throw new Error('This browser has already voted on this question.')
  if (!poll.options.some((option) => option.id === optionId)) throw new Error('Choose one of the available answers.')
  return {
    ...state,
    votes: { ...state.votes, [pollId]: optionId },
    polls: state.polls.map((item) => item.id === pollId ? {
      ...item,
      options: item.options.map((option) => option.id === optionId ? { ...option, count: option.count + 1 } : option),
    } : item),
  }
}

export function toggleDemoPoll(state: DemoState, pollId: string): DemoState {
  return { ...state, polls: state.polls.map((poll) => poll.id === pollId ? { ...poll, closed: !poll.closed } : poll) }
}

function csvCell(value: string | number): string {
  const text = String(value)
  // Neutralise spreadsheet formulas in user-written questions and choices.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export function pollToCsv(poll: DemoPoll): string {
  const total = totalVotes(poll)
  const rows: (string | number)[][] = [
    ['Question', 'Choice', 'Votes', 'Percentage', 'Data source'],
    ...poll.options.map((option) => [
      poll.title, option.label, option.count,
      total ? ((option.count / total) * 100).toFixed(1) : '0.0',
      poll.sample ? 'Synthetic sample counts plus local browser votes' : 'Local browser votes',
    ]),
  ]
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
