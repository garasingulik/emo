// eslint-disable-next-line no-use-before-define
import React from 'react'

import WebcamDetect from '../components/WebcamDetect'
import DetectionLayout from '../layouts/DetectionLayout'

const CameraDetectionPage: React.FC = () => {
  return (
    <DetectionLayout>
      <WebcamDetect />
    </DetectionLayout>
  )
}

export default CameraDetectionPage
