import { requireSession } from '@/lib/auth/session'
import { createSSEStream, documentChannel } from '@/lib/realtime/sse'
import { unauthorized, err } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<Response> {
  const session = await requireSession().catch(() => null)
  if (!session) return unauthorized()

  const url = new URL(req.url)
  const documentId = url.searchParams.get('documentId')
  if (!documentId) return err('documentId is required')

  const channel = documentChannel(documentId)
  const stream = createSSEStream(channel)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
