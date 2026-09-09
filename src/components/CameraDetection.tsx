'use client'

import dynamic from 'next/dynamic'

import DetectionLayout from '../layouts/DetectionLayout'

// face-api.js / TensorFlow.js touch `window` and `document` at import time,
// so the webcam view is browser-only.
const WebcamDetect = dynamic(() => import('./WebcamDetect'), { ssr: false })

const CameraDetection = () => {
  return (
    <DetectionLayout>
      <WebcamDetect />
    </DetectionLayout>
  )
}

export default CameraDetection
