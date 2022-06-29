import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useMount } from 'ahooks'
import { Select, Tooltip } from 'antd'
import { throttle } from 'lodash-es'
import { event as GlobalEvent } from '@/kit/Global'
import { PlusCircleOutlined } from '@ant-design/icons'
import api from '@/api'
import { BANK_BATCH_IMPORT } from '../../../constant'

import styles from './index.less'

const { Option, OptGroup } = Select

const addYwlx = throttle(
  (yhzhId) => {
    GlobalEvent.call('bank.addNewYWLX', {
      type: 'YH',
      yhzhid: yhzhId,
    })
  },
  5000,
  { trailing: false }
)

export interface YwlxSelectProps {
  firstList: any[] // 一级业务类型列表
  record: Record<string, any> // table 行数据
  yhzhId: string // 银行账户id
  onFinish: (selectedYwlxArr: any[]) => void // 选完后调用
  isBatch?: boolean // 是否为批量补充
}

function YwlxSelect(props: YwlxSelectProps, ref) {
  const { firstList, record, yhzhId, onFinish, isBatch = false } = props
  // kjsxId: 默认的一级科目id
  // szbz不知道是啥，调接口要用
  // iid, secondKjsxId：iid可能是二级或者三级业务类型id，需要前端判断，判断方法：如果在二级业务列表中找不到iid，那就说明iid是三级id，secondKjsxId是二级id；如果能找到说明iid是二级id，并且没有三级。因为iid表示最后一级
  const { kjsxId, szbz, iid, secondKjsxId } = record
  // 二级业务类型list
  const [secondList, setSecondList] = useState([])
  // 三级业务类型list
  const [threeList, setThreeList] = useState([])
  // 一级业务类型id，批量操作的时候不回填
  const [firstId, setFirstId] = useState(isBatch ? '' : kjsxId)
  // 二级业务类型id
  const [secondId, setSecondId] = useState('')
  // 三级业务类型id
  const [threeId, setThreeId] = useState('')
  // 选中的一级业务类型
  const [selectedFirstYwlx, setFirstYwlx] = useState(null)
  // 选中的二级业务类型
  const [selectedSecondYwlx, setSecondYwlx] = useState(null)
  // 选中的三级级业务类型
  const [selectedThreeYwlx, setThreeYwlx] = useState(null)
  // 是否为mount
  const isMountRef = useRef(true)

  const onFinishRef = useRef(onFinish)

  // 清空二级
  const clearSecond = useCallback(() => {
    setSecondList([])
    setSecondId('')
    setSecondYwlx(null)
  }, [])

  // 清空三级
  const clearThree = useCallback(() => {
    setThreeList([])
    setThreeId('')
    setThreeYwlx(null)
  }, [])

  // 查询二级和三级列表是同一个接口
  const querySecondOrThreeListApi = useCallback(
    async (kjsxid, lxbz) => {
      const res = await api.kjsxModelController.getSelectDataBykjsxid({
        request: {
          kjsxid,
          lxbz,
          plbc: true,
          kjnd: window.YZF?.GlobalData?.QyData?.kjnd,
          qyId: window.YZF?.GlobalData?.QyData?.qyid,
          ztdm: window.YZF?.GlobalData?.QyData?.ztdm,
          yhzhId: yhzhId,
          kjqj: window.YZF?.GlobalData?.QyData?.kjqj,
        },
      })
      return res
    },
    [yhzhId]
  )

  // 根据一级业务类型查二级业务类型
  const querySecondList = useCallback(
    async (kjsxId) => {
      let firstYwlx = null
      let secondYwlx = null
      if (firstList.length > 0 && kjsxId) {
        setFirstId(kjsxId)
        firstYwlx = [...firstList[0]?.kjsxList, ...firstList[1]?.kjsxList].find((item) => {
          if (kjsxId?.startsWith('S')) {
            return item.kjsxid === kjsxId?.slice(0, 7)
          }
          return item.kjsxid === kjsxId
        })
        if (firstYwlx) {
          setFirstYwlx(firstYwlx)
          // TODO 老逻辑，不知道什么意思
          if (firstYwlx.kmdzId && !firstYwlx.sffzhs) {
            clearSecond()
            clearThree()
            onFinishRef.current([firstYwlx])
            return []
          }
          const secondList = await querySecondOrThreeListApi(firstYwlx.kjsxid, firstYwlx.lxbz)
          if (secondList.length > 0) {
            // mount时，根据传入的iid, secondKjsxId初始化二级和三级
            if (isMountRef.current) {
              isMountRef.current = false
              // 判断iid是否为二级业务类型id
              // iid, secondKjsxId：iid可能是二级或者三级业务类型id，需要前端判断，判断方法：如果在二级业务列表中找不到iid，那就说明iid是三级id，secondKjsxId是二级id；如果能找到说明iid是二级id，并且没有三级。因为iid表示最后一级
              const iidIsSecondId = Boolean(secondList.find((item) => item.id === iid))
              const secondId = iidIsSecondId ? iid : secondKjsxId
              const threeId = iidIsSecondId ? '' : iid
              setSecondId(secondId)
              setThreeId(threeId)
              secondYwlx = secondList.find((item) => item.id === secondId) || secondList[0]
              /* eslint-disable */
              if (secondYwlx) {
                setSecondYwlx(secondYwlx)
              } else {
                setSecondYwlx(null)
              }
              // 初始化时不触发onFinish，修改时才触发
              // if (!secondYwlx) {
              //   onFinishRef.current([firstYwlx])
              // } else if (secondYwlx && !secondYwlx.queryAgain) {
              //   onFinishRef.current([firstYwlx, secondYwlx])
              // }
              /* eslint-enable */
            } else {
              // 非mount，也就是手动选择业务类型时
              clearSecond()
              clearThree()
            }
          } else {
            clearSecond()
            clearThree()
            // 初始化时不触发onFinish，修改时才触发
            if (!isMountRef.current) {
              onFinishRef.current([firstYwlx])
            }
            isMountRef.current = false
          }
          setSecondList(secondList)
        } else {
          clearSecond()
          clearThree()
          isMountRef.current = false
        }
      }
      return [firstYwlx, secondYwlx]
    },
    [firstList, querySecondOrThreeListApi, iid, secondKjsxId, clearSecond, clearThree]
  )

  // 根据二级业务类型查三级业务类型
  const queryThreeList = useCallback(
    async (secondId, lxbz) => {
      const threeList = await querySecondOrThreeListApi(secondId, lxbz)
      setThreeList(threeList || [])
      return threeList || []
    },
    [querySecondOrThreeListApi]
  )

  // 先查二级再查三级
  const getSecondAndThreeList = useCallback(
    async (kjsxid) => {
      const [firstYwlx, secondYwlx] = await querySecondList(kjsxid)
      if (firstYwlx && secondYwlx && secondYwlx.queryAgain) {
        const threeList = queryThreeList(secondYwlx.id, firstYwlx.lxbz)
        if (!threeList) {
          onFinishRef.current([firstYwlx, secondYwlx])
          setThreeId('')
        }
      } else {
        clearThree()
      }
    },
    [querySecondList, queryThreeList, clearThree]
  )

  useEffect(() => {
    GlobalEvent.on(BANK_BATCH_IMPORT.添加业务类型, () => {
      isMountRef.current = true
      clearSecond()
      clearThree()
      getSecondAndThreeList(kjsxId)
    })
    return () => {
      GlobalEvent.off(BANK_BATCH_IMPORT.添加业务类型)
    }
  }, [getSecondAndThreeList, kjsxId, clearSecond, clearThree, isBatch])

  useMount(() => {
    if (kjsxId && !isBatch) {
      getSecondAndThreeList(kjsxId)
    }
  })

  useImperativeHandle(ref, () => ({
    // 获取没选择的业务类型的层级，比如一级业务类型没有选，返回：1，依次类推。都选了，返回：0
    getNotSelectLevel: () => {
      if (!selectedFirstYwlx) {
        return 1
      }
      if (secondList.length > 0 && !selectedSecondYwlx) {
        return 2
      }
      if (threeList.length > 0 && !selectedThreeYwlx) {
        return 3
      }
      return 0
    },
  }))

  const selectWidth = isBatch ? 300 : 160

  return (
    <div style={{ width: '100%', display: !isBatch ? 'flex' : 'block' }}>
      <div r-if={firstList.length > 0}>
        <Select
          showSearch
          value={firstId}
          style={{ width: selectWidth }}
          dropdownRender={(menu) => (
            <>
              {menu}
              <div
                className={styles.addArea}
                onClick={(e) => {
                  e.stopPropagation()
                  addYwlx(yhzhId)
                }}>
                <PlusCircleOutlined />
                <span>新增业务类型</span>
              </div>
            </>
          )}
          onChange={(v) => {
            setFirstId(v)
            clearSecond()
            clearThree()
            // getSecondAndThreeList(v)
            querySecondList(v)
          }}>
          {firstList?.map((item) => (
            <OptGroup
              key={item.type}
              r-if={item.kjsxList && item.kjsxList.length}
              label={item.type === 'SYSTEM' ? '系统类型' : '自定义类型'}>
              {item.kjsxList.map((iitem) => (
                <Option
                  label={iitem.kjsxmc}
                  r-if={iitem.szbz === szbz}
                  key={iitem.kjsxid}
                  value={iitem.kjsxid}>
                  <Tooltip title={iitem.kjsxmc}>{iitem.kjsxmc}</Tooltip>
                </Option>
              ))}
            </OptGroup>
          ))}
        </Select>
      </div>
      <div
        r-if={secondList.length > 0}
        style={{ marginLeft: isBatch ? 0 : 8, marginTop: isBatch ? 12 : 0 }}>
        <Select
          showSearch
          optionFilterProp='label'
          value={secondId}
          style={{
            width: selectWidth,
          }}
          placeholder='请选择'
          dropdownClassName='batch-drop-select'
          onChange={(v) => {
            setSecondId(v)
            clearThree()
            const secondYwlx = secondList.find((item) => item.id === v)
            setSecondYwlx(secondYwlx)
            if (secondYwlx.queryAgain) {
              const threeList = queryThreeList(secondYwlx.id, selectedFirstYwlx.lxbz)
              if (!threeList) {
                onFinishRef.current([selectedFirstYwlx, secondYwlx])
              }
            } else {
              onFinishRef.current([selectedFirstYwlx, secondYwlx])
            }
          }}>
          {secondList?.map((item) => (
            <Option
              key={item.id}
              value={item.id}
              label={`${item.prefixXsz} ${item.suffixXsz ?? ''}`}
              disabled={item.errorMsg && item.errorMsg.length}>
              <Tooltip
                placement='top'
                title={
                  threeList.length === 0 ? (
                    <span>
                      <span r-if={item.sffzhs}>
                        辅助核算：{item.fzhsmc}
                        <br />
                      </span>
                      <span r-if={item.ywsjId}>
                        业务数据：{item.mc}
                        <br />
                      </span>
                      <span r-if={item.ywsjId}>对应</span>
                      <span r-if={item.sffzhs}>所属</span>
                      科目：{item.kmmc}
                      <br />
                      余额：{item.qmye}
                      <br />
                    </span>
                  ) : (
                    <span>{`${item.prefixXsz} ${item.suffixXsz ?? ''}`}</span>
                  )
                }>
                <div>
                  {item.sffzhs ? <span className='fzhs_icon'> 辅 </span> : ''}
                  {`${item.prefixXsz} ${item.suffixXsz ?? ''}`}
                </div>
              </Tooltip>
            </Option>
          ))}
        </Select>
      </div>
      <div
        r-if={threeList.length > 0}
        style={{ marginLeft: isBatch ? 0 : 8, marginTop: isBatch ? 12 : 0 }}>
        <Select
          showSearch
          optionFilterProp='label'
          value={threeId}
          placeholder='请选择'
          style={{
            width: selectWidth,
          }}
          dropdownClassName='batch-drop-select'
          onChange={(v) => {
            setThreeId(v)
            const threeYwlx = threeList.find((item) => item.id === v)
            setThreeYwlx(threeYwlx)
            onFinishRef.current([selectedFirstYwlx, selectedSecondYwlx, threeYwlx])
          }}>
          {threeList?.map((item) => (
            <Option
              key={item.id}
              value={item.id}
              label={`${item.prefixXsz} ${item.suffixXsz ?? ''}`}
              disabled={item.errorMsg && item.errorMsg.length}>
              <Tooltip
                placement='top'
                title={
                  <span>
                    <span r-if={item.sffzhs}>
                      辅助核算：{item.fzhsmc}
                      <br />
                    </span>
                    <span r-if={item.ywsjId}>
                      业务数据：{item.mc}
                      <br />
                    </span>
                    <span r-if={item.ywsjId}>对应</span>
                    <span r-if={item.sffzhs}>所属</span>
                    科目：{item.kmmc}
                    <br />
                    余额：{item.qmye}
                    <br />
                  </span>
                }>
                <div>
                  {item.sffzhs ? <span className='fzhs_icon'> 辅 </span> : ''}
                  {`${item.prefixXsz} ${item.suffixXsz ?? ''}`}
                </div>
              </Tooltip>
            </Option>
          ))}
        </Select>
      </div>
    </div>
  )
}

export default forwardRef(YwlxSelect)
