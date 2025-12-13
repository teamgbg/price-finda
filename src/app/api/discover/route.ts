import { inngest } from '@/inngest/client'

export async function POST() {
  try {
    // Trigger the manual product discovery function
    await inngest.send({
      name: 'products/discover',
      data: {},
    })

    return Response.json({
      message: 'Product discovery triggered. Check Inngest dashboard for progress.',
    })
  } catch (error) {
    console.error('Discovery trigger failed:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return Response.json({
    message: 'POST to this endpoint to trigger product discovery',
  })
}
