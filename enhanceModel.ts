import { BehaviorSubject } from 'rxjs'
import { produce } from 'immer'

export type ModelCtx = {
  _prevState: any
  _state: any
  _model: any
  state$: BehaviorSubject<any>
  changeState: (partialState: any) => void
  [key: string]: any
}

type Model = {
  state: Record<string, unknown> // 任意对象
  [key: string]: any
}

const canGetKey = (model, key) => {
  return (
    [...Object.getOwnPropertyNames(model), 'state$', 'changeState'].includes(key) && key !== 'state'
  )
}

export const map = new Map()

// 根据model生成 modelCtx
export function enhanceModel(model: Model) {
  const initState = model.state
  if (initState === undefined || initState === null) {
    throw new Error('model.state must be a object')
  }
  const state$ = new BehaviorSubject([initState, null])
  const modelCtx: ModelCtx = {
    _model: model,
    _prevState: null, // 上一个state
    _state: initState, // 当前state
    state$, // state对应的Observable
    queue: [],
    waiting: false,
    flush() {
      const finalPartialState = modelCtx.queue.reduce((prev, next) => {
        return { ...prev, ...next }
      }, {})
      const newState = produce(modelCtx._state, (draft) => {
        Object.assign(draft, finalPartialState)
      })
      modelCtx._prevState = modelCtx._state
      modelCtx._state = newState
      modelCtx.queue.length = 0
      modelCtx.waiting = false
      state$.next([modelCtx._state, modelCtx._prevState])
    },

    // 通过immer的方式改变state, 并调用state$.next()吐出[newState, oldState]，之所以要吐出oldState，为了可以比较新老state已决定是否要触发更新
    changeState(partialState) {
      const newState = produce(modelCtx._state, (draft) => {
        Object.assign(draft, partialState)
      })
      modelCtx._prevState = modelCtx._state
      modelCtx._state = newState
      state$.next([modelCtx._state, modelCtx._prevState])
    },
  }

  const modelProxy = new Proxy(modelCtx, {
    get(target, key, receiver) {
      if (canGetKey(model, key)) {
        return Reflect.get(target, key, receiver)
      }
    },
    set(target, key, value) {
      // console.warn('just change model state by changeState')
      return value
    },
  })
  map.set(modelProxy, modelCtx)
  // 给model上的方法包裹一层，传入modelProxy参数
  Object.getOwnPropertyNames(model).forEach((methodName) => {
    if (methodName !== 'state') {
      const method = model[methodName]
      if (method && typeof method === 'function') {
        modelCtx[methodName] = (...params) => {
          return method(...params, modelProxy)
        }
      }
    }
  })
  return modelProxy
}
