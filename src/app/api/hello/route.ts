// Next.js Route Handler: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

import { NextResponse } from 'next/server'

export const GET = () => {
  return NextResponse.json({ name: 'John Doe' })
}
