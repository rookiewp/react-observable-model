import React from 'react'
import { Select, Form, InputNumber, Tooltip } from 'antd'
import { FormInstance } from 'antd/lib/form'

import styles from './index.less'

const { Option } = Select
interface Props {
  formInstance: FormInstance
  initialValues?: any
  kmMcList?: any[]
  ywlxMcList?: any[]
  bzList: any[]
  step: 0 | 1 | 1.5 | 2
}

export default function FilterForm(props: Props) {
  const { formInstance, bzList, kmMcList, ywlxMcList, initialValues, step } = props

  return (
    <div className={styles.filterForm}>
      <Form form={formInstance} initialValues={initialValues}>
        <Form.Item name='comment' label='摘要备注'>
          <Select showSearch>
            {bzList.map((bz) => (
              <Option key={bz} value={bz === '全部' ? '' : bz}>
                <Tooltip title={bz}>{bz}</Tooltip>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <div className={styles.formItemRow}>
          <div className={styles.label}>金额：</div>
          <div className={styles.content}>
            <div className={styles.formItem}>
              <Form.Item name='amountStart'>
                <InputNumber style={{ width: 131 }} placeholder='请输入金额' />
              </Form.Item>
            </div>
            <div className={styles.line}>-</div>
            <div className={styles.formItem}>
              <Form.Item name='amountEnd'>
                <InputNumber style={{ width: 131 }} placeholder='请输入金额' />
              </Form.Item>
            </div>
          </div>
        </div>

        <Form.Item name='kmmc' label='往来科目' r-if={step === 0 || step === 1.5}>
          <Select showSearch>
            {kmMcList.map((kmmc) => (
              <Option key={kmmc} value={kmmc === '全部' ? '' : kmmc}>
                <Tooltip title={kmmc}>{kmmc}</Tooltip>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name='ywlx' label='业务类型' r-if={step === 1}>
          <Select showSearch>
            {ywlxMcList.map((ywlx) => (
              <Option key={ywlx} value={ywlx === '全部' ? '' : ywlx}>
                <Tooltip title={ywlx}>{ywlx}</Tooltip>
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </div>
  )
}
