import type { ReactNode } from 'react'
import { Col, Layout, Row } from 'antd'

import GlobalFooter from '../components/GlobalFooter'
import styles from './DetectionLayout.module.css'

const { Footer, Content } = Layout

export interface DetectionLayoutProps {
  children: ReactNode
}

const DetectionLayout = ({ children }: DetectionLayoutProps) => {
  return (
    <Layout className="detection">
      <Content>
        <Row justify="center" align="middle" className={styles.detectionContainer}>
          <Col flex="auto">{children}</Col>
        </Row>
      </Content>
      <Footer>
        <Row justify="center" align="middle" className={styles.detectionFooter}>
          <Col flex="auto">
            <GlobalFooter />
          </Col>
        </Row>
      </Footer>
    </Layout>
  )
}

export default DetectionLayout
