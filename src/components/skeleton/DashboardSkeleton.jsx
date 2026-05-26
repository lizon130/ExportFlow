// src/components/DashboardSkeleton.js
import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated} from 'react-native';

const DashboardSkeleton = () => {
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    blinkAnimation.start();

    return () => blinkAnimation.stop();
  }, [animatedValue]);

  const opacityInterpolate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const SkeletonItem = ({style}) => (
    <Animated.View style={[style, {opacity: opacityInterpolate}]} />
  );

  return (
    <View style={styles.container}>
      {/* Title Skeleton */}
      <SkeletonItem style={styles.titleSkeleton} />
      <SkeletonItem style={styles.subtitleSkeleton} />

      {/* Stats Grid Skeleton - 6 cards */}
      <View style={styles.statsGrid}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <SkeletonItem key={i} style={styles.statCardSkeleton} />
        ))}
      </View>

      {/* Realization Card Skeleton */}
      <View style={styles.realizationCardSkeleton}>
        <View style={styles.realizationHeaderSkeleton}>
          <SkeletonItem style={styles.realizationIconSkeleton} />
          <SkeletonItem style={styles.realizationTitleSkeleton} />
          <SkeletonItem style={styles.realizationBadgeSkeleton} />
        </View>
        <View style={styles.realizationStatsSkeleton}>
          <SkeletonItem style={styles.realizationItemSkeleton} />
          <SkeletonItem style={styles.realizationItemSkeleton} />
          <SkeletonItem style={styles.realizationItemSkeleton} />
        </View>
        <SkeletonItem style={styles.progressBarSkeleton} />
        <View style={styles.realizationFooterSkeleton}>
          <SkeletonItem style={styles.footerTextSkeleton} />
          <SkeletonItem style={styles.footerTextSkeleton} />
        </View>
      </View>

      {/* Chart Skeleton */}
      <View style={styles.chartSkeleton}>
        <SkeletonItem style={styles.chartTitleSkeleton} />
        <View style={styles.chartBarsSkeleton}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={styles.chartBarWrapper}>
              <SkeletonItem
                style={[styles.chartBarSkeleton, {height: 60 + i * 15}]}
              />
              <SkeletonItem style={styles.chartLabelSkeleton} />
            </View>
          ))}
        </View>
      </View>

      {/* Search Skeleton */}
      <SkeletonItem style={styles.searchSkeleton} />

      {/* Table Skeleton */}
      <View style={styles.tableSkeleton}>
        <View style={styles.tableHeaderSkeleton}>
          <View style={styles.tableHeaderRow}>
            <SkeletonItem style={[styles.cellSkeleton, {width: 80}]} />
            <SkeletonItem style={[styles.cellSkeleton, {width: 90}]} />
            <SkeletonItem style={[styles.cellSkeleton, {width: 90}]} />
            <SkeletonItem style={[styles.cellSkeleton, {width: 60}]} />
            <SkeletonItem style={[styles.cellSkeleton, {width: 80}]} />
            <SkeletonItem style={[styles.cellSkeleton, {width: 90}]} />
          </View>
        </View>
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={styles.tableRowSkeleton}>
            <SkeletonItem style={[styles.cellSkeleton, {width: 80}]} />
            <SkeletonItem style={[styles.cellSkeleton, {width: 90}]} />
            <SkeletonItem style={[styles.cellSkeleton, {width: 90}]} />
            <SkeletonItem style={[styles.cellSkeleton, {width: 60}]} />
            <SkeletonItem style={[styles.cellSkeleton, {width: 80}]} />
            <SkeletonItem style={[styles.cellSkeleton, {width: 90}]} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c12',
    padding: 16,
  },
  titleSkeleton: {
    width: 150,
    height: 28,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 8,
  },
  subtitleSkeleton: {
    width: 200,
    height: 14,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCardSkeleton: {
    flex: 1,
    minWidth: '47%',
    height: 100,
    backgroundColor: '#1e293b',
    borderRadius: 16,
  },
  realizationCardSkeleton: {
    backgroundColor: '#1e1b4b',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  realizationHeaderSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  realizationIconSkeleton: {
    width: 40,
    height: 40,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  realizationTitleSkeleton: {
    flex: 1,
    height: 20,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  realizationBadgeSkeleton: {
    width: 60,
    height: 20,
    backgroundColor: '#1e293b',
    borderRadius: 20,
  },
  realizationStatsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  realizationItemSkeleton: {
    flex: 1,
    height: 50,
    backgroundColor: '#1e293b',
    borderRadius: 16,
  },
  progressBarSkeleton: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    marginBottom: 12,
  },
  realizationFooterSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  footerTextSkeleton: {
    width: 100,
    height: 12,
    backgroundColor: '#1e293b',
    borderRadius: 4,
  },
  chartSkeleton: {
    backgroundColor: '#12141c',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  chartTitleSkeleton: {
    width: 180,
    height: 16,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 20,
  },
  chartBarsSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  chartBarWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  chartBarSkeleton: {
    width: 30,
    backgroundColor: '#1e293b',
    borderRadius: 6,
  },
  chartLabelSkeleton: {
    width: 30,
    height: 12,
    backgroundColor: '#1e293b',
    borderRadius: 4,
  },
  searchSkeleton: {
    height: 44,
    backgroundColor: '#1e293b',
    borderRadius: 25,
    marginBottom: 16,
  },
  tableSkeleton: {
    backgroundColor: '#12141c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  tableHeaderSkeleton: {
    backgroundColor: '#0f111a',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tableRowSkeleton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  cellSkeleton: {
    height: 16,
    backgroundColor: '#1e293b',
    borderRadius: 4,
  },
});

export default DashboardSkeleton;
