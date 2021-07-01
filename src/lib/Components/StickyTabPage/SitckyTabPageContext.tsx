import { GlobalState } from "lib/utils/useGlobalState"
import React from "react"
import Animated from "react-native-reanimated"

export const StickyTabPageContext = React.createContext<{
  staticHeaderHeight: Animated.Node<number>
  stickyHeaderHeight: Animated.Node<number>
  headerOffsetY: Animated.Value<number>
  tabLabels: string[]
  activeTabIndex: GlobalState<number>
  setActiveTabIndex(index: number): void
}>(
  __TEST__
    ? {
        staticHeaderHeight: new Animated.Value(0),
        stickyHeaderHeight: new Animated.Value(0),
        headerOffsetY: new Animated.Value(0),
        tabLabels: ["test"],
        // tslint:disable-next-line:no-empty
        activeTabIndex: { current: 0, set() {}, useUpdates() {} },
        // tslint:disable-next-line:no-empty
        setActiveTabIndex() {},
      }
    : (null as any)
)

export function useStickyTabPageContext() {
  return React.useContext(StickyTabPageContext)
}
