import { inngest } from '@/inngest/client'

export const dynamic = 'force-dynamic'

export async function POST() {
  const result = await inngest.send({ name: 'products/discover', data: {} })
  return Response.json({ success: true, eventId: result.ids[0] })
}

export async function GET() {
  return Response.json({ message: 'POST to trigger product discovery via Inngest' })
}
