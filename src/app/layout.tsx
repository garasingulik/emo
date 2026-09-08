import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AntdRegistry } from '@ant-design/nextjs-registry'

import ThemeProvider from './providers'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'EMO — Face & Emotion Detection',
  description:
    'Face and Emotion Detection demo built with Next.js and face-api.js / TensorFlow.js',
}

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <ThemeProvider>{children}</ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}

export default RootLayout
