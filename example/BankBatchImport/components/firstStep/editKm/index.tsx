import React, { useState, useCallback, useEffect } from 'react'
import { Select, Tooltip } from 'antd'
import { PlusCircleOutlined } from '@ant-design/icons'

import styles from './index.less'

const { Option } = Select

interface Props {
  active: boolean
  szbz: 1 | -1
  kmQc: string
  dzid: string
  setEditIndex: React.Dispatch<number>
  index: number
  sffzhs: boolean
  onChange: (km: any) => void
  requestKmList: (szbz, config: any) => void
  createKm: () => void
}

export default function EditKm(props: Props) {
  const {
    active,
    szbz,
    kmQc,
    setEditIndex,
    index,
    sffzhs,
    onChange,
    dzid,
    requestKmList,
    createKm,
  } = props
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(dzid)
  const [kmList, setKmList] = useState([])

  // 获取科目列表
  const requestKmListWrap = useCallback(
    (szbz) => {
      setLoading(true)
      requestKmList(szbz, {
        finally: () => {
          setLoading(false)
        },
        onSuccess: (res) => {
          setKmList(res || [])
        },
      })
    },
    [requestKmList]
  )

  useEffect(() => {
    setValue(dzid)
  }, [dzid])

  return (
    <div
      className={styles.editKm}
      onClick={(e) => {
        e.stopPropagation()
      }}>
      <div
        className={styles.content}
        onClick={() => {
          setEditIndex(index)
          requestKmListWrap(szbz)
          setOpen(true)
        }}
        r-if={!active}>
        <div className={styles.text}>{kmQc || '未补充'}</div>
        <div style={{ width: 18 }}>
          <div r-if={sffzhs} className={styles.fzhsIcon}>
            辅
          </div>
        </div>
      </div>
      <div r-if={active} className={styles.content}>
        <Select
          style={{ width: '100%' }}
          showSearch
          loading={loading}
          open={open}
          value={value}
          dropdownRender={(menu) => (
            <>
              {menu}
              <div
                className={styles.addArea}
                onClick={(e) => {
                  e.stopPropagation()
                  createKm()
                }}>
                <PlusCircleOutlined />
                <span>创建科目</span>
              </div>
            </>
          )}
          onDropdownVisibleChange={(open) => {
            if (!open) {
              setEditIndex(-1)
            }
            setOpen(open)
          }}
          onChange={(_, option) => {
            const km = kmList.find((item) => item.id === option.key)
            setValue(km.dzid)
            if (onChange) {
              onChange(km)
            }
          }}>
          {kmList.map((item) => {
            return (
              <Option value={item.dzid} key={item.id}>
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
                {item.sffzhs === 1 ? <span className='fzhs_icon'> 辅 </span> : ''}
              </Option>
            )
          })}
        </Select>
      </div>
    </div>
  )
}
