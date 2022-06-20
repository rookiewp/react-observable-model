import { defer, from } from 'rxjs'
import { switchMap, retry, debounceTime, finalize } from 'rxjs/operators'
import { enhanceModel, ModelCtx } from './enhanceModel'

export type RequestConfig = {
  debounce?: number // 防抖
  retry?: number // 重试
  onSuccess?: (res: any) => void // 成功回调
  onError?: (err: any) => void // 失败回调
  finally?: () => void // 类似Promise.finally
}

export type Request = (params: any, config: RequestConfig) => void

// 包裹形如：(params?) => Promise的异步函数（就我们项目而言就是一个async函数），主要为了使用rxjs自带的: debounceTime（防抖）retry（请求错误后重试）switchMap（多次重复请求时只获取最后一次的结果，类似redux-sage的takeLatest）如果不需要这些功能，或者Axios、umi-request已经封装好这些功能，就不需要包裹。onError的作用：如果使用了retry，同时将错误处理放在async函数中，可能回触发多次(因为async函数会多次调用)，所以这时将错误处理移到onError中
export function createObRequest(deferPromiseFn) {
  return (params, config: RequestConfig = {}) => {
    const subscription = from([0])
      .pipe(
        debounceTime(config.debounce || 0),
        switchMap(() => {
          return defer(() => deferPromiseFn(params)).pipe(retry(config.retry || 0))
        }),
        finalize(() => {
          subscription.unsubscribe()
          if (config.finally) {
            config.finally()
          }
        })
      )
      .subscribe({
        next: (res) => {
          if (config.onSuccess) {
            config.onSuccess(res)
          }
        },
        error: (err) => {
          if (config.onError) {
            config.onError(err)
          }
        },
      })
  }
}

// 创建并缓存modelCtx
export function createModel(model, async?) {
  let modelCtx: ModelCtx

  function getModel() {
    if (modelCtx) {
      return modelCtx
    }
    modelCtx = enhanceModel(model, async)
    return modelCtx
  }

  function unsubscribeModel() {
    if (modelCtx) {
      modelCtx.state$.unsubscribe()
      modelCtx = null
    }
  }

  return {
    getModel,
    unsubscribeModel,
  }
}
