'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Col, Row, Space } from 'antd'

import { videoConstraints, loadModels, onStartVideoHandle } from '../lib/face'

import styles from './WebcamDetect.module.css'

interface WebcamDetectProps {
  testMode?: boolean
  model?: 'mobilenet' | 'tinyface' | undefined
  distanceThreshold?: number
}

const WebcamDetect: React.FC<WebcamDetectProps> = (props) => {
  const webcamRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { testMode, model, distanceThreshold } = props
  const currentModel: 'mobilenet' | 'tinyface' = model ?? 'mobilenet'

  const [expression, setExpression] = useState<Record<string, number> | undefined>(
    undefined
  )
  const [gender, setGender] = useState<string>('unknown')
  const [genderProbability, setGenderProbability] = useState<number>(0)
  const [age, setAge] = useState<number>(0)

  const stopVideoCapture = useCallback(() => {
    const video = webcamRef.current
    const mediaStream = video?.srcObject as MediaStream | null
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
      video!.srcObject = null
    }
  }, [])

  const startVideoCapture = useCallback(() => {
    // `function` declaration (hoisted) so the retry can reference itself.
    async function attempt() {
      const video = webcamRef.current
      const canvas = canvasRef.current

      if (!video || !canvas) {
        setTimeout(attempt, 500)
        return
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraints,
        })
        video.srcObject = mediaStream
        video.onloadedmetadata = () => {
          video.play()
        }
      } catch (err) {
        const { name, message } = err as Error
        console.log(name + ': ' + message)
      }
    }

    attempt()
  }, [])

  useEffect(() => {
    let active = true

    loadModels(currentModel).then(() => {
      if (active) {
        startVideoCapture()
      }
    })

    // App Router has no route-change events, so release the camera on unmount.
    return () => {
      active = false
      stopVideoCapture()
    }
  }, [currentModel, startVideoCapture, stopVideoCapture])

  useEffect(() => {
    if (model && distanceThreshold) {
      loadModels(model)
    }
  }, [model, distanceThreshold])

  const onLoadedMetadata = () => {
    const video = webcamRef.current
    const canvas = canvasRef.current
    onStartVideoHandle(
      video,
      canvas,
      (results) => {
        if (results.length && results[0]) {
          setExpression(results[0].expressions)
          setGender(results[0].gender)
          setGenderProbability(results[0].genderProbability)
          setAge(results[0].age)
        }
      },
      testMode
    )
  }

  const renderExpression = () => {
    if (!expression) return <></>
    return (
      <>
        {Object.keys(expression).map((key, index) => {
          return (
            <Row key={index}>
              <Col span={12}>{key}</Col>
              <Col span={12}>{expression[key].toFixed(5)}</Col>
            </Row>
          )
        })}
      </>
    )
  }

  return (
    <Row justify="center" align="middle" gutter={[0, 16]} style={{ paddingTop: '20px' }}>
      <Col>
        <Row align="top" justify="center" gutter={[24, 24]}>
          <Col xs={18} style={{ overflow: 'hidden', minWidth: '75%' }}>
            <video
              onLoadedMetadata={onLoadedMetadata}
              autoPlay
              muted
              playsInline
              ref={webcamRef}
              className={styles.webcamFrame}
            ></video>
            <canvas ref={canvasRef} className={styles.detectionOverlay} />
          </Col>
          <Col xs={6}>
            <Space orientation="vertical" style={{ width: '100%' }} size="small">
              <h3
                style={{
                  textAlign: 'center',
                  display: gender && gender !== 'unknown' ? 'block' : 'none',
                }}
              >
                EMO: Emotion Detection
              </h3>
              <Card
                title="Gender"
                variant="borderless"
                style={{
                  overflow: 'hidden',
                  textAlign: 'center',
                  display: gender && gender !== 'unknown' ? 'block' : 'none',
                }}
              >
                {gender.toUpperCase()} ({genderProbability.toFixed(3)})
              </Card>
              <Card
                title="Age"
                variant="borderless"
                style={{
                  overflow: 'hidden',
                  textAlign: 'center',
                  display: age > 0 ? 'block' : 'none',
                }}
              >
                {age.toFixed(0)}
              </Card>
              <Card
                title="Expressions"
                variant="borderless"
                style={{
                  overflow: 'hidden',
                  textAlign: 'center',
                  display: expression ? 'block' : 'none',
                }}
              >
                {renderExpression()}
              </Card>
            </Space>
          </Col>
        </Row>
      </Col>
    </Row>
  )
}

export default WebcamDetect
