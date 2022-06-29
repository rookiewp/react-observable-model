// @ts-nocheck

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Modal, Button, Steps, message } from 'antd'
import { ExclamationCircleFilled } from '@ant-design/icons'
import FirstStep from './components/firstStep'
import SecondStep from './components/secondStep'
import ThreeStep from './components/threeStep'
import { useObModelToState, createObRequest, useSubscriptions } from '@/components/observable-model'
import { event as GlobalEvent } from '@/kit/Global'
import { getModel, unsubscribeModel } from './model'
import { history } from 'umi'
import api from '@/api'

import './index.less'

const { Step } = Steps

const initSteps = [
  {
    title: '往来科目',
    key: 1,
  },
  {
    title: '业务类型',
    key: 2,
  },
]

const BankBatchImport2 = (props: IFunctionModalProps) => {
  const model = getModel()
  const { injectProps, event, destroy } = props
  const [visible, setVisible] = useState(false)
  const [btnLoading, setBtnLoading] = useState<boolean>(false)
  const [steps, setSteps] = useState(initSteps)
  // 操作完成的回调
  const [okCallback, setOkCallback] = useState(null)

  const step = useObModelToState(model, (state) => state.step)
  // 表格数据，来自model, 代表 往来科目/业务类型/辅助核算的dataSource，下一步和提交的时候要用
  const dataSource = useObModelToState(model, (state) => state.dataSource)
  const isLoadingTable = useObModelToState(model, (state) => state.isLoadingTable)
  const changeFilterCondition = useObModelToState(model, (state) => state.changeFilterCondition)

  const rootSubscription = useSubscriptions()

  useEffect(() => {
    return () => {
      unsubscribeModel()
    }
  }, [])

  useEffect(() => {
    const { detail } = event
    if (detail) {
      setVisible(true)
      const { data, okCallback } = detail
      model.changeState({ params: data })
      if (okCallback && typeof okCallback === 'function') {
        setOkCallback(() => () => okCallback())
      }
    }
  }, [event, model])

  // 如果直接关闭Tab或者点击返回按钮。那么FunctionModal里的组件的useEffect的副作用清理函数不会被调用，也就不会调用unsubscribeModel取消订阅，导致bug
  // 监听Tab的关闭事件和路由事件，强制destroy Modal，触发useEffect的清除函数
  useEffect(() => {
    const handlerTabClose = (tab) => {
      if (tab.key === '/ledger/static/fund/bank2.html') {
        destroy()
      }
    }
    const unListen = history.listen((route) => {
      if (route.pathname !== 'ledger/static/fund/bank2.html') {
        unListen()
        destroy()
      }
    })
    GlobalEvent.on('isClosingTab', handlerTabClose)
    return () => {
      GlobalEvent.off('isClosingTab', handlerTabClose)
    }
  }, [])

  // step 1
  const nextStep = async () => {
    setBtnLoading(true)
    const saveWldw = async () => {
      const res = await api.yhdjController
        .saveWldw({
          req: {
            qyid: window.YZF?.GlobalData?.QyData?.qyid,
            sfldz: localStorage.getItem('isOldUser') ? localStorage.getItem('isOldUser') : 1,
            kjnd: window.YZF?.GlobalData?.QyData.kjnd,
            kjqj: window.YZF?.GlobalData?.QyData.kjqj,
            ztdm: window.YZF?.GlobalData?.QyData?.ztdm,
            wldwListData: dataSource,
          },
        })
        .finally(() => {
          setBtnLoading(false)
        })
      if (res) {
        message.success('保存成功', 1, () => {
          window.YZF.GlobalEvent.trigger('reloadAllPzMjkm') // 刷新科目s
          window.YZF.GlobalEvent.trigger('reLoadGridBankList') // 刷新银行list
          window.YZF.GlobalEvent.trigger('reportReload') // 刷新报表页面
          window.YZF.GlobalEvent.trigger('newJzpzFunc') // 凭证列表刷新
          window.YZF.GlobalEvent.trigger('del-fp-pl-success') // 发票列表刷新
          model.changeState({ step: 1, dataSource: [] })
        })
      }
    }

    for (let i = 0; i < dataSource.length; i++) {
      if (!dataSource[i].kmQc) {
        const modal = Modal.confirm({
          okText: '补充',
          cancelText: '忽略',
          title: '部分单位未选择记账科目',
          ...injectProps,
          content: (
            <div style={{ fontWeight: 'bold' }}>
              <span>涉及数据:</span>
              <span>{dataSource[i].dwmc}</span>
            </div>
          ),
          onOk: () => {
            setBtnLoading(false)
            changeFilterCondition(dataSource)
            modal.destroy()
          },
          onCancel: () => {
            saveWldw().then(() => modal.destroy())
          },
        })
        return
      }
    }
    saveWldw()
  }

  // step 2
  const handleOk = () => {
    let hasEmptyData = false
    // 需求 6506 批量补充允许稍后补充
    for (let i = 0; i < dataSource.length; i++) {
      // @ts-ignore
      if (!dataSource[i].showText) {
        hasEmptyData = true
        break
      }
    }
    if (hasEmptyData) {
      const tipModal = Modal.confirm({
        title: '提示',
        content: '有未补充业务类型的记录，请立刻补充数据或选择忽略！',
        okText: '补充',
        cancelText: '忽略',
        ...injectProps,
        onOk: () => {
          changeFilterCondition(dataSource)
          tipModal.destroy()
        },
        onCancel: () => {
          saveFpSupplyComplete()
        },
      })
    } else {
      saveFpSupplyComplete()
    }
  }

  const saveFpSupplyComplete = async () => {
    setBtnLoading(true)
    // let arr = dataSource
    // for (let i = 0; i < arr.length; i++) {
    //   if (arr[i].realKjsxId) {
    //     arr[i].kjsxId = arr[i].realKjsxId
    //   }
    //   if (!arr[i].fzhsIdList && arr[i].fzhsList) {
    //     arr[i].fzhsIdList = arr[i].fzhsList
    //   }
    // }
    const res = await api.yhdjController
      .saveFpSupplyComplete({
        req: {
          kjnd: window.YZF?.GlobalData?.QyData.kjnd as any,
          qyid: window.YZF?.GlobalData?.QyData.qyid,
          kjqj: window.YZF?.GlobalData?.QyData.kjqj,
          ztdm: window.YZF?.GlobalData?.QyData.ztdm as any,
          ywlxListData: dataSource,
        },
      })
      .finally(setBtnLoading(false))
    if (res) {
      // 校验有无辅助核算数据
      queryFzhsList()
    }
  }

  const handleCancel = useCallback(
    (flag?: boolean) => {
      if (step === 1 && !flag) {
        const closeModal = Modal.confirm({
          title: '当前内容未补充完毕，关闭弹窗会清空当前匹配的所有数据，请谨慎操作！',
          okText: '关闭',
          cancelText: '取消',
          // ...injectProps,
          onOk: () => {
            okCallback()
            closeModal.destroy()
            destroy()
            setVisible(false)
          },
        })
        return
      }
      okCallback()
      setVisible(false)
      destroy()
    },
    [destroy, step, okCallback]
  )

  // 7811 查询辅助核算数据
  // 获取辅助核算列表
  const queryFzhsList = useMemo(() => {
    const {
      detail: { data },
    } = event
    const getSupplementarySupplyData = async () => {
      setBtnLoading(true)
      const res = await api.yhdjController
        .getSupplementarySupplyData({
          request: {
            kjnd: window.YZF?.GlobalData?.QyData?.kjnd,
            kjqj: window.YZF?.GlobalData?.QyData?.kjqj,
            ztdm: window.YZF?.GlobalData?.QyData?.ztdm,
            qyid: window.YZF?.GlobalData?.QyData?.qyid,
            sfldz: 0,
            qdids: data.qdids && data.qdids.length ? data.qdids : null,
            yhzhid: data.kYhzhid,
          },
        })
        .finally(() => setBtnLoading(false))
      if (res && res.length) {
        res.forEach((item, i) => {
          item._id = i
        })
        model.changeState({ step: 1.5, dataSource: res })
        setSteps([
          ...initSteps,
          {
            title: '辅助核算',
            key: 1.5,
          },
        ])
      } else {
        handleCancel(true)
      }
    }
    const { request, subscription } = createObRequest(getSupplementarySupplyData)
    rootSubscription.add(subscription)
    return request
  }, [event, model, handleCancel, rootSubscription])

  // 提交前校验辅助核算数据
  const checkFzhsData = () => {
    // 是否需要利用缓存对象
    for (let i = 0; i < dataSource.length; i++) {
      for (let j = 0; j < dataSource[i].data.length; j++) {
        if (!dataSource[i].data[j].fzhsid) {
          message.error(`有未补充的辅助核算，请补充完毕后提交`)
          changeFilterCondition(dataSource)
          return false
        }
      }
    }
    return true
  }

  // 提交辅助核算补充数据
  const saveSupplementarySupplyData = async () => {
    if (!checkFzhsData()) {
      return
    }
    setBtnLoading(true)
    await api.yhdjController
      .saveSupplementarySupplyData({
        kjnd: window.YZF?.GlobalData?.QyData?.kjnd,
        qyid: window.YZF?.GlobalData?.QyData?.qyid,
        supplyList: dataSource,
      })
      .finally(() => {
        setBtnLoading(false)
      })
    handleCancel()
  }

  const switchNextStep = () => {
    switch (step) {
      case 0:
        nextStep()
        break
      case 1:
        handleOk()
        break
      case 1.5:
        saveSupplementarySupplyData()
        break
      default:
        break
    }
  }

  return (
    <>
      <Modal
        r-if={visible}
        width={1200}
        className='bank_batch_import_modal'
        title='批量补充'
        visible={visible}
        style={{ height: '620px' }}
        onCancel={() => {
          window.NewDZ.GlobalEvent.call('invoice-next-empty', {
            onOk: () => {
              handleCancel(true)
            },
            onCancel: () => {},
            title: '预警',
            type: 'warning',
            footerTitle: ['取消', '确定'],
            tip: '当前内容未补充完毕，关闭弹窗会清空当前匹配的所有数据，请谨慎操作！',
          })
        }}
        maskClosable={false}
        destroyOnClose
        {...injectProps}
        footer={[
          <Button
            r-if={step < 2 && step > 0}
            key='back'
            disabled={isLoadingTable}
            onClick={() => {
              model.changeState({ step: Math.floor(step - 0.5), dataSource: [] })
            }}>
            上一步
          </Button>,
          <Button
            key='ok'
            type='primary'
            disabled={isLoadingTable}
            onClick={() => {
              switchNextStep()
            }}
            loading={btnLoading}>
            {step <= 1 ? '下一步' : '完成'}
          </Button>,
        ]}>
        <div className='content'>
          <div className='fzhs_supplement_title' r-if={step === 1.5}>
            <ExclamationCircleFilled />
            <span>
              补充往来科目和业务类型已开启辅助核算，请补充具体辅助核算项的明细项，否则无法生成凭证
            </span>
          </div>
          <div className='step'>
            <Steps current={step === 1.5 ? 2 : step} size='small'>
              {steps.map((item) => (
                <Step key={item.key} title={item.title} />
              ))}
            </Steps>
          </div>
          <div style={{ width: '100%' }}>
            <FirstStep step={step} r-if={step === 0} />
            <SecondStep step={step} r-if={step === 1} />
            <ThreeStep step={step} r-if={step === 1.5} />
          </div>
        </div>
      </Modal>
    </>
  )
}

export default BankBatchImport2
