import * as faceapi from '@feedsbrain/face-api.js'
import { asyncForEach } from './types'

export const videoConstraints = {
  width: 1280,
  height: 720
}

export let isModelLoaded = false
export let drawLandmarks = true

const MODELS_PATH = '/static/models'

export const loadModels = async (model: 'mobilenet' | 'tinyface') => {
  isModelLoaded = false
  const network = []
  if (model === 'tinyface') {
    network.push(faceapi.loadTinyFaceDetectorModel(MODELS_PATH))
  } else {
    network.push(faceapi.loadSsdMobilenetv1Model(MODELS_PATH))
  }
  network.push(faceapi.loadFaceLandmarkModel(MODELS_PATH))
  network.push(faceapi.loadFaceRecognitionModel(MODELS_PATH))
  network.push(faceapi.loadFaceExpressionModel(MODELS_PATH))
  network.push(faceapi.loadAgeGenderModel(MODELS_PATH))

  await Promise.all(network).then(async () => {
    isModelLoaded = true
  })
}

export const getCurrentFrame = (video) => {
  const currentFrame = document.createElement('canvas')
  const currentDims = video.getBoundingClientRect()
  if (video && currentFrame) {
    const ctx = currentFrame.getContext('2d')
    currentFrame.width = currentDims.width
    currentFrame.height = currentDims.height
    ctx.drawImage(video, 0, 0, currentDims.width, currentDims.height)
  }
  return currentFrame
}

export const onStartVideoHandle = async (video, canvas, callback, testMode) => {
  if (video.paused || video.ended || !isModelLoaded) {
    return setTimeout(() =>
      onStartVideoHandle(video, canvas, callback, testMode)
    )
  }

  const currentFrame = getCurrentFrame(video)
  const results = await faceapi
    .detectAllFaces(currentFrame, new faceapi.SsdMobilenetv1Options())
    .withFaceLandmarks()
    .withFaceDescriptors()
    .withFaceExpressions()
    .withAgeAndGender()

  if (results) {
    const dims = faceapi.matchDimensions(canvas, currentFrame, true)
    const resizedResults = faceapi.resizeResults(results, dims)

    if (drawLandmarks) {
      faceapi.draw.drawFaceLandmarks(canvas, resizedResults)
    }
    faceapi.draw.drawDetections(canvas, resizedResults)
    faceapi.draw.drawFaceExpressions(canvas, resizedResults, 0.05)

    await asyncForEach(resizedResults, async ({ detection, descriptor }) => {
      const drawBox = new faceapi.draw.DrawBox(detection.box)
      drawBox.draw(canvas)
    })

    callback(results)
  }

  setTimeout(() => onStartVideoHandle(video, canvas, callback, testMode))
}
