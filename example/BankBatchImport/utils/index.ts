import { unionBy } from 'lodash-es'
/**
 *
 * 策略：根据条件查找一级业务类型的某个选项
 * @param data 数据源
 * @param condition 筛选条件
 */
export const findeFirstYwlxItemByCondition = (
  data: any[],
  condition: (iitem: { [name: string]: any }) => boolean
): { [name: string]: any } => {
  let selectItem = null
  for (let i = 0; i < data.length; i++) {
    if (data[i].kjsxList && data[i].kjsxList.length && !selectItem) {
      selectItem = data[i].kjsxList.filter((iitem) => condition(iitem))[0]
    }
  }
  return selectItem
}

/**
 * 匹配方法
 * @param s1 查字符
 * @param s2 整字符
 */
export const matchFunc = (s1: string, s2: string) => {
  // 兼容null
  ;(s1 = s1 || ''), (s2 = s2 || '')

  let str = ''
  let L1 = s1.length
  let L2 = s2.length
  if (L1 > L2) {
    let s3 = s1
    s1 = s2
    s2 = s3
    s3 = null
    L1 = s1.length
    L2 = s2.length
  }
  for (let i = L1; i > 0; i--) {
    for (let j = 0; j <= L2 - i && j < L1; j++) {
      str = s1.substr(j, i)
      if (s2.indexOf(str) >= 0) {
        return Math.floor(accDiv(str.length, s2.length) * 100)
      }
    }
  }
  return 0
}

// 除法函数
export const accDiv = function (arg1, arg2) {
  var t1 = 0,
    t2 = 0,
    r1,
    r2
  if (!Number(arg2) || !Number(arg1)) {
    return 0
  }
  try {
    t1 = arg1.toString().split('.')[1].length
  } catch (e) {}
  try {
    t2 = arg2.toString().split('.')[1].length
  } catch (e) {}

  r1 = Number(arg1.toString().replace('.', ''))
  r2 = Number(arg2.toString().replace('.', ''))
  return (r1 / r2) * Math.pow(10, t2 - t1)
}

export function fomateAmount(amountStart, amountEnd) {
  // 如果2个金额都存在，并且开始金额 > 结束金额，调换
  if (
    amountStart !== null &&
    amountStart !== undefined &&
    amountEnd !== null &&
    amountEnd !== undefined &&
    amountStart > amountEnd
  ) {
    const temp = amountStart
    amountStart = amountEnd
    amountEnd = temp
  }
  if (amountStart === null || amountStart === undefined) {
    amountStart = -Infinity
  }
  if (amountEnd === null || amountEnd === undefined) {
    amountEnd = Infinity
  }
  return [amountStart, amountEnd]
}

export function isEmptyObj(obj) {
  return Object.keys(obj).length === 0
}

export const getFzlxCodes = (dataSource) => {
  let fzhsList = []

  dataSource.map((item) => {
    fzhsList = fzhsList.concat(item.data)
  })
  const fzlxCodes = []
  const key = 'fzhsType'
  unionBy(fzhsList, key).map((item) => {
    fzlxCodes.push(item[key])
  })
  return fzlxCodes
}

export const unionArr = (selectedRows) => {
  let arr = []
  selectedRows.map((item) => {
    arr = arr.concat(item.data)
  })
  arr = unionBy(arr, 'fzhsType')
  return arr
}
