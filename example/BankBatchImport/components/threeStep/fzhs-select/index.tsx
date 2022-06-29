import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { Select, message, Tooltip } from 'antd'
import { cloneDeep } from 'lodash-es'
import { useUpdateEffect } from 'ahooks'
import { PlusCircleOutlined } from '@ant-design/icons'

import { unionArr } from '../../../utils'

import styles from './index.less'

const { Option } = Select

interface Props {
  selectedRows: any[]
  isBatch?: boolean
  changeDataSource?: (selectMap: Map<string, string>, selectedRows: any[]) => void
  fzhsType2ListMap: Map<string, any[]>
  fzhsType2NameMap: Map<string, string>
  addFzhsMxx: (fzlxCode: string) => void
}

const FzhsSelect = (props: Props, ref) => {
  const selectedMapRef = useRef(new Map())
  const {
    selectedRows,
    changeDataSource,
    fzhsType2ListMap,
    fzhsType2NameMap,
    addFzhsMxx,
    isBatch = false,
  } = props

  // 非批量修改时，因为每次选择辅助核算明细后，都会更新Table DataSource，组件会重新渲染，会获取到新的selectedRows
  // 批量修改时，只有在点击Modal的确认按钮才会修改Table DataSource。所以选择辅助核算明细后，selectedRows还是旧的，<Select>的value不会更新。因此，保存一份selectedRows，以便修改
  const [rows, setRows] = useState(cloneDeep(selectedRows))

  useUpdateEffect(() => {
    if (isBatch) {
      setRows(selectedRows)
    }
  }, [selectedRows, isBatch])

  const list = unionArr(!isBatch ? selectedRows : rows)

  useImperativeHandle(ref, () => ({
    getSelectMap() {
      return selectedMapRef.current
    },
  }))
  const selectWidth = isBatch ? 300 : 160

  return (
    <div
      className={styles.fzhsSelect}
      onClick={(e) => {
        e.stopPropagation()
      }}>
      {list.map((item, index) => (
        <div
          key={item.fzhsType}
          style={{ marginTop: index > 0 ? 10 : 0, display: isBatch ? 'block' : 'flex' }}>
          <div>
            <label className={styles.label}>{fzhsType2NameMap?.get(item.fzhsType)}: </label>
            <Select
              style={{ width: selectWidth }}
              value={item.fzhsid}
              onChange={(fzhsid: string) => {
                selectedMapRef.current.set(item.fzhsType, fzhsid)
                if (!isBatch) {
                  changeDataSource(
                    selectedMapRef.current,
                    selectedRows.map((item) => item._id)
                  )
                } else {
                  rows.forEach((row) => {
                    row?.data.forEach((fzhs) => {
                      if (fzhs.fzhsType === item.fzhsType) {
                        fzhs.fzhsid = fzhsid
                      }
                    })
                  })
                  setRows([...rows])
                }
              }}
              placeholder='请选择'
              dropdownRender={(menu) => (
                <div>
                  {menu}
                  <div
                    className={styles.addArea}
                    onClick={(e) => {
                      e.stopPropagation()
                      // addYwlx()
                      addFzhsMxx(item.fzhsType)
                    }}>
                    <PlusCircleOutlined />
                    <span>新增</span>
                  </div>
                </div>
              )}>
              {fzhsType2ListMap.get(item.fzhsType)?.map((opt) => (
                <Option value={opt.id} key={opt.id}>
                  <Tooltip placement='top' title={opt.mc}>
                    <div>{opt.mc}</div>
                  </Tooltip>
                </Option>
              ))}
            </Select>
          </div>
        </div>
      ))}
    </div>
  )
}

export default forwardRef(FzhsSelect)
