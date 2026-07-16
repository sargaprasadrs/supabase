import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useChartHighlight } from './useChartHighlight'

const BAR = '1784211420000'
const NEXT_BAR = '1784211480000'
const LATER_BAR = '1784211540000'

describe('useChartHighlight', () => {
  it('expands a single click to cover the clicked bucket', () => {
    const { result } = renderHook(() => useChartHighlight())

    act(() => {
      result.current.handleMouseDown({
        activeLabel: BAR,
        coordinates: Number(BAR),
        nextLabel: NEXT_BAR,
        nextCoordinate: Number(NEXT_BAR),
      })
    })
    act(() => {
      result.current.handleMouseUp({ chartX: 10, chartY: 20 })
    })

    expect(result.current.left).toBe(BAR)
    expect(result.current.right).toBe(NEXT_BAR)
    expect(result.current.coordinates.left).not.toBe(result.current.coordinates.right)
  })

  it('keeps the dragged range without expanding it', () => {
    const { result } = renderHook(() => useChartHighlight())

    act(() => {
      result.current.handleMouseDown({
        activeLabel: BAR,
        coordinates: Number(BAR),
        nextLabel: NEXT_BAR,
        nextCoordinate: Number(NEXT_BAR),
      })
    })
    act(() => {
      result.current.handleMouseMove({ activeLabel: LATER_BAR, coordinates: Number(LATER_BAR) })
    })
    act(() => {
      result.current.handleMouseUp({ chartX: 10, chartY: 20 })
    })

    expect(result.current.left).toBe(BAR)
    expect(result.current.right).toBe(LATER_BAR)
  })
})
