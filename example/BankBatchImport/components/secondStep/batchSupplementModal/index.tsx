import React, { useState, useCallback, useRef } from 'react'
import { Modal, message } from 'antd'
import styles from './index.less'

import YwlxSelect from '../ywlx-select'

interface Props {
  visible: boolean
  setVisible: React.Dispatch<boolean>
  firstList: any[]
  record: any
  yhzhId: string
  onOk: (selectedYwlxArr: any[]) => void
  onClose: () => void // 关闭Modal时调用
}

const map = {
  1: '一',
  2: '二',
  3: '三',
}

const BatchSupplementModal = (props: Props) => {
  const { firstList, record, yhzhId, onOk, onClose, visible, setVisible } = props
  const [selectedYwlxArr, setSelectedKmArr] = useState([])

  const ywlxSelectRef = useRef()

  const onFinish = useCallback((selectedYwlxArr) => {
    setSelectedKmArr(selectedYwlxArr)
  }, [])

  const handleOk = () => {
    const level = ywlxSelectRef.current.getNotSelectLevel()
    if (level === 0) {
      setVisible(false)
      onOk(selectedYwlxArr)
      onClose()
    } else {
      message.warning(`请选择业${map[level]}级务类型！`)
    }
  }

  return (
    <Modal
      r-if={visible}
      visible={visible}
      title='业务类型'
      width={480}
      className='bankBatchImport2-batchSupplementModal'
      okText='确定'
      cancelText='取消'
      onCancel={() => {
        setVisible(false)
        onClose()
      }}
      onOk={handleOk}
      maskClosable={false}
      zIndex={1000}
      destroyOnClose={true}>
      <div>
        <div className={styles.tips}>
          <div className={styles.line} />
          批量补充业务类型
        </div>
        <YwlxSelect
          ref={ywlxSelectRef}
          firstList={firstList}
          record={record}
          yhzhId={yhzhId}
          isBatch
          onFinish={onFinish}
        />
      </div>
    </Modal>
  )
}

export default BatchSupplementModal
