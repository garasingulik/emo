// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Col, Row } from 'antd'

import version from '../../public/version.json'
import styles from './GlobalFooter.module.css'

const GlobalFooter: React.FC<{}> = () => {
  return (
    <Row justify="center" align="middle" className="footer footer-container">
      <Col flex="auto">
        <p className={styles.copyright}>EMO ({`${version.appVersion}`})</p>
      </Col>
    </Row>
  )
}

export default GlobalFooter
