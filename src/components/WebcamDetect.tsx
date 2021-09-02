import React, { useEffect, useState } from 'react'
import { Card, Col, Row, Space } from 'antd'

import { useRouter } from 'next/router'

import {
  videoConstraints,
  loadModels,
  onStartVideoHandle
} from '../lib/face'

import styles from './WebcamDetect.module.css'

interface WebcamDetectProps {
  testMode?: boolean
  model?: 'mobilenet' | 'tinyface' | undefined
  distanceThreshold?: number
}

const WebcamDetect: React.FC<WebcamDetectProps> = (props) => {
  const router = useRouter()

  const webcamRef = React.useRef(null)
  const canvasRef = React.useRef(null)

  const { testMode, model, distanceThreshold } = props  
  const [currentModel, setCurrentModel] = useState<'mobilenet' | 'tinyface'>(model || 'mobilenet')
 
  const [expression, setExpression] = useState<any>(undefined)
  const [gender, setGender] = useState<string>('unknown')
  const [genderProbability, setGenderProbability] = useState<number>(0)
  const [age, setAge] = useState<number>(0)

  useEffect(() => {
    loadModels(currentModel).then(() => {
      startVideoCapture()
    })

    const handleRouteChange = (url) => {
      console.log('App is changing to: ', url)
      stopVideoCapture()
    }
    router.events.on('routeChangeStart', handleRouteChange)
    return () => {
      router.events.off('routeChangeStart', handleRouteChange)
    }
  }, [])

  useEffect(() => {
    if (model && distanceThreshold) {
      setCurrentModel(model)      
      loadModels(currentModel)
    }
  }, [model, distanceThreshold])

  const stopVideoCapture = () => {
    const video = webcamRef.current
    if (video) {
      const mediaStream = video.srcObject
      const tracks = mediaStream.getTracks()
      tracks.forEach(track => track.stop())
    }
  }

  const startVideoCapture = async () => {
    const video = webcamRef.current
    const canvas = canvasRef.current

    if (video && canvas) {
      const constraints = { audio: false, video: videoConstraints }
      await navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (mediaStream) {
          video.srcObject = mediaStream
          video.onloadedmetadata = function (e) {
            video.play()
          }
        })
        .catch(function (err) {
          console.log(err.name + ': ' + err.message)
        })
    } else {
      setTimeout(startVideoCapture, 500)
    }
  }

  const onLoadedMetadata = () => {
    const video = webcamRef.current
    const canvas = canvasRef.current
    onStartVideoHandle(video, canvas, (results) => {   
      if (results.length && results[0]) {                 
        setExpression(results[0].expressions)
        setGender(results[0].gender)
        setGenderProbability(results[0].genderProbability)
        setAge(results[0].age)
      }
    }, testMode)
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
        <Row align="top" justify="center" gutter={[24, 24]} >
          <Col xs={18} style={{ overflow: 'hidden'}}>
            <video onLoadedMetadata={onLoadedMetadata} autoPlay muted playsInline ref={webcamRef} className={styles.webcamFrame}></video>
            <canvas ref={canvasRef} className={styles.detectionOverlay} />
          </Col>
          <Col xs={6}>
            <Space direction="vertical" style={{ width: '100%'}} size="small">
              <h3 style={{ textAlign: 'center'}}>EMO: Face Detection</h3>
              <Card title="Gender" bordered={false} style={{ overflow: 'hidden', textAlign: 'center', display: gender ? 'block' : 'none'}}>
                {gender.toUpperCase()} ({genderProbability.toFixed(3)})
              </Card>   
              <Card title="Age" bordered={false} style={{ overflow: 'hidden', textAlign: 'center', display: age > 0 ? 'block' : 'none'}}>
                {age.toFixed(0)}
              </Card> 
              <Card title="Expressions" bordered={false} style={{ overflow: 'hidden', textAlign: 'center', display: expression ? 'block' : 'none'}}>
                {renderExpression()}
              </Card>            
            </Space>             
          </Col>
        </Row>
      </Col>
    </Row >
  )
}

export default WebcamDetect
