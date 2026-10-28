import { useEffect, useRef, useState } from 'react'
import {
  addPoll, castDemoVote, createSampleState, loadDemoState, pollToCsv,
  saveDemoState, STORAGE_KEY, toggleDemoPoll, totalVotes,
} from './store'
import type { DemoPoll, DemoState } from './store'
import './demo.css'

function downloadCsv(poll: DemoPoll) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', pollToCsv(poll)], { type: 'text/csv;charset=utf-8;' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `pulsepoll-${poll.id}.csv`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function DemoApp() {
  const [state, setState] = useState<DemoState>(() => loadDemoState())
  const [selectedId, setSelectedId] = useState('onboarding')
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [choices, setChoices] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [storageWarning, setStorageWarning] = useState(false)
  const questionInput = useRef<HTMLInputElement>(null)

  const poll = state.polls.find((item) => item.id === selectedId) ?? state.polls[0]
  const votedId = poll ? state.votes[poll.id] : undefined
  const total = poll ? totalVotes(poll) : 0
  const openCount = state.polls.filter((item) => !item.closed).length

  useEffect(() => {
    function syncOtherTab(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setState(loadDemoState())
    }
    window.addEventListener('storage', syncOtherTab)
    return () => window.removeEventListener('storage', syncOtherTab)
  }, [])

  useEffect(() => {
    if (creating) questionInput.current?.focus()
  }, [creating])

  function commit(next: DemoState) {
    setState(next)
    setStorageWarning(!saveDemoState(next))
  }

  function selectQuestion(id: string) {
    setSelectedId(id)
    setCreating(false)
    setMessage('')
    setError('')
  }

  function vote(optionId: string) {
    if (!poll) return
    try {
      commit(castDemoVote(state, poll.id, optionId))
      setMessage('Your vote is recorded in this browser.')
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The vote could not be recorded.')
    }
  }

  function createQuestion(event: React.FormEvent) {
    event.preventDefault()
    try {
      const id = `question-${crypto.randomUUID()}`
      commit(addPoll(state, { title, description, options: choices.split('\n') }, id))
      setSelectedId(id)
      setCreating(false)
      setTitle('')
      setDescription('')
      setChoices('')
      setMessage('Question created. Choose an answer to try the voting flow.')
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The question could not be created.')
    }
  }

  function resetDemo() {
    if (!window.confirm('Reset this local demo? Your custom questions and local votes will be removed.')) return
    commit(createSampleState())
    setSelectedId('onboarding')
    setCreating(false)
    setMessage('The three sample questions have been restored.')
    setError('')
  }

  return (
    <>
      <nav className="nav demo-nav" aria-label="Main navigation">
        <a className="brand" href="/"><span className="pulse" aria-hidden="true" />PulsePoll</a>
        <div className="demo-nav-meta"><span className="demo-mode">Local demo</span><a href="#walkthrough">How it works</a></div>
      </nav>

      <main className="demo-shell">
        <header className="desk-heading">
          <div><p className="eyebrow">A small question. A clearer decision.</p><h1>Give every voice<br /><em>a place to land.</em></h1></div>
          <p>Collect a preference, read the room, and turn the result into a useful next step. Try the samples or write your own question.</p>
        </header>

        <div className="demo-notice"><span className="notice-symbol" aria-hidden="true">↳</span><p><strong>This workspace stays in your browser.</strong> Sample counts are synthetic. Questions and votes save locally; they are not shared with other devices.</p></div>
        {storageWarning && <p className="form-error" role="alert">Your browser blocked local storage. You can keep trying the demo, but changes will disappear after a refresh.</p>}

        <div className="question-desk">
          <aside className="question-sidebar" aria-label="Questions">
            <div className="sidebar-heading"><div><h2>Question desk</h2><p>{state.polls.length} questions · {openCount} open</p></div><span className="desk-mark" aria-hidden="true">Q</span></div>
            <button className="btn btn-primary btn-block" onClick={() => { setCreating(true); setError(''); setMessage('') }}>+ Create a question</button>
            <div className="question-list">
              {state.polls.map((item) => (
                <button key={item.id} className={`question-slip${!creating && poll?.id === item.id ? ' selected' : ''}`} onClick={() => selectQuestion(item.id)} aria-pressed={!creating && poll?.id === item.id}>
                  <span className="slip-top"><span>{item.sample ? 'Sample' : 'Your question'}</span><span className={item.closed ? 'slip-closed' : 'slip-open'}>{item.closed ? 'Closed' : 'Open'}</span></span>
                  <strong>{item.title}</strong><span className="slip-total">{totalVotes(item)} responses <span aria-hidden="true">↗</span></span>
                </button>
              ))}
            </div>
            <button className="reset-demo" onClick={resetDemo}>Reset sample workspace</button>
          </aside>

          <section className="question-panel" aria-label={creating ? 'Create a question' : 'Selected question'}>
            {creating ? (
              <form onSubmit={createQuestion} className="question-form">
                <p className="eyebrow">Make room for an answer</p><h2>What do you want to know?</h2><p className="panel-description">Ask one clear question with choices that mean different things.</p>
                <div className="form-row"><label htmlFor="question-title">Question</label><input ref={questionInput} id="question-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required placeholder="What would improve our next workshop?" /></div>
                <div className="form-row"><label htmlFor="question-description">Context <span className="optional">(optional)</span></label><input id="question-description" className="input" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Give people enough context to make a choice." /></div>
                <div className="form-row"><label htmlFor="question-choices">Answer choices</label><textarea id="question-choices" className="input" value={choices} onChange={(event) => setChoices(event.target.value)} required rows={5} aria-describedby="choice-help" placeholder={'More hands-on practice\nA shorter introduction\nMore time for questions'} /><p id="choice-help" className="field-hint">One choice per line. Use 2–10 different choices.</p></div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="panel-actions"><button className="btn btn-primary" type="submit">Create question</button><button className="btn btn-ghost" type="button" onClick={() => { setCreating(false); setError('') }}>Cancel</button></div>
              </form>
            ) : poll ? (
              <>
                <div className="poll-panel-top"><span className="demo-category">{poll.sample ? 'Sample feedback question' : 'Your local question'}</span><span className={`status-label ${poll.closed ? 'is-closed' : ''}`}><span aria-hidden="true">●</span> {poll.closed ? 'Closed' : 'Open for a response'}</span></div>
                <h2 className="selected-question">{poll.title}</h2><p className="panel-description">{poll.description || 'Choose the answer that best matches your preference.'}</p>
                <div className="response-summary"><strong>{total}</strong><span>responses{poll.sample ? <small>Includes synthetic sample counts</small> : <small>Recorded in this browser only</small>}</span></div>
                <fieldset className="demo-answers"><legend>{votedId ? 'Your response is included below' : poll.closed ? 'Final results' : 'Choose one answer'}</legend>
                  {poll.options.map((option) => {
                    const percentage = total ? Math.round(option.count / total * 100) : 0
                    const chosen = votedId === option.id
                    return <button key={option.id} type="button" className={`demo-answer${chosen ? ' chosen' : ''}`} disabled={Boolean(votedId) || poll.closed} onClick={() => vote(option.id)} aria-label={`${option.label}${chosen ? ', your vote' : ''}`}>
                      <span className="demo-answer-fill" style={{ width: `${percentage}%` }} aria-hidden="true" />
                      <span className="answer-label"><span className="choice-circle" aria-hidden="true">{chosen ? '✓' : ''}</span>{option.label}{chosen && <small>Your vote</small>}</span><span className="answer-count"><strong>{percentage}%</strong><small>{option.count} votes</small></span>
                    </button>
                  })}
                </fieldset>
                <p className="vote-help">{poll.closed ? 'This question is closed. You can reopen it below.' : votedId ? 'One vote per question is remembered in this browser.' : 'Select an answer to add one local vote. Results update immediately.'}</p>
                <div className="panel-actions"><button className="btn btn-primary" onClick={() => downloadCsv(poll)}>Export results <span aria-hidden="true">↓</span></button><button className="btn btn-ghost" onClick={() => { commit(toggleDemoPoll(state, poll.id)); setMessage(poll.closed ? 'Question reopened.' : 'Question closed. Results are still available.'); setError('') }}>{poll.closed ? 'Reopen question' : 'Close question'}</button></div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <p className="demo-message" role="status" aria-live="polite">{message}</p>
              </>
            ) : null}
          </section>
        </div>

        <section className="demo-walkthrough" id="walkthrough" aria-labelledby="walkthrough-title">
          <div><p className="eyebrow">Follow the response</p><h2 id="walkthrough-title">Simple enough to explain.</h2><p>The local demo has three small pieces. The optional live backend adds accounts, shared storage, and WebSocket delivery.</p></div>
          <ol><li><strong>React shows the question.</strong><span>Components render choices, counts, and feedback.</span></li><li><strong>A TypeScript function records the vote.</strong><span>It checks the choice, blocks a repeat vote, and updates one count.</span></li><li><strong>localStorage remembers the result.</strong><span>A refresh restores this browser's workspace. CSV turns counts into a portable report.</span></li></ol>
        </section>
        <footer className="demo-footer"><span>PulsePoll · Jecin Elizabeth</span><span>A learning demo for feedback and coordination</span></footer>
      </main>
    </>
  )
}
