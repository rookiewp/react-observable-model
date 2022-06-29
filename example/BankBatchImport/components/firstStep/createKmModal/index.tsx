import React, { useState, useCallback, useEffect } from 'react'
import { Modal, Select, Tooltip, Checkbox, message } from 'antd'
import { InfoCircleFilled } from '@ant-design/icons'
import styles from './index.less'

const { Option } = Select

interface Props {
  handleOk: (km: any, checkAll: boolean) => void
  szbz: 1 | -1 | null
  visible: boolean
  setVisible: React.Dispatch<boolean>
  dwmc: string
  requestKmList: (szbz, config: any) => void
  onClose: () => void
}

const CreateKmModal = (props: Props) => {
  const { szbz, handleOk, visible, setVisible, dwmc, requestKmList, onClose } = props
  const [loading, setLoading] = useState(false)
  const [kmList, setKmList] = useState([])
  const [selectedKm, setSelectedKm] = useState(null)
  const [checkAll, setCheckAll] = useState(false)

  const reset = useCallback(() => {
    setKmList([])
    setSelectedKm(null)
    setCheckAll(false)
  }, [])

  // 获取科目列表
  const requestKmListWrap = useCallback(
    (szbz) => {
      setLoading(true)
      requestKmList(
        { szbz, dykm: false },
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
      title='创建科目'
      okText='确定'
      cancelText='取消'
      width={480}
      className='bankBatchImport2-createKmModal'
      onCancel={() => {
        setVisible(false)
        if (onClose) {
          onClose()
        }
        reset()
      }}
      onOk={() => {
        if (!selectedKm) {
          message.warning('请选择创建科目的上级科目！')
          return
        }
        if (handleOk) {
          handleOk(selectedKm, checkAll)
        }
        if (onClose) {
          onClose()
        }
        reset()
        setVisible(false)
      }}
      maskClosable={false}
      zIndex={1000}
      destroyOnClose={true}>
      <div className={styles.createKmModal}>
        <div className={styles.topTip}>
          <InfoCircleFilled />
          <span>如果选择科目开启了辅助核算，将创建辅助核算明细项</span>
        </div>
        <div className={styles.tips}>
          <div className={styles.line} />
          请选择创建科目的上级科目
        </div>
        <Select
          showSearch
          loading={loading}
          style={{ width: '300px' }}
          placeholder='请选择'
          onChange={(_, option) => {
            const km = kmList.find((item) => item.id === option.key)
            setSelectedKm(km)
          }}>
          {kmList?.map((item) => (
            <Option key={item.id} value={item.dzid}>
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
          ))}
        </Select>
        <div className={styles.expectCreate} r-if={selectedKm?.xsz}>
          <div className={styles.lefts}>
            <div>创建样例：</div>
            <div className={styles.bottoms}></div>
          </div>
          <div className={styles.rights}>{selectedKm?.xsz ? selectedKm?.xsz + '_' + dwmc : ''}</div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Checkbox
            checked={checkAll}
            onChange={(e) => {
              setCheckAll(e.target.checked)
            }}>
            按选择为所有对方单位创建科目
          </Checkbox>
        </div>
      </div>
    </Modal>
  )
}

export default CreateKmModal
