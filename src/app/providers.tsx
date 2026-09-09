'use client'

import type { ReactNode } from 'react'
import { ConfigProvider, type ThemeConfig } from 'antd'

// Replaces the old `src/styles/variables.less` antd theme override.
const theme: ThemeConfig = {
  token: {
    colorPrimary: '#14424d',
  },
}

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  return <ConfigProvider theme={theme}>{children}</ConfigProvider>
}

export default ThemeProvider
