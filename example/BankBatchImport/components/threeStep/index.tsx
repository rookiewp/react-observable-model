import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { BaseTable, useTablePipeline, features } from 'ali-react-table'
import { Checkbox, Tooltip, Form, Button, message } from 'antd'
import { distinctUntilChanged, withLatestFrom } from 'rxjs/operators'
import { cloneDeep } from 'lodash-es'
import FilterArea, { Condition } from '../filter-area'
import api from '@/api'
import { getModel } from '../../model'
import { getFzlxCodes } from '../../utils'
import {
  createObRequest,
  useObModelSubscribe,
  useObModelToState,
  useStateToOb,
} from '@/components/observable-model'

import FzhsSelect from './fzhs-select'
import BatchFzhsModal from './batchFzhsModal'
import styles from './index.less'

interface Props {
  step: 0 | 1 | 1.5 | 2
}

const defaultCondition: Condition = {
  dfhmList: [], // 对方户名列表
  status: 0, // 补充状态：0：全部 1：未补充 2：已补充
  incomeStatus: 0, // 收支状态：0：全部 1：收入 -1：支出
}

function ThreeStep(props: Props) {
  const model = getModel()
  const { step } = props
  const [formInstance] = Form.useForm()
  // 对方户名列表
  const [dfhmList, setDfhmList] = useState([])
  const [loading, setLoading] = useState(true)
  // 过滤后的dataSource
  const [dataSourceFiltered, setDataSourceFiltered] = useState([])

  const [numbers, setNumbers] = useState({
    all: 0, // 全部
    not: 0, // 未补充数量
    complete: 0, // 已补充数量
  })

  // Modal visible
  const [visible, setVisible] = useState(false)
  // 选中的行
  const [selectedRows, setSelectedRows] = useState([])
  // 辅助核算类型 => 明细项列表
  const [fzhsType2ListMap, setFzhsType2ListMap] = useState(new Map())
  // 辅助核算类型 => 辅助核算名称
  const [fzhsType2NameMap, setFzhsType2NameMap] = useState(new Map())

  const dataSource = useObModelToState(model, (state) => state.dataSource)

  const visitedRef = useRef(false)

  // 过滤条件
  // 通过setCondition来控制FilterArea的状态。condition视为一个‘数据流’，改变时触发过滤，所以需要将状态condition转为Observable
  const [condition, setCondition, condition$] = useStateToOb(defaultCondition)

  // 修改dataSource
  const changeDataSource = useCallback(
    /**
     * @description: 修改dataSource
     * @param {Map} selectMap fzhsType => fzhsid
     * @param {{number}[]} selectedRowKeys
     * @return {void}
     */
    (selectMap: Map<string, string>, selectedRowKeys) => {
      const arr = cloneDeep(dataSource)
      // primaryKey = row._id，row._id就是行的index。selectedRowKeys存的就是行index
      for (let i = 0; i < selectedRowKeys.length; i++) {
        arr[selectedRowKeys[i]]?.data.forEach((item) => {
          item.fzhsid = selectMap.get(item.fzhsType)
        })
      }
      // 更新dataSourceFiltered和Numbers
      const dataSourceFilteredCopy = cloneDeep(dataSourceFiltered)
      let not = 0
      arr.forEach((item) => {
        if (item.data.some((item) => !item.fzhsid)) {
          not += 1
        }
      })
      dataSourceFilteredCopy.forEach((row, i, list) => {
        if (selectedRowKeys.includes(row._id)) {
          list[i] = arr[row._id]
        }
      })
      setNumbers({
        all: arr.length,
        not,
        complete: arr.length - not,
      })
      setDataSourceFiltered(dataSourceFilteredCopy)
      model.changeState({ dataSource: arr })
    },
    [dataSource, model, dataSourceFiltered]
  )

  // 获取表格数据
  const requestTableData = useMemo(() => {
    const request = async (params) => {
      setLoading(true)
      model.changeState({ isLoadingTable: true })
      const res = await api.yhdjController
        .getSupplementarySupplyData({
          request: {
            kjnd: window.YZF?.GlobalData?.QyData?.kjnd,
            kjqj: window.YZF?.GlobalData?.QyData?.kjqj,
            ztdm: window.YZF?.GlobalData?.QyData?.ztdm,
            qyid: window.YZF?.GlobalData?.QyData?.qyid,
            sfldz: 0,
            qdids: params.qdids && params.qdids.length ? params.qdids : null,
            yhzhid: params.kYhzhid,
          },
        })
        .finally(() => {
          model.changeState({ isLoadingTable: false })
          setLoading(false)
        })
      setLoading(false)
      ;(res || []).forEach((item, i) => {
        item._id = i
      })
      model.changeState({ dataSource: res })
    }
    return createObRequest(request)
  }, [model])

  // 过滤表格的fn
  const filterTable = useCallback(
    (dataSource, filterParams) => {
      const { dfhmList, status, incomeStatus } = filterParams
      const fitlerStatus = (record, status) => {
        // 全部
        if (status === 0) {
          return true
        }
        // 未补充
        if (status === 1) {
          return record.data.some((item) => !item.fzhsid)
        }
        // 已补充
        if (status === 2) {
          return record.data.every((item) => item.fzhsid)
        }
      }
      const dataSourceFiltered = dataSource.filter((item) => {
        const dwmc = item.dwmc || ''
        if (
          (dfhmList.length === 0 || dfhmList.includes(dwmc)) &&
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
    (params, _, isMount) => {
      if (!isMount) {
        requestTableData({
          qdids: params.qdids && params.qdids.length ? params.qdids : null,
          yhzhid: params.kYhzhid,
        })
      }
    }
  )

  // 查询辅助核算明细项
  const queryFzhsDetail = useMemo(() => {
    const request = async (fzlxCodes) => {
      setLoading(true)
      const res = await api.fzhsController
        .fzlxMapByZtkmIdOrFzlxCodes({
          param: {
            kjnd: window.YZF?.GlobalData?.QyData?.kjnd,
            ztdm: window.YZF?.GlobalData?.QyData?.ztdm,
            fzlxCodes,
          },
        })
        .finally(() => setLoading(false))
      if (res) {
        const mapList = new Map()
        const mapName = new Map()
        res.map((item) => {
          mapList.set(item.fzhslxCode, item.fzhsYwsjBaseRespDTOS)
          mapName.set(item.fzhslxCode, item.fzhslxName)
        })
        setFzhsType2ListMap(mapList)
        setFzhsType2NameMap(mapName)
      }
    }
    return createObRequest(request)
  }, [])

  const setFilterOptions = (dataSource) => {
    let not = 0
    let complete = 0
    let isDfhmEmpty = false
    // 是否有未完成的
    let hasNot = false
    // 是否都是支出
    let isAllZc = true
    dataSource.forEach((item) => {
      if (item.data.some((item) => !item.fzhsid)) {
        not += 1
        if (hasNot === false) {
          hasNot = true
        }
        if (item.szbz === 1 && isAllZc === true) {
          isAllZc = false
        }
      } else if (item.data.every((item) => item.fzhsid)) {
        complete += 1
      }
      if (item.dwmc) {
        dfhmList.push(item.dwmc)
      }
      if (!item.dwmc && isDfhmEmpty === false) {
        isDfhmEmpty = true
      }
    })
    setNumbers({
      all: dataSource.length,
      not,
      complete,
    })
    if (isDfhmEmpty) {
      dfhmList.unshift('对方户名空值')
    }
    setDfhmList([...new Set(dfhmList)])
    if (hasNot) {
      setCondition((draft) => {
        draft.status = hasNot === false ? 0 : 1
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
        if (item.data.some((item) => !item.fzhsid)) {
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
    (dataSource, _, isMount) => {
      if (!visitedRef.current && dataSource.length) {
        visitedRef.current = true
        setFilterOptions(dataSource)
      }
      if (isMount) {
        queryFzhsDetail(getFzlxCodes(dataSource))
      }
      if (dataSource.length === 0) {
        setDataSourceFiltered([])
      }
    }
  )
  /**
   * 查找收支状态
   */
  // const diffSzbz = (selectRows, incomeStatus) => {
  //   const res = []
  //   if (selectRows && selectRows.length && incomeStatus === 3) {
  //     for (let i = 0; i < selectRows.length; i++) {
  //       if (!res.includes(selectRows[i].szbz)) {
  //         res.push(selectRows[i].szbz)
  //       }
  //     }
  //   }
  //   return res.length > 1 ? false : true
  // }

  const validate = useCallback((selectedRows) => {
    if (selectedRows.length === 0) {
      message.warning('请至少勾选一条数据！')
      return false
    }
    // if (!diffSzbz(selectedRows, condition.incomeStatus)) {
    //   message.warning('请选择相同收支状态的银行数据创建科目！')
    //   return false
    // }
    return true
  }, [])

  // 新增辅助核算明细项
  const addFzhsMxx = useCallback(
    (fzlxCode: string): void => {
      const event = new CustomEvent('add-or-edit-fzhs', {
        detail: {
          mode: 'add',
          fzlxCode,
          zIndex: 1050,
          okCallback: (res) => {
            queryFzhsDetail(getFzlxCodes(dataSource))
          },
        },
      })
      window.dispatchEvent(event)
    },
    [queryFzhsDetail, dataSource]
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
        name: '收支状态',
        code: 'szbz',
        width: 100,
        render: (text) => {
          return text === 1 ? '收入' : '支出'
        },
      },
      {
        name: '辅助核算',
        width: 350,
        lock: true,
        render: (_, record) => {
          return (
            <FzhsSelect
              fzhsType2ListMap={fzhsType2ListMap}
              fzhsType2NameMap={fzhsType2NameMap}
              selectedRows={[record]}
              changeDataSource={changeDataSource}
              addFzhsMxx={addFzhsMxx}
            />
          )
        },
      },
    ]
  }, [changeDataSource, fzhsType2ListMap, fzhsType2NameMap, addFzhsMxx])

  // ali-react-table
  const pipeline = useTablePipeline({ components: { Checkbox, tips: Tooltip } })
    .input({
      dataSource: dataSourceFiltered,
      columns,
    })
    .primaryKey('_id')
    .use(
      features.multiSelect({
        highlightRowWhenSelected: true,
        checkboxPlacement: 'start',
        checkboxColumn: { lock: true, width: 40 },
        clickArea: 'row',
        onChange: (selectedKeys) => {
          const selectedRows = []
          dataSourceFiltered.forEach((item) => {
            if (selectedKeys.includes(item._id)) {
              selectedRows.push(item)
            }
          })
          setSelectedRows(selectedRows)
        },
        stopClickEventPropagation: true,
        value: selectedRows.map((item) => item._id),
      })
    )

  return (
    <div>
      <div className={styles.filterWrap}>
        <FilterArea
          step={step}
          dfhmList={dfhmList}
          filterCondition={condition}
          onChange={onChange}
          numbers={numbers}
        />
        <div>
          <Button
            type='primary'
            onClick={() => {
              if (validate(selectedRows)) {
                setVisible(true)
              }
            }}>
            辅助核算
          </Button>
        </div>
      </div>
      <BaseTable
        {...pipeline.getProps()}
        isLoading={loading}
        style={{ height: 300, width: '100%', overflowY: 'auto' }}
      />
      <BatchFzhsModal
        selectedRows={selectedRows}
        visible={visible}
        setVisible={setVisible}
        fzhsType2ListMap={fzhsType2ListMap}
        fzhsType2NameMap={fzhsType2NameMap}
        addFzhsMxx={addFzhsMxx}
        onOk={(selectedMap, selectedRowKeys) => {
          changeDataSource(selectedMap, selectedRowKeys)
        }}
      />
    </div>
  )
}

export default ThreeStep
