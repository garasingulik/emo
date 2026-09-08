import { Col, Row } from 'antd'

import version from '../../public/version.json'
import styles from './GlobalFooter.module.css'

const GlobalFooter = () => {
  return (
    <Row justify="center" align="middle" className="footer footer-container">
      <Col flex="auto">
        <p className={styles.copyright}>EMO ({`${version.appVersion}`})</p>
      </Col>
    </Row>
  )
}

export default GlobalFooter
