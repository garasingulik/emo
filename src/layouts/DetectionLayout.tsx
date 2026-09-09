import type { ReactNode } from 'react'
import { Col, Layout, Row } from 'antd'

import styles from './DetectionLayout.module.css'

const { Content } = Layout

export interface DetectionLayoutProps {
  children: ReactNode
}

const DetectionLayout = ({ children }: DetectionLayoutProps) => {
  return (
    <Layout className={`detection ${styles.detectionLayout}`}>
      <Content className={styles.detectionContent}>
        <Row justify="center" align="stretch" className={styles.detectionContainer}>
          <Col flex="auto" className={styles.detectionCol}>
            {children}
          </Col>
        </Row>
      </Content>
    </Layout>
  )
}

export default DetectionLayout
