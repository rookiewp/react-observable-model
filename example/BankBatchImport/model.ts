import { createModel } from '@/components/observable-model'

type State = {
  step: 0 | 1 | 1.5 | 2
  params: any
  dataSource: any[]
  isLoadingTable: boolean
  changeFilterCondition: () => void
}

const state: State = {
  step: 0,
  params: null,
  dataSource: [],
  isLoadingTable: false,
  changeFilterCondition: () => {},
}

const model = {
  state,
  // getListAsync(params, modelCtx) {
  //   new Promise((resolve, reject) => {
  //     setTimeout(() => {
  //       modelCtx.changeState({
  //         name: 'wp',
  //       })
  //     }, 1000)
  //   })
  // },
}

export const { getModel, unsubscribeModel } = createModel(model)
