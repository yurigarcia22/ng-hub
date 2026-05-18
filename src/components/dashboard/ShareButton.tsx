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
      // Gerar token primeiro
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
    <div className="mt-1 flex gap-1 flex-shrink-0">
      <button
        onClick={generateAndCopy}
        disabled={state === 'loading'}
        className={`flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 rounded-xl transition-colors ${
          state === 'copied'
            ? 'text-emerald-400 bg-emerald-500/10'
            : state === 'error'
              ? 'text-red-400 bg-red-500/10'
              : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04]'
        }`}
      >
        {state === 'copied' ? (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Link copiado!
          </>
        ) : state === 'error' ? (
          'Erro ao copiar'
        ) : state === 'loading' ? (
          'Gerando...'
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-5.367 2.684 3 3 0 005.367-2.684zm0-9.316a3 3 0 10-5.368-2.684 3 3 0 005.368 2.684z" />
            </svg>
            Copiar link
          </>
        )}
      </button>
      <button
        onClick={openPdf}
        title="Baixar PDF"
        className="flex items-center justify-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        PDF
      </button>
    </div>
  )
}
