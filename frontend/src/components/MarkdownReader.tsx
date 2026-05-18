import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { CodeBlock } from './CodeBlock'

type Props = {
  source: string
}

export function MarkdownReader({ source }: Props) {
  // Prepend "/" to image paths so they resolve from /public/images/.
  const fixed = useMemo(() => fixImagePaths(source), [source])
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          code({ className, children, ...props }) {
            const isBlock = typeof className === 'string' && className.startsWith('language-')
            if (!isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }
            const langMatch = /language-([^\s]+)/.exec(className ?? '')
            const lang = langMatch?.[1]
            const text = String(children).replace(/\n$/, '')
            return <CodeBlock code={text} lang={lang} />
          },
          pre({ children }) {
            // shiki/CodeBlock already renders its own <pre>; bypass the wrapper.
            return <>{children}</>
          },
          img({ src, alt }) {
            return <img src={src} alt={alt ?? ''} loading="lazy" />
          },
        }}
      >
        {fixed}
      </ReactMarkdown>
    </div>
  )
}

function fixImagePaths(md: string): string {
  // Prepend Vite's BASE_URL so images resolve under /<base>/images/... on GH Pages
  const base = import.meta.env.BASE_URL  // always ends with '/'
  return md.replace(/(!\[[^\]]*\]\()(images\/)/g, `$1${base}$2`)
}
