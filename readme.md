## 1: 为什么尝试 rxjs 代替 redux 和 Context 来实现状态管理：

### 1.1 Context 的问题

Context 的改变会导致所有依赖 Context 的组件重新渲染，存在性能问题！
常见的优化主要是：
1：拆分多个 Context。
2：给组件加上 Memo，再给 Memo 包一层 Wrap, 让 Wrap 去订阅 Context, 将订阅的值通过 props 传给 Memo 组件。这样 Wrap 每次都渲染（只是订阅层，渲染性能消耗很少），在 props 不变的情况下 Memo 组件不会渲染。但这样做增加了组件的层级！

### 1.2 redux 的问题

1：redux 通常需要结合 react-redux 使用，react-redux 还是用的 Context，只是做了优化。
2：redux 一般在项目级别使用，在写一些嵌套比较深的组件时一般不会考虑 redux
3：redux 写法相对麻烦，需要定义 reducer,action,必须通过 dispatch 触发。
4：你可能并不需要 redux

### 1.3 useEffect 的滥用

```javascript
// 通过setState(newParams)触发组件更新
useEffect(() => {
  if (params) {
    // 异步请求
    getListAsync(params)
  }
}, [params])

// 1、最好不要使用上面这种方式，useEffect的职责不是响应式，当依赖变的复杂后，代码可能难以维护
// 2、响应式应该是像vue watch一样，1：数据(params)改变，2：触发回调(getListAsync)。3：获取到新数据，setState触发组件重新渲染
// 3、而useEffect的所谓的‘响应式’是这样的：1：数据(params)改变，2：组件重新渲染，3：组件重新渲染后触发useEffect，这个useEffect类似class组件的didComponentUpdate生命钩子，4：触发回调(getListAsync)，5：获取到新数据，setState触发组件重新渲染。
// 4、rxjs是一种响应式的解决方案，专业的人干专业的事。

// 通过paramsObservable$.next(newParams)触发订阅函数
useEffect(() => {
  // paramsObservable$: params转换成的Observable
  paramsObservable$.subscribe(([newParams, oldParams]) => {
    // 比较新老值，决定是否要执行副作用
    if (newParams !== oldParams) {
      getListAsync(params)
    }
  })
}, [])
```

为什么会滥用 useEffect？ 因为在 React 中使用响应式真的很香，拥有像 Vue 一样响应式，同时拥有 React 的 Concurrent Mode（并发模式），鱼和熊掌可兼得？只是使用方式错了！

### 1.4 rxjs本身对异步的处理很强

### 1.5 综合上面 4 个原因，尝试 rxjs 来代替 redux 和 Context

## 2: 关于example：这是我们项目中的一个页面的代码，主要想展示一下observable-model的用法。页面很简单，就是一个Modal里面包含3个步骤（antd Steps组件），每一步都是不相关的，可以认为Modal是一个父组件，每个Step是个子组件。正常情况我们会通过props或者Context将参数从Modal传到子组件，这边用observable-model代替
