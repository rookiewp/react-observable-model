import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { BaseTable, useTablePipeline, features } from 'ali-react-table'
import { Checkbox, Tooltip, Form, Button, message } from 'antd'
import { distinctUntilChanged, map, withLatestFrom } from 'rxjs/operators'
import { formatMoney } from '@/utils/money-util'
import { cloneDeep } from 'lodash-es'
import Iconfont from '@/components/Common/Iconfont'
import FilterArea, { Condition } from '../filter-area'
import { matchFunc, fomateAmount, isEmptyObj } from '../../utils'
import api from '@/api'
import { getModel } from '../../model'
import EditKm from './editKm'
import CorrespondKmModal from './correspondKmModal'
import CreateKmModal from './createKmModal'
import {
  createObRequest,
  useObModelSubscribe,
  useObModelToState,
  useStateToOb,
} from '@/components/observable-model'
import styles from './index.less'

interface Props {
  step: 0 | 1 | 1.5 | 2
}

// TODO 过滤条件 = 高级搜索中的条件 + 高级搜索之外的条件。因为高级搜索是一个单独的组件。。。
// 高级搜索中Form的默认值
const formInitValues = { comment: '', amountStart: null, amountEnd: null, kmmc: '' }

const defaultCondition: Condition = {
  status: 0, // 补充状态：0：全部 1：未补充 2：已补充
  incomeStatus: 0, // 收支状态：0：全部 1：收入 -1：支出
  isOnlyShowException: false, // 是否仅显示异常项
  dfhmList: [], // 对方户名列表
}

function FirstStep(props: Props) {
  const model = getModel()
  const { step } = props
  const [formInstance] = Form.useForm()
  // 科目名称列表, 用于高级搜索
  const [kmMcList, setKmMcList] = useState([])
  // 摘要备注列表
  const [bzList, setBzList] = useState([])
  // 对方户名列表
  const [dfhmList, setDfhmList] = useState([])
  const [loading, setLoading] = useState(false)
  // 过滤后的dataSource
  const [dataSourceFiltered, setDataSourceFiltered] = useState([])
  // 编辑行的index
  const [editIndex, setEditIndex] = useState(-1)

  const [numbers, setNumbers] = useState({
    all: 0, // 全部
    not: 0, // 未补充数量
    complete: 0, // 已补充数量
  })

  // 对应科目Modal visible
  const [visible, setVisible] = useState(false)
  // 创建科目Modal visible
  const [show, setShow] = useState(false)
  // 选中的行
  const [selectedRows, setSelectedRows] = useState([])
  // 当前选中的慌
  const [curRow, setCurRow] = useState(null)

  const visitedRef = useRef(false)

  const dataSource = useObModelToState(model, (state) => state.dataSource)

  // 过滤条件
  // 通过setCondition来控制FilterArea的状态。condition视为一个‘数据流’，改变时触发过滤，所以需要将状态condition转为Observable
  const [condition, setCondition, condition$] = useStateToOb(defaultCondition)

  // 修改dataSource
  const changeDataSource = useCallback(
    /**
     * @description: 修改dataSource
     * @param selectedKm 选择的科目
     * @param selectedRows 选择的行
     * @param type 1: 对应 2: 创建
     * @param checkAll 勾选同类型
     * @return {void}
     */
    (selectedKm, selectedRows, type, checkAll?: boolean) => {
      const szbz = selectedRows[0].szbz
      const arr = cloneDeep(dataSource)
      if (checkAll) {
        for (let i = 0; i < arr.length; i++) {
          if (arr[i].szbz === szbz) {
            arr[i].kmQc = selectedKm.kmqc + '_' + arr[i].dwmc
            arr[i].kmDzId = type === 1 ? selectedKm.dzid : ''
            arr[i].sffzhs = selectedKm.sffzhs
            arr[i].kmbm = selectedKm.kmbm
            arr[i].creationWay = type
            arr[i].kmmc = selectedKm ? selectedKm.kmmc : null
          }
        }
      } else {
        const resIndex = []
        selectedRows.map((item) => {
          resIndex.push(
            arr.findIndex(
              (_item) =>
                `${_item.dwmc}${_item.szbz}${_item.djzId}` ===
                `${item.dwmc}${item.szbz}${item.djzId}`
            )
          )
        })

        resIndex.map((i) => {
          if (type === 1) {
            arr[i].kmQc = selectedKm ? selectedKm.kmqc : ''
            arr[i].kmDzId = selectedKm ? selectedKm.dzid : null
          } else {
            arr[i].kmQc = selectedKm ? selectedKm.kmqc + '_' + arr[i].dwmc : ''
            arr[i].kmDzId = ''
          }
          arr[i].fzhsList = null
          arr[i].sffzhs = selectedKm ? selectedKm.sffzhs : null
          arr[i].kmbm = selectedKm ? selectedKm.kmbm : null
          arr[i].creationWay = type
        })
      }
      // 更新dataSourceFiltered和Numbers
      const dataSourceFilteredCopy = cloneDeep(dataSourceFiltered)
      let not = 0
      const kmMcList = []
      const map = arr.reduce((res, cur) => {
        if (cur.kmQc) {
          kmMcList.push(cur.kmQc)
        }
        if (!cur.kmQc) {
          not += 1
        }
        if (cur.djzId) {
          res[cur.djzId] = cur
        }

        return res
      }, {})

      dataSourceFilteredCopy.forEach((row, i, arr) => {
        if (map[row.djzId]) {
          arr[i] = map[row.djzId]
        }
      })
      setNumbers({
        all: arr.length,
        not,
        complete: arr.length - not,
      })
      setKmMcList(['全部', ...new Set(kmMcList)])
      setDataSourceFiltered(dataSourceFilteredCopy)
      model.changeState({
        dataSource: arr,
      })
    },
    [dataSource, model, dataSourceFiltered]
  )

  // 获取表格数据
  const requestTableData = useMemo(() => {
    const request = async (params) => {
      setLoading(true)
      model.changeState({ isLoadingTable: true })
      const res = await api.yhdjController
        .wldwGet({
          req: params,
        })
        .finally(() => {
          setLoading(false)
          model.changeState({ isLoadingTable: false })
        })
      // 计算匹配度
      res.forEach((item) => {
        item.matchPersent = matchFunc(item.kmQc?.replace(/^.*_(.+)$/g, '$1'), item.dwmc)
      })
      model.changeState({ dataSource: res })
    }
    return createObRequest(request)
  }, [model])

  // 过滤表格的fn
  const filterTable = useCallback(
    (dataSource, filterParams) => {
      const {
        dfhmList,
        comment = '',
        amountStart,
        amountEnd,
        kmmc,
        status,
        incomeStatus,
        isOnlyShowException,
      } = filterParams
      const fitlerStatus = (record, status) => {
        // 全部
        if (status === 0) {
          return true
        }
        // 未补充
        if (status === 1) {
          return !record.kmQc
        }
        // 已补充
        if (status === 2) {
          return record.kmQc
        }
      }
      const dataSourceFiltered = dataSource.filter((item) => {
        const dwmc = item.dwmc || ''
        const _comment = item.comment || ''
        const _kmQc = item.kmQc || ''
        const matchPersent = matchFunc(_kmQc.replace(/^.*_(.+)$/g, '$1'), dwmc)
        if (
          (dfhmList.length === 0 || dfhmList.includes(dwmc)) &&
          (comment === '摘要备注空值' ? _comment === '' : _comment === comment || comment === '') &&
          (_kmQc === kmmc || kmmc === '') &&
          item.amount >= amountStart &&
          item.amount <= amountEnd &&
          fitlerStatus(item, status) &&
          (incomeStatus === 0 || item.szbz === incomeStatus) &&
          (!isOnlyShowException || matchPersent < 100)
        ) {
          return true
        }
      })
      setDataSourceFiltered(dataSourceFiltered)
    },
    [setDataSourceFiltered]
  )

  // FilterArea组件的prop onChange
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

  // 订阅params，mount或params改变时请求表格数据
  useObModelSubscribe(
    model,
    (state) => state.params,
    (params) => {
      if (params) {
        requestTableData(params)
      }
    }
  )

  // 设置高级搜索中的 摘要备注/往来科目/对方户名下拉列表，以及已完成，未完成和全部的数量
  const setFilterOptions = (dataSource) => {
    const kmMcList = []
    const bzList = []
    const dfhmList = []
    let not = 0
    let complete = 0
    let isBzEmpty = false
    let isDfhmEmpty = false
    // 是否都是支出
    let isAllZc = true
    dataSource.forEach((item) => {
      if (item.kmQc) {
        kmMcList.push(item.kmQc)
      }
      if (item.comment) {
        bzList.push(item.comment)
      }
      if (!item.comment && isBzEmpty === false) {
        isBzEmpty = true
      }
      if (item.dwmc) {
        dfhmList.push(item.dwmc)
      }
      if (!item.dwmc && isDfhmEmpty === false) {
        isDfhmEmpty = true
      }
      if (!item.kmQc) {
        not += 1
        if (item.szbz === 1 && isAllZc === true) {
          isAllZc = false
        }
      } else {
        complete += 1
      }
    })
    if (isBzEmpty) {
      bzList.unshift('摘要备注空值')
    }
    if (isDfhmEmpty) {
      dfhmList.unshift('对方户名空值')
    }
    setKmMcList(['全部', ...new Set(kmMcList)])
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
        if (!item.kmQc) {
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

  // 订阅dataSource，mount或dataSource改变时设置摘要备注列表和对方户名列表
  useObModelSubscribe(
    model,
    (state) => state.dataSource,
    (dataSource) => {
      if (!visitedRef.current && dataSource.length > 0) {
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
    (selectedRows, msg) => {
      if (selectedRows.length === 0) {
        message.warning('请至少勾选一条数据！')
        return false
      }
      if (!diffSzbz(selectedRows, condition.incomeStatus)) {
        message.warning(`请选择相同收支状态的银行数据${msg}科目！`)
        return false
      }
      return true
    },
    [condition.incomeStatus]
  )

  // 获取科目列表
  const requestKmList = useMemo(() => {
    const request = async (params) => {
      const res = await api.fundCommonController.selectAllZtkm({
        param: {
          dykm: params.dykm,
          kjnd: window.YZF?.GlobalData?.QyData?.kjnd,
          ztdm: window.YZF?.GlobalData?.QyData?.ztdm,
          more: true,
          szbz: params.szbz,
          kjqj: window.YZF?.GlobalData?.QyData?.kjqj,
        },
      })
      return res
    }
    return createObRequest(request)
  }, [])

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
        code: 'amount',
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
        name: '匹配度',
        code: 'matchPersent',
        width: 150,
        render: (_, record) => {
          const matchPersent = matchFunc(record.kmQc?.replace(/^.*_(.+)$/g, '$1'), record.dwmc)
          return (
            <div className='match-persent'>
              <span>
                <span
                  style={{
                    width: `${matchPersent}%`,
                    background:
                      matchPersent >= 0 && matchPersent < 50
                        ? '#FF3232'
                        : matchPersent >= 50 && matchPersent < 100
                        ? '#FCA736'
                        : '#00A84C',
                  }}></span>
              </span>
              <span
                style={{
                  color:
                    matchPersent >= 0 && matchPersent < 50
                      ? '#FF3232'
                      : matchPersent >= 50 && matchPersent < 100
                      ? '#FCA736'
                      : '#00A84C',
                }}>
                {matchPersent || 0}%
              </span>
            </div>
          )
        },
        features: { sortable: true },
      },
      {
        name: '往来科目',
        key: 'kmQc',
        width: 200,
        render: (_, record, index) => {
          const { kmQc, szbz, sffzhs, kmDzId } = record
          return (
            <EditKm
              szbz={szbz}
              kmQc={kmQc}
              sffzhs={sffzhs}
              dzid={kmDzId || ''}
              index={index}
              active={index === editIndex}
              setEditIndex={setEditIndex}
              requestKmList={requestKmList}
              onChange={(km) => {
                changeDataSource(km, [record], 1)
              }}
              createKm={() => {
                setCurRow(record)
                setShow(true)
              }}
            />
          )
        },
      },
    ]
  }, [editIndex, changeDataSource, requestKmList])

  // ali-react-table
  const pipeline = useTablePipeline({ components: { Checkbox, tips: Tooltip } })
    .input({
      dataSource: dataSourceFiltered,
      columns,
    })
    .primaryKey('djzId')
    .use(
      features.multiSelect({
        highlightRowWhenSelected: true,
        checkboxPlacement: 'start',
        checkboxColumn: { lock: true, width: 40 },
        clickArea: 'row',
        onChange: (selectedKeys) => {
          const selectedRows = []
          dataSourceFiltered.forEach((item) => {
            if (selectedKeys.includes(item.djzId)) {
              selectedRows.push(item)
            }
          })
          setSelectedRows(selectedRows)
        },
        stopClickEventPropagation: true,
        value: selectedRows.map((item) => item.djzId),
      })
    )
    .use(
      features.sort({
        mode: 'single',
        defaultSorts: [{ code: 'matchPersent', order: 'desc' }],
      })
    )

  const szbz = curRow || selectedRows[0] ? (curRow || selectedRows[0]).szbz : null
  const dwmc = curRow || selectedRows[0] ? (curRow || selectedRows[0]).dwmc : ''
  return (
    <div>
      <div className={styles.filterWrap}>
        <FilterArea
          formInstance={formInstance}
          formInitValues={formInitValues}
          step={step}
          bzList={bzList}
          kmMcList={kmMcList}
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
              if (validate(selectedRows, '创建')) {
                setShow(true)
              }
            }}>
            创建科目
          </Button>
          <Button
            type='primary'
            className={styles.btnPrimary2}
            onClick={() => {
              if (validate(selectedRows, '对应')) {
                setVisible(true)
              }
            }}>
            对应科目
          </Button>
        </div>
      </div>
      <BaseTable
        {...pipeline.getProps()}
        isLoading={loading}
        style={{ height: 300, overflowY: 'auto' }}
      />
      <CorrespondKmModal
        visible={visible}
        szbz={szbz}
        setVisible={setVisible}
        requestKmList={requestKmList}
        handleOk={(km) => {
          changeDataSource(km, selectedRows, 1)
        }}
      />
      <CreateKmModal
        visible={show}
        szbz={szbz}
        dwmc={dwmc}
        setVisible={setShow}
        requestKmList={requestKmList}
        onClose={() => {
          setCurRow(null)
        }}
        handleOk={(km, checkAll) => {
          changeDataSource(km, curRow ? [curRow] : selectedRows, 2, checkAll)
        }}
      />
    </div>
  )
}

export default FirstStep
