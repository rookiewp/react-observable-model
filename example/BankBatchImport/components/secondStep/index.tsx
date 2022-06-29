import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { BaseTable, useTablePipeline, features } from 'ali-react-table'
import { Checkbox, Tooltip, Form, Button, message } from 'antd'
import { distinctUntilChanged, map, withLatestFrom } from 'rxjs/operators'
import { cloneDeep } from 'lodash-es'
import Iconfont from '@/components/Common/Iconfont'
import FilterArea, { Condition } from '../filter-area'
import { fomateAmount, isEmptyObj } from '../../utils'
import { formatMoney } from '@/utils/money-util'
import api from '@/api'
import { getModel } from '../../model'
import {
  createObRequest,
  useObModelSubscribe,
  useObModelToState,
  useStateToOb,
} from '@/components/observable-model'

import EditYwlx from './edit-ywlx'
import YwlxSelect from './ywlx-select'
import BatchSupplementModal from './batchSupplementModal'
import styles from './index.less'

interface Props {
  step: 0 | 1 | 1.5 | 2
}

// TODO 过滤条件 = 高级搜索中的条件 + 高级搜索之外的条件。因为高级搜索是一个单独的组件。。。
// 高级搜索中Form的默认值
const formInitValues = { comment: '', amountStart: null, amountEnd: null, ywlx: '' }

const defaultCondition: Condition = {
  dfhmList: [], // 对方户名列表
  status: 0, // 补充状态：0：全部 1：未补充 2：已补充
  incomeStatus: 0, // 收支状态：0：全部 1：收入 -1：支出
}

function SecondStep(props: Props) {
  const model = getModel()
  const { step } = props
  const [formInstance] = Form.useForm()
  // 业务类型名称列表, 用于高级搜索
  const [ywlxMcList, setYwlxMcList] = useState([])
  // 摘要备注列表
  const [bzList, setBzList] = useState([])
  // 对方户名列表
  const [dfhmList, setDfhmList] = useState([])
  const [loading, setLoading] = useState(true)
  // 过滤后的dataSource
  const [dataSourceFiltered, setDataSourceFiltered] = useState([])
  // 编辑中的行的index
  const [editIndex, setEditIndex] = useState(0)
  // 前一个 编辑中的行的index
  const prevEditIndexRef = useRef(-1)

  const [numbers, setNumbers] = useState({
    all: 0, // 全部
    not: 0, // 未补充数量
    complete: 0, // 已补充数量
  })

  // 批量补充Modal visible
  const [visible, setVisible] = useState(false)
  // 选中的行
  const [selectedRows, setSelectedRows] = useState([])

  // 一级业务类型list
  const [firstList, setFirstList] = useState([])

  const dataSource = useObModelToState(model, (state) => state.dataSource)
  const yhzhId = useObModelToState(model, (state) => state?.params?.kYhzhid || '')
  // 过滤条件
  // 通过setCondition来控制FilterArea的状态。condition视为一个‘数据流’，改变时触发过滤，所以需要将状态condition转为Observable
  const [condition, setCondition, condition$] = useStateToOb(defaultCondition)

  const visitedRef = useRef(false)

  // 修改dataSource
  const changeDataSource = useCallback(
    /**
     * @description: 修改dataSource
     * @param selectedYwlxArr 选择的业务类型数组
     * @param rows 选择的行
     * @return {void}
     */
    (selectedYwlxArr, rows?) => {
      const arr = cloneDeep(dataSource)
      const _selectedRows = rows || selectedRows
      const resIndex = []
      _selectedRows.map((item) => {
        resIndex.push(arr.findIndex((_item) => `${_item.djId}` === `${item.djId}`))
      })
      const [firstYwlx, secondYwlx, threeYwlx] = selectedYwlxArr
      // TODO 老逻辑，不知道什么意思，参照packages/authority/src/components/BankBatchImport/index.tsx
      if (firstYwlx.kmdzId && !firstYwlx.sffzhs) {
        resIndex.map((index) => {
          arr[index].kmDzId = firstYwlx.kmdzId
          // arr[index].realKjsxId = firstYwlx.kjsxid
          arr[index].kjsxId = firstYwlx.kjsxid
          arr[index].fzhsIdList = null // 如果仅一级则重置fzhsList、fzhsIdList
          arr[index].fzhsList = null // 如果仅一级则重置fzhsList、fzhsIdList
          arr[index].showText = `(${firstYwlx.kjsxmc})`
          arr[index].ywsjId = firstYwlx.ywsjId
          arr[index].iid = null
          arr[index].secondKjsxId = null
        })
      } else {
        const secondOrThreeYwlx = threeYwlx || secondYwlx
        resIndex.map((i) => {
          if (secondOrThreeYwlx) {
            arr[i].kjsxId = secondOrThreeYwlx.kjsxId ? secondOrThreeYwlx.kjsxId : firstYwlx.kjsxid
            arr[i].kmDzId = secondOrThreeYwlx.kmdzId
            arr[i].fzhsList = secondOrThreeYwlx.fzhsList
            arr[i].fzhsIdList = secondOrThreeYwlx.sffzhs ? secondOrThreeYwlx.fzhsIdList : null
            arr[i].iid = secondOrThreeYwlx.id
            arr[i].secondKjsxId = threeYwlx ? secondYwlx.id : null
            arr[i].ywsjId = secondOrThreeYwlx.ywsjId
            arr[i].showText = `(${firstYwlx.kjsxmc})-${
              secondOrThreeYwlx.kjsxId ? secondOrThreeYwlx.mc : secondOrThreeYwlx.kmmc
            } ${secondOrThreeYwlx.sffzhs ? ' ' + secondOrThreeYwlx.suffixXsz : ''}`
          } else {
            // 只有一级
            arr[i].kjsxId = firstYwlx.kjsxid
            arr[i].kmDzId = firstYwlx.kmdzId
            arr[i].fzhsList = firstYwlx.fzhsList
            arr[i].ywsjId = firstYwlx.ywsjId
            arr[i].iid = null
            arr[i].secondKjsxId = null
            arr[i].showText = `(${firstYwlx.kjsxmc})`
          }
        })
      }
      // 更新dataSourceFiltered和Numbers
      const dataSourceFilteredCopy = cloneDeep(dataSourceFiltered)
      let not = 0
      const ywlxMcList = []

      const map = arr.reduce((res, cur) => {
        if (cur.showText) {
          ywlxMcList.push(cur.showText)
        }
        if (!cur.kmDzId) {
          not += 1
        }
        if (cur.djId) {
          res[cur.djId] = cur
        }
        return res
      }, {})
      dataSourceFilteredCopy.forEach((row, i, arr) => {
        if (map[row.djId]) {
          arr[i] = map[row.djId]
        }
      })
      setYwlxMcList(['全部', ...new Set(ywlxMcList)])
      setNumbers({
        all: arr.length,
        not,
        complete: arr.length - not,
      })
      setDataSourceFiltered(dataSourceFilteredCopy)
      model.changeState({
        dataSource: arr,
      })
    },
    [dataSource, model, selectedRows, dataSourceFiltered]
  )

  // 获取表格数据
  const requestTableData = useMemo(() => {
    const request = async (params) => {
      setLoading(true)
      model.changeState({ isLoadingTable: true })
      const res = await api.yhdjController
        .getYwlxRuleList({
          request: {
            //@ts-ignore
            kjnd: window.YZF?.GlobalData?.QyData?.kjnd,
            kjqj: window.YZF?.GlobalData?.QyData?.kjqj,
            ztdm: window.YZF?.GlobalData?.QyData?.ztdm,
            qyid: window.YZF?.GlobalData?.QyData?.qyid,
            qdids: params.qdids,
            fplx: 'YH',
            sfldz: localStorage.getItem('isOldUser') ? localStorage.getItem('isOldUser') : 1,
            yhzhid: params.yhzhid,
          },
        })
        .finally(() => {
          model.changeState({ isLoadingTable: false })
          setLoading(false)
        })
      model.changeState({ dataSource: res })
    }
    return createObRequest(request)
  }, [model])

  // 获取一级业务类型列表
  const queryFirstList = useMemo(() => {
    const request = async (params) => {
      const res = await api.kjsxModelController.getNewFirstKjsxList({
        request: {
          kDjly: '2',
          kjsxid: 'S003',
          kjnd: window.YZF?.GlobalData?.QyData?.kjnd,
          qyId: window.YZF?.GlobalData?.QyData?.qyid,
          ztdm: window.YZF?.GlobalData?.QyData?.ztdm,
          yhzhId: params.yhzhId,
        },
      })

      setFirstList(res)
    }
    return createObRequest(request)
  }, [])

  // 过滤表格的fn
  const filterTable = useCallback(
    (dataSource, filterParams) => {
      const { dfhmList, comment, amountStart, amountEnd, ywlx, status, incomeStatus } = filterParams
      const fitlerStatus = (record, status) => {
        // 全部
        if (status === 0) {
          return true
        }
        // 未补充
        if (status === 1) {
          return !record.kmDzId
        }
        // 已补充
        if (status === 2) {
          return record.kmDzId && record.showText
        }
      }
      const dataSourceFiltered = dataSource.filter((item) => {
        const _comment = item.comment || ''
        const dwmc = item.dwmc || ''
        const _ywlx = item.showText || ''
        if (
          (dfhmList.length === 0 || dfhmList.includes(dwmc)) &&
          (_ywlx === ywlx || !ywlx) &&
          (comment === '摘要备注空值' ? _comment === '' : _comment === comment || comment === '') &&
          item.je >= amountStart &&
          item.je <= amountEnd &&
          fitlerStatus(item, status) &&
          (incomeStatus === 0 || item.szbz === incomeStatus)
        ) {
          return true
        }
      })
      setDataSourceFiltered(dataSourceFiltered)
    },
    [setDataSourceFiltered]
  )

  // FilterArea组件的prop onChange，以及onChange吐出的过滤条件filterCondition所对应的Observable
  const onChange = useCallback(
    (values) => {
      setCondition((draft) => {
        Object.assign(draft, values)
      })
    },
    [setCondition]
  )

  // 只有过滤条件改变时触发过滤，dataSource改变时不触发
  useEffect(() => {
    const subscription = condition$
      .pipe(
        map((condition: Condition) => {
          let formValues = formInstance.getFieldsValue()
          formValues = isEmptyObj(formValues) ? formInitValues : formValues
          const [amountStart, amountEnd] = fomateAmount(
            formValues.amountStart,
            formValues.amountEnd
          )
          return {
            ...condition,
            ...formValues,
            amountStart,
            amountEnd,
          }
        }),
        withLatestFrom(
          model.state$.pipe(
            distinctUntilChanged(([prevState], [state]) => {
              return prevState.dataSource === state.dataSource
            })
          )
        )
      )
      .subscribe(([condition, [state]]) => {
        if (state.dataSource.length > 0 && condition) {
          // console.log(state.dataSource, condition)
          filterTable(state.dataSource, condition)
        }
      })
    return () => {
      subscription.unsubscribe()
    }
  }, [filterTable, condition$, formInstance, model])

  // 订阅params，mount和params改变时请求表格数据和一级业务类型
  useObModelSubscribe(
    model,
    (state) => state.params,
    (params) => {
      requestTableData({
        qdids: params.qdids && params.qdids.length ? params.qdids : null,
        yhzhid: params.kYhzhid,
      })
      queryFirstList({ yhzhid: params.kYhzhid })
    }
  )

  // 设置高级搜索中的 摘要备注/往来科目/对方户名下拉列表，以及已完成，未完成和全部的数量
  const setFilterOptions = (dataSource) => {
    const ywlxMcList = []
    const bzList = []
    const dfhmList = []
    let not = 0
    let complete = 0
    let isBzEmpty = false
    let isDfhmEmpty = false
    // 是否都是支出
    let isAllZc = true
    dataSource.forEach((item) => {
      if (item.showText) {
        ywlxMcList.push(item.showText)
      }
      if (item.comment) {
        bzList.push(item.comment)
      }
      if (!item.comment && !isBzEmpty) {
        isBzEmpty = true
      }
      if (item.dwmc) {
        dfhmList.push(item.dwmc)
      }
      if (!item.dwmc && isDfhmEmpty === false) {
        isDfhmEmpty = true
      }
      if (!item.kmDzId) {
        not += 1
        if (item.szbz === 1 && isAllZc === true) {
          isAllZc = false
        }
      } else if (item.kmDzId && item.showText) {
        complete += 1
      }
    })
    if (isBzEmpty) {
      bzList.unshift('摘要备注空值')
    }
    if (isDfhmEmpty) {
      dfhmList.unshift('对方户名空值')
    }
    setYwlxMcList(['全部', ...new Set(ywlxMcList)])
    setBzList(['全部', ...new Set(bzList)])
    setDfhmList([...new Set(dfhmList)])
    setNumbers({
      all: dataSource.length,
      not,
      complete,
    })
    if (not > 0) {
      setCondition((draft) => {
        draft.status = not === 0 ? 0 : 1
        draft.incomeStatus = isAllZc ? -1 : 1
      })
    } else {
      // TODO 因为使用了withLatestFrom，只有condition$产生新的数据才会触发过滤函数，这边强制更新condition$
      setCondition(condition)
    }
  }

  // 全局方法（设置再model中）下一步时可能回用到，用来设置：补充状态和收支状态
  const changeFilterCondition = useCallback(
    (dataSource) => {
      // 是否有未完成的
      let hasNot = false
      // 是否都是支出
      let isAllZc = true
      for (let i = 0; i < dataSource.length && (hasNot === false || isAllZc === true); i++) {
        const item = dataSource[i]
        if (!item.kmDzId) {
          if (hasNot === false) {
            hasNot = true
          }
          if (item.szbz === 1 && isAllZc === true) {
            isAllZc = false
          }
        }
      }
      if (hasNot) {
        setCondition((draft) => {
          draft.status = hasNot === false ? 0 : 1
          draft.incomeStatus = isAllZc ? -1 : 1
        })
      }
    },
    [setCondition]
  )

  useEffect(() => {
    model.changeState({ changeFilterCondition })
  }, [model, changeFilterCondition])

  // 订阅dataSource，mount和dataSource改变时设置摘要备注列表和业务类型名称列表
  useObModelSubscribe(
    model,
    (state) => state.dataSource,
    (dataSource) => {
      if (!visitedRef.current && dataSource.length) {
        visitedRef.current = true
        setFilterOptions(dataSource)
      }
      if (dataSource.length === 0) {
        setDataSourceFiltered([])
      }
    }
  )

  /**
   * 查找收支状态
   */
  const diffSzbz = (selectRows, incomeStatus) => {
    const res = []
    if (selectRows && selectRows.length && incomeStatus === 3) {
      for (let i = 0; i < selectRows.length; i++) {
        if (!res.includes(selectRows[i].szbz)) {
          res.push(selectRows[i].szbz)
        }
      }
    }
    return res.length > 1 ? false : true
  }

  const validate = useCallback(
    (selectedRows) => {
      if (selectedRows.length === 0) {
        message.warning('请至少勾选一条数据！')
        return false
      }

      if (!diffSzbz(selectedRows, condition.incomeStatus)) {
        message.warning('请选择相同收支状态的银行数据！')
        return false
      }
      return true
    },
    [condition.incomeStatus]
  )

  const columns = useMemo(() => {
    return [
      {
        name: '对方户名',
        code: 'dwmc',
        width: 200,
        render: (text) => {
          return (
            <span className='over-hide-field' title={text}>
              {text}
            </span>
          )
        },
      },
      {
        title: (
          <div>
            <span>摘要备注</span>
            <Tooltip title='仅展示银行数据第一条明细的摘要备注'>
              <Iconfont className='tip' type='yzf-icon-tishi1'></Iconfont>
            </Tooltip>
          </div>
        ),
        code: 'comment',
        width: 200,
        render: (text) => {
          return (
            <span className='over-hide-field' title={text}>
              {text}
            </span>
          )
        },
      },
      {
        name: '金额',
        code: 'je',
        width: 160,
        render: (text) => formatMoney(text),
      },
      {
        name: '收支状态',
        code: 'szbz',
        width: 100,
        render: (text) => {
          return text === 1 ? '收入' : '支出'
        },
      },
      {
        name: '业务类型',
        code: 'showText',
        width: 530,
        lock: true,
        render: (_, record, index) => {
          return (
            <EditYwlx
              active={index === editIndex}
              index={index}
              setEditIndex={setEditIndex}
              showText={record.showText}>
              <YwlxSelect
                yhzhId={yhzhId}
                record={record}
                firstList={firstList}
                onFinish={(selectedYwlxArr) => {
                  changeDataSource(selectedYwlxArr, [record])
                }}
              />
            </EditYwlx>
          )
        },
      },
    ]
  }, [editIndex, yhzhId, firstList, changeDataSource])

  // ali-react-table
  const pipeline = useTablePipeline({ components: { Checkbox, tips: Tooltip } })
    .input({
      dataSource: dataSourceFiltered,
      columns,
    })
    .primaryKey('djId')
    .use(
      features.multiSelect({
        highlightRowWhenSelected: true,
        checkboxPlacement: 'start',
        checkboxColumn: { lock: true, width: 40 },
        clickArea: 'row',
        onChange: (selectedKeys) => {
          const selectedRows = []
          dataSourceFiltered.forEach((item) => {
            if (selectedKeys.includes(item.djId)) {
              selectedRows.push(item)
            }
          })
          setSelectedRows(selectedRows)
        },
        stopClickEventPropagation: true,
        value: selectedRows.map((item) => item.djId),
      })
    )

  return (
    <div>
      <div className={styles.filterWrap}>
        <FilterArea
          formInstance={formInstance}
          formInitValues={formInitValues}
          step={step}
          bzList={bzList}
          ywlxMcList={ywlxMcList}
          dfhmList={dfhmList}
          filterCondition={condition}
          onChange={onChange}
          numbers={numbers}
        />
        <div>
          <Button
            type='primary'
            className={styles.btnPrimary1}
            onClick={() => {
              if (validate(selectedRows)) {
                setVisible(true)
                prevEditIndexRef.current = editIndex
                setEditIndex(-1)
              }
            }}>
            业务类型
          </Button>
        </div>
      </div>
      <BaseTable
        {...pipeline.getProps()}
        isLoading={loading}
        style={{ height: 300, width: '100%', overflowY: 'auto' }}
      />
      <BatchSupplementModal
        firstList={firstList}
        record={selectedRows[0]}
        yhzhId={yhzhId}
        visible={visible}
        setVisible={setVisible}
        onClose={() => {
          setEditIndex(prevEditIndexRef.current)
          prevEditIndexRef.current = -1
        }}
        onOk={(selectedYwlxArr) => {
          changeDataSource(selectedYwlxArr, selectedRows)
        }}
      />
    </div>
  )
}

export default SecondStep
