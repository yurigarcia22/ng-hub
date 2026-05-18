'use client'

import { useState } from 'react'

interface Props {
  accountId: string
  since: string
  until: string
}

type State = 'idle' | 'loading' | 'copied' | 'error'

export default function ShareButton({ accountId, since, until }: Props) {
  const [state, setState] = useState<State>('idle')
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  async function generateAndCopy(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setState('loading')
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, since, until }),
      })
      if (!res.ok) throw new Error('share failed')
      const { path } = await res.json()
      const url = `${window.location.origin}${path}`
      setShareUrl(url)
      await navigator.clipboard.writeText(url)
      setState('copied')
      setTimeout(() => setState('idle'), 2500)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2500)
    }
  }

  function openPdf(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (!shareUrl) {
      fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, since, until }),
      }).then(r => r.json()).then(({ path }) => {
        const token = path.replace('/r/', '')
        window.open(`/api/pdf/${token}`, '_blank')
      })
    } else {
      const token = shareUrl.split('/r/')[1]
      window.open(`/api/pdf/${token}`, '_blank')
    }
  }

  return (
    <div className="mt-1.5 flex gap-1 flex-shrink-0">
      <button
        onClick={generateAndCopy}
        disabled={state === 'loading'}
        className={`press flex-1 inline-flex items-center justify-center gap-1.5 text-[10px] font-semibold py-2 rounded-xl transition-all duration-200 ${
          state === 'copied'
            ? 'text-emerald-300 bg-emerald-500/[0.12] border border-emerald-500/25 shadow-[0_0_16px_rgba(16,185,129,0.15)]'
            : state === 'error'
              ? 'text-red-300 bg-red-500/[0.12] border border-red-500/25'
              : 'text-zinc-500 hover:text-zinc-200 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08]'
        }`}
      >
        {state === 'copied' ? (
          <>
            <svg className="w-3 h-3 animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            Link copiado
          </>
        ) : state === 'error' ? (
          'Erro'
        ) : state === 'loading' ? (
          <>
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Gerando
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-5.367 2.684 3 3 0 005.367-2.684zm0-9.316a3 3 0 10-5.368-2.684 3 3 0 005.368 2.684z" />
            </svg>
            Compartilhar
          </>
        )}
      </button>
      <button
        onClick={openPdf}
        title="Baixar PDF"
        className="press inline-flex items-center justify-center gap-1 text-[10px] font-semibold text-zinc-500 hover:text-zinc-200 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] px-2.5 py-2 rounded-xl transition-all duration-200"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        PDF
      </button>
    </div>
  )
}
