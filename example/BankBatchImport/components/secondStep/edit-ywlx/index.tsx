import React from 'react'

import styles from './index.less'

interface Props {
  active: boolean
  setEditIndex: React.Dispatch<number>
  index: number
  showText: string
  children?: React.ReactNode
}

export default function EditYwlx(props: Props) {
  const { active, setEditIndex, index, showText, children } = props

  return (
    <div
      className={styles.editKm}
      onClick={(e) => {
        e.stopPropagation()
      }}>
      <div
        className={styles.content}
        onClick={() => {
          setEditIndex(index)
        }}
        r-if={!active}>
        <div className={styles.text}>{showText || '未补充'}</div>
        {/* <div r-show={sffzhs} className={styles.fzhsIcon}>
          辅
        </div> */}
      </div>
      <div r-if={active} className={styles.content}>
        {children}
      </div>
    </div>
  )
}
