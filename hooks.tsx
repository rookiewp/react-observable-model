import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Subscription, Subject, Observable } from 'rxjs'
import { publishReplay, refCount } from 'rxjs/operators'
import { produce, Draft } from 'immer'
import { map } from './enhanceModel'

const compareDefalut = (a, b) => a === b

// 一个react hook，根据selector 从model中获取state。类似react-redux的useSelector
export function useObModelToState(modelPorxy, selector, compare = compareDefalut) {
  const modelCtx = map.get(modelPorxy)
  const { _state } = modelCtx
  const initValue = selector(_state)
  // initValue可能是个函数
  const [v, setV] = useState(() => initValue)
  const optionsRef = useRef({
    selector,
    compare,
  })

  useEffect(() => {
    const subscription = modelCtx.state$
      .pipe(publishReplay(1), refCount())
      .subscribe(([state, prevState]) => {
        const { selector, compare } = optionsRef.current
        const curV = selector(state || {})
        const preV = selector(prevState || {})
        if (!compare(curV, preV)) {
          setV(curV)
        }
      })
    return () => {
      subscription.unsubscribe()
    }
  }, [modelCtx.state$])

  return v
}

// 一个react hook, 根据selector 来 subscribe model中的特定值，mount时和值改变时触发回调
export function useObModelSubscribe(
  modelPorxy,
  selector,
  subscribeCallback,
  compare = compareDefalut
) {
  const isMountRef = useRef(true)
  const optionsRef = useRef({
    selector,
    subscribeCallback,
    compare,
  })
  const modelCtx = map.get(modelPorxy)
  useEffect(() => {
    const subscription = modelCtx.state$
      .pipe(publishReplay(1), refCount())
      .subscribe(([state, prevState]) => {
        const { selector, subscribeCallback, compare } = optionsRef.current
        const curV = selector(state || {})
        const preV = selector(prevState || {})
        if (isMountRef.current) {
          isMountRef.current = false
          subscribeCallback(curV, preV, true)
        } else if (!compare(curV, preV)) {
          subscribeCallback(curV, preV, false)
        }
      })
    return () => {
      subscription.unsubscribe()
    }
  }, [modelCtx.state$])
}

// 统一处理unsubscribe
export function useSubscriptionsHooks() {
  const rootSubscription = useMemo(() => new Subscription(), [])
  useEffect(() => {
    return () => {
      rootSubscription.unsubscribe()
    }
  }, [rootSubscription])

  return rootSubscription
}

type DraftFunction<S> = (draft: Draft<S>) => void
type Updater<S> = (arg: S | DraftFunction<S>) => void
type ImmerHook<S> = [S, Updater<S>]

type UseImmer = <S>(initialValue: S | (() => S)) => ImmerHook<S>

// useImmer + 返回newState
export const useImmerWithReturn: UseImmer = <S,>(initialValue) => {
  const ref = useRef<S>()
  const [val, updateValue] = useState(initialValue)
  ref.current = val
  return [
    val,
    useCallback((updater: Updater<S>) => {
      let newState
      if (typeof updater === 'function') {
        newState = produce(ref.current, updater)
        updateValue(newState)
      } else {
        newState = updater
        updateValue(updater)
      }
      return newState
    }, []),
  ]
}

// 将state转为Observable，支持useImmer
export function useStateToOb(initialValue) {
  const subject$ = useMemo(() => new Subject(), [])
  const ob$ = useMemo(
    () =>
      new Observable((observer) => {
        subject$.subscribe(observer)
      }),
    [subject$]
  )

  const [val, update] = useImmerWithReturn(initialValue)
  const setStateWithOb = useCallback(
    (value) => {
      const newState = update(value)
      subject$.next(newState)
    },
    [update, subject$]
  )
  return [val, setStateWithOb, ob$]
}
