import React, { useState, useCallback, useEffect } from 'react'
import { Modal, Select, Tooltip, message } from 'antd'
import styles from './index.less'

const { Option } = Select

interface Props {
  handleOk: (km) => void
  szbz: 1 | -1 | null
  visible: boolean
  setVisible: React.Dispatch<boolean>
  requestKmList: (szbz, config: any) => void
}

const CorrespondKmModal = (props: Props) => {
  const { szbz, handleOk, visible, setVisible, requestKmList } = props
  const [loading, setLoading] = useState(false)
  const [kmList, setKmList] = useState([])
  const [selectedKm, setSelectedKm] = useState(null)

  const reset = useCallback(() => {
    setKmList([])
    setSelectedKm(null)
  }, [])

  // 获取科目列表
  const requestKmListWrap = useCallback(
    (szbz) => {
      setLoading(true)
      requestKmList(
        { szbz, dykm: true },
        {
          finally: () => {
            setLoading(false)
          },
          onSuccess: (res) => {
            setKmList(res || [])
          },
        }
      )
    },
    [requestKmList]
  )

  useEffect(() => {
    if (visible && szbz) {
      requestKmListWrap(szbz)
    }
  }, [requestKmListWrap, visible, szbz])

  return (
    <Modal
      visible={visible}
      title='对应科目'
      okText='确定'
      cancelText='取消'
      width={480}
      className='bankBatchImport2-correspondKmModal'
      onCancel={() => {
        setVisible(false)
        reset()
      }}
      onOk={() => {
        if (!selectedKm) {
          message.warning('请选择对应科目！')
          return
        }
        if (handleOk) {
          handleOk(selectedKm)
        }
        reset()
        setVisible(false)
      }}
      maskClosable={false}
      zIndex={1000}
      destroyOnClose={true}>
      <div>
        <div className={styles.tips}>
          <div className={styles.line} />
          请选择创建科目的上级科目
        </div>
        <Select
          showSearch
          style={{ width: '300px' }}
          placeholder='请选择'
          loading={loading}
          onChange={(_, option) => {
            const km = kmList.find((item) => item.id === option.key)
            setSelectedKm(km)
          }}>
          {kmList?.map((item) => {
            return (
              <Option key={item.id} value={item.xsz}>
                <Tooltip
                  title={
                    <span>
                      科目：{item.xsz}
                      <br />
                      余额：{item.kmye}
                    </span>
                  }>
                  {item.xsz}
                </Tooltip>
                {item.sffzhs === 1 ? <span className={styles.fzhsIcon}> 辅 </span> : ''}
              </Option>
            )
          })}
        </Select>
      </div>
    </Modal>
  )
}

export default CorrespondKmModal
