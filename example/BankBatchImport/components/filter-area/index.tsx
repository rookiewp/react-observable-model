import React, { useCallback, useState, useEffect } from 'react'
import { Radio, Checkbox, Tooltip, Select } from 'antd'
import HighSearch from '@/components/high-search'
import Iconfont from '@/components/Common/Iconfont'
import FilterForm from './filter-form'
import styles from './index.less'
import { FormInstance } from 'antd/lib/form'
import { fomateAmount, isEmptyObj } from '../../utils'

const { Option } = Select

export type Condition = {
  status: 0 | 1 | 2 // 补充状态：0：全部 1：未补充 2：已补充
  incomeStatus: 0 | 1 | -1 // 收支状态：0：全部 1：收入 -1：支出
  isOnlyShowException?: boolean // 是否仅显示异常项
  dfhmList: string[] // 对方户名列表
}

interface Props {
  step: 0 | 1 | 1.5 | 2
  formInstance?: FormInstance
  bzList?: string[] // 备注列表
  kmMcList?: string[] // 往来科目列表
  ywlxMcList?: string[] // 业务类型列表
  dfhmList: string[] // 对方户名列表
  onChange: (params: any) => void // 过滤的方法
  filterCondition?: Condition
  formInitValues?: any // 高级搜索中form默认值
  numbers: {
    all: number
    not: number
    complete: number
  }
}

type SearchParams = any

function FilterArea(props: Props) {
  const {
    formInstance,
    step,
    bzList,
    kmMcList,
    ywlxMcList,
    dfhmList,
    onChange,
    filterCondition,
    formInitValues,
    numbers,
  } = props

  const [dfhmValues, setDfhmValues] = useState([])

  useEffect(() => {
    setDfhmValues(filterCondition.dfhmList)
  }, [filterCondition.dfhmList])

  // 获取所有的过滤参数
  const getAllConditon = useCallback(() => {
    let formValues
    if (formInstance) {
      formValues = formInstance.getFieldsValue()
      formValues = isEmptyObj(formValues) ? formInitValues : formValues
      const [amountStart, amountEnd] = fomateAmount(formValues.amountStart, formValues.amountEnd)
      return {
        ...formValues,
        amountStart,
        amountEnd,
        ...filterCondition,
        dfhmList: dfhmValues,
      }
    }
    return filterCondition
  }, [filterCondition, formInstance, formInitValues, dfhmValues])

  // 过滤
  const search = useCallback(
    (params?: SearchParams) => {
      const values = params || getAllConditon()
      if (onChange) {
        onChange(values)
      }
    },
    [getAllConditon, onChange]
  )

  return (
    <div className={styles.filterArea}>
      <div style={{ height: 28, display: 'inline-flex', alignItems: 'center' }}>
        <Select
          placeholder='请选择对方户名'
          allowClear
          mode='multiple'
          showSearch
          maxTagCount={1}
          value={dfhmValues}
          onChange={(value) => {
            setDfhmValues(value)
          }}
          style={{ width: 200, height: 28 }}>
          {(dfhmList || []).map((dfhm) => (
            <Option key={dfhm} value={dfhm === '对方户名空值' ? '' : dfhm}>
              {dfhm}
            </Option>
          ))}
        </Select>
        <Iconfont
          className={styles.searchIcon}
          style={{ borderRight: step === 1.5 ? '1px solid #d5dddd' : 'none' }}
          onClick={() => {
            search()
          }}
          type='iconfe-ic-sousuo'
        />
      </div>
      <HighSearch
        r-if={step === 0 || step === 1}
        width={440}
        onXReset={() => {
          formInstance.resetFields()
          search()
        }}
        onBtnReset={() => {
          formInstance.resetFields()
        }}
        onConfirm={() => {
          search()
        }}
        fitlerForm={
          <FilterForm
            formInstance={formInstance}
            initialValues={formInitValues}
            bzList={bzList}
            step={step}
            kmMcList={kmMcList}
            ywlxMcList={ywlxMcList}
          />
        }
      />
      <Radio.Group
        style={{ marginLeft: 12 }}
        value={filterCondition.status}
        onChange={(e) => {
          const status = e.target.value
          const values = {
            ...getAllConditon(),
            status,
          }
          search(values)
        }}>
        <Tooltip title={numbers?.all <= 9999 ? null : numbers?.all}>
          <Radio.Button value={0}>
            全部({numbers?.all <= 9999 ? numbers?.all : '99 +'})
          </Radio.Button>
        </Tooltip>
        <Tooltip title={numbers?.not <= 9999 ? null : numbers?.not}>
          <Radio.Button value={1}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div>未补充</div>
              <span r-if={!numbers?.not}>(0)</span>
              <div className={'weibc_icon'} r-if={numbers?.not}>
                ({numbers?.not <= 9999 ? numbers?.not : '99 +'})
              </div>
            </div>
          </Radio.Button>
        </Tooltip>
        <Tooltip title={numbers?.complete <= 9999 ? null : numbers?.complete}>
          <Radio.Button value={2}>
            已补充({numbers?.complete <= 9999 ? numbers?.complete : '99 +'})
          </Radio.Button>
        </Tooltip>
      </Radio.Group>
      <Radio.Group
        style={{ marginLeft: 12 }}
        value={filterCondition.incomeStatus}
        onChange={(e) => {
          const incomeStatus = e.target.value
          const values = {
            ...getAllConditon(),
            incomeStatus,
          }
          search(values)
        }}>
        <Radio.Button value={0}>全部</Radio.Button>
        <Radio.Button value={1}>收入</Radio.Button>
        <Radio.Button value={-1}>支出</Radio.Button>
      </Radio.Group>
      <Checkbox
        className={styles.exceptions}
        checked={filterCondition.isOnlyShowException}
        onChange={(e) => {
          const isOnlyShowException = e.target.checked
          const values = {
            ...getAllConditon(),
            isOnlyShowException,
          }
          search(values)
        }}
        r-if={step === 0}>
        仅显示异常项
      </Checkbox>
    </div>
  )
}

export default FilterArea
