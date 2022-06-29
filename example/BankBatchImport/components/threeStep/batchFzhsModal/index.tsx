import React, { useRef } from 'react'
import { Modal } from 'antd'
import '../index.less'

import FzhsSelect from '../fzhs-select'

interface Props {
  visible: boolean
  setVisible: React.Dispatch<boolean>
  fzhsType2ListMap: Map<string, any[]>
  fzhsType2NameMap: Map<string, string>
  selectedRows: any[]
  addFzhsMxx: (fzlxCode: string) => void
  onOk: (selectMap: Map<string, string>, selectedRowKeys: number[]) => void
}

const BatchSupplementModal = (props: Props) => {
  const {
    fzhsType2ListMap,
    fzhsType2NameMap,
    selectedRows,
    onOk,
    visible,
    setVisible,
    addFzhsMxx,
  } = props

  const fzhsSelectRef = useRef()

  return (
    <Modal
      r-if={visible}
      visible={visible}
      title='辅助核算'
      width={480}
      className='bankBatchImport2-batchFzhsModal'
      okText='确定'
      cancelText='取消'
      onCancel={() => {
        setVisible(false)
      }}
      onOk={() => {
        onOk(
          fzhsSelectRef.current.getSelectMap(),
          selectedRows.map((row) => row._id)
        )
        setVisible(false)
      }}
      maskClosable={false}
      zIndex={1000}
      destroyOnClose={true}>
      <div>
        <FzhsSelect
          ref={fzhsSelectRef}
          fzhsType2ListMap={fzhsType2ListMap}
          fzhsType2NameMap={fzhsType2NameMap}
          selectedRows={selectedRows}
          isBatch
          addFzhsMxx={addFzhsMxx}
        />
      </div>
    </Modal>
  )
}

export default BatchSupplementModal
