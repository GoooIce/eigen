import { ActionType, ContextModule, OwnerType, tappedInfoBubble, TappedInfoBubbleArgs } from "@artsy/cohesion"
import { ArtistInsightsAuctionResults_artist } from "__generated__/ArtistInsightsAuctionResults_artist.graphql"
import { filterArtworksParams } from "lib/Components/ArtworkFilter/ArtworkFilterHelpers"
import { ArtworksFiltersStore } from "lib/Components/ArtworkFilter/ArtworkFilterStore"
import { ORDERED_AUCTION_RESULTS_SORTS } from "lib/Components/ArtworkFilter/Filters/SortOptions"
import { FilteredArtworkGridZeroState } from "lib/Components/ArtworkGrids/FilteredArtworkGridZeroState"
import { InfoButton } from "lib/Components/Buttons/InfoButton"
import Spinner from "lib/Components/Spinner"
import { useAnimatedValue } from "lib/Components/StickyTabPage/reanimatedHelpers"
import { StickyTabPageContext } from "lib/Components/StickyTabPage/SitckyTabPageContext"
import { StickyTabPageFlatListContext } from "lib/Components/StickyTabPage/StickyTabPageFlatList"
import { StickyTabPageScrollView } from "lib/Components/StickyTabPage/StickyTabPageScrollView"
import { PAGE_SIZE } from "lib/data/constants"
import { navigate } from "lib/navigation/navigate"
import { extractNodes } from "lib/utils/extractNodes"
import { useAutoCollapsingMeasuredView } from "lib/utils/useAutoCollapsingMeasuredView"
import { Box, bullet, color, Flex, Separator, Spacer, Text } from "palette"
import React, { useCallback, useContext, useEffect, useState } from "react"
import { FlatList, View } from "react-native"
import Animated from "react-native-reanimated"
import { createPaginationContainer, graphql, RelayPaginationProp } from "react-relay"
import { useTracking } from "react-tracking"
import styled from "styled-components/native"
import { useScreenDimensions } from "../../../utils/useScreenDimensions"
import { AuctionResultFragmentContainer } from "../../Lists/AuctionResultListItem"
import { MarketStatsQueryRenderer } from "./MarketStats"

interface Props {
  artist: ArtistInsightsAuctionResults_artist
  relay: RelayPaginationProp
  scrollToTop: () => void
}

const AnimatedFlatList: typeof FlatList = Animated.createAnimatedComponent(FlatList)

const ArtistInsightsAuctionResults: React.FC<Props> = ({ artist, relay, onScroll, scrollToTop }) => {
  const tracking = useTracking()

  const setAggregationsAction = ArtworksFiltersStore.useStoreActions((state) => state.setAggregationsAction)
  const setFilterTypeAction = ArtworksFiltersStore.useStoreActions((state) => state.setFilterTypeAction)
  const appliedFilters = ArtworksFiltersStore.useStoreState((state) => state.appliedFilters)
  const applyFilters = ArtworksFiltersStore.useStoreState((state) => state.applyFilters)
  const { width } = useScreenDimensions()

  const filterParams = filterArtworksParams(appliedFilters, "auctionResult")

  const { staticHeaderHeight, stickyHeaderHeight } = useContext(StickyTabPageContext)
  const scrollOffsetY = useAnimatedValue(0)
  const stickyHeaderOffsetY = useAnimatedValue(0)
  const filterHeaderComponent = <View style={{ width, height: 50, backgroundColor: "green" }} />
  const { jsx: staticFilterHeaderComponent, nativeHeight: staticFilterHeaderHeight } = useAutoCollapsingMeasuredView(
    filterHeaderComponent
  )

  const fullHeaderHeight = Animated.add(Animated.max(staticHeaderHeight, 0), Animated.max(stickyHeaderHeight, 0))
  const offsetY = Animated.sub(stickyHeaderOffsetY, scrollOffsetY)
  const translateY = Animated.max(Animated.add(offsetY, fullHeaderHeight), Animated.max(stickyHeaderHeight, 0))

  useEffect(() => {
    setFilterTypeAction("auctionResult")
  }, [])

  useEffect(() => {
    if (applyFilters) {
      relay.refetchConnection(
        PAGE_SIZE,
        (error) => {
          if (error) {
            throw new Error("ArtistInsights/ArtistAuctionResults filter error: " + error.message)
          }
        },
        filterParams
      )
      scrollToTop()
    }
  }, [appliedFilters])

  const auctionResults = extractNodes(artist.auctionResultsConnection)
  const [loadingMoreData, setLoadingMoreData] = useState(false)

  const loadMoreAuctionResults = () => {
    if (!relay.hasMore() || relay.isLoading()) {
      return
    }
    setLoadingMoreData(true)
    relay.loadMore(PAGE_SIZE, (error) => {
      if (error) {
        console.log(error.message)
      }
      setLoadingMoreData(false)
    })
  }

  // We are using the same logic used in Force but it might be useful
  // to adjust metaphysics to support aggregations like other filters in the app
  useEffect(() => {
    setAggregationsAction([
      {
        slice: "earliestCreatedYear",
        counts: [
          {
            value: artist.auctionResultsConnection?.createdYearRange?.startAt || artist.birthday,
            name: "earliestCreatedYear",
          },
        ],
      },
      {
        slice: "latestCreatedYear",
        counts: [
          {
            value: artist.auctionResultsConnection?.createdYearRange?.endAt || new Date().getFullYear(),
            name: "latestCreatedYear",
          },
        ],
      },
    ])
  }, [])

  return (
    <>
      <StickyTabPageScrollView>
        <MarketStatsQueryRenderer artistInternalID={artist.internalID} />
        <Animated.View
          onLayout={Animated.event(
            [
              {
                nativeEvent: {
                  layout: { y: stickyHeaderOffsetY },
                },
              },
            ],
            { useNativeDriver: true }
          )}
          style={{ width: "100%", height: staticFilterHeaderHeight, backgroundColor: "blue" }}
        />
        <AnimatedFlatList
          data={auctionResults}
          keyExtractor={(item) => item.id}
          scrollEventThrottle={0.0000000001}
          onScroll={(event) => scrollOffsetY.setValue(event.nativeEvent.contentOffset.y)}
          // onScroll={Animated.event(
          //   [
          //     {
          //       nativeEvent: {
          //         contentOffset: { y: scrollOffsetY },
          //       },
          //     },
          //   ],
          //   {
          //     useNativeDriver: true,
          //   }
          // )}
          renderItem={({ item }) => (
            <AuctionResultFragmentContainer
              auctionResult={item}
              onPress={() => {
                tracking.trackEvent(tracks.tapAuctionGroup(item.internalID, artist.internalID))
                navigate(`/artist/${artist?.slug!}/auction-result/${item.internalID}`)
              }}
            />
          )}
          ItemSeparatorComponent={() => (
            <Flex px={2}>
              <Separator borderColor={color("black5")} />
            </Flex>
          )}
          ListEmptyComponent={
            <Box my="80px">
              <FilteredArtworkGridZeroState id={artist.id} slug={artist.slug} />
            </Box>
          }
          style={{ width, left: -20 }}
          onEndReached={loadMoreAuctionResults}
          ListFooterComponent={loadingMoreData ? <Spinner style={{ marginTop: 20, marginBottom: 20 }} /> : null}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </StickyTabPageScrollView>
      <Animated.View style={{ position: "absolute", width, transform: [{ translateY }] }}>
        {staticFilterHeaderComponent}
      </Animated.View>
    </>
  )
}

export const SortMode = styled(Text)``

export const ArtistInsightsAuctionResultsPaginationContainer = createPaginationContainer(
  ArtistInsightsAuctionResults,
  {
    artist: graphql`
      fragment ArtistInsightsAuctionResults_artist on Artist
      @argumentDefinitions(
        allowEmptyCreatedDates: { type: "Boolean", defaultValue: true }
        categories: { type: "[String]" }
        count: { type: "Int", defaultValue: 10 }
        cursor: { type: "String" }
        earliestCreatedYear: { type: "Int", defaultValue: 1000 }
        latestCreatedYear: { type: "Int", defaultValue: 2050 }
        organizations: { type: "[String]" }
        sizes: { type: "[ArtworkSizes]" }
        sort: { type: "AuctionResultSorts", defaultValue: DATE_DESC }
      ) {
        birthday
        slug
        id
        internalID
        auctionResultsConnection(
          after: $cursor
          allowEmptyCreatedDates: $allowEmptyCreatedDates
          categories: $categories
          earliestCreatedYear: $earliestCreatedYear
          first: $count
          latestCreatedYear: $latestCreatedYear
          organizations: $organizations
          sizes: $sizes
          sort: $sort
        ) @connection(key: "artist_auctionResultsConnection") {
          createdYearRange {
            startAt
            endAt
          }
          totalCount
          edges {
            node {
              id
              internalID
              ...AuctionResultListItem_auctionResult
            }
          }
        }
      }
    `,
  },
  {
    getConnectionFromProps(props) {
      return props?.artist.auctionResultsConnection
    },
    getVariables(_props, { count, cursor }, fragmentVariables) {
      return {
        ...fragmentVariables,
        cursor,
        count,
      }
    },
    query: graphql`
      query ArtistInsightsAuctionResultsQuery(
        $allowEmptyCreatedDates: Boolean
        $artistID: String!
        $categories: [String]
        $count: Int!
        $cursor: String
        $earliestCreatedYear: Int
        $latestCreatedYear: Int
        $organizations: [String]
        $sizes: [ArtworkSizes]
        $sort: AuctionResultSorts
      ) {
        artist(id: $artistID) {
          ...ArtistInsightsAuctionResults_artist
            @arguments(
              allowEmptyCreatedDates: $allowEmptyCreatedDates
              categories: $categories
              count: $count
              cursor: $cursor
              earliestCreatedYear: $earliestCreatedYear
              latestCreatedYear: $latestCreatedYear
              organizations: $organizations
              sizes: $sizes
              sort: $sort
            )
        }
      }
    `,
  }
)

export const tracks = {
  tapAuctionGroup: (auctionId: string, artistId: string) => ({
    action: ActionType.tappedAuctionResultGroup,
    context_module: ContextModule.auctionResults,
    context_screen_owner_type: OwnerType.artist,
    context_screen_owner_id: artistId,
    destination_screen_owner_type: OwnerType.auctionResult,
    destination_screen_owner_id: auctionId,
    type: "thumbnail",
  }),

  tapAuctionResultsInfo: (): TappedInfoBubbleArgs => ({
    contextModule: ContextModule.auctionResults,
    contextScreenOwnerType: OwnerType.artistAuctionResults,
    subject: "auctionResults",
  }),
}
