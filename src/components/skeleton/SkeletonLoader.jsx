// src/components/SkeletonLoader.js
import React from 'react';
import {View, StyleSheet} from 'react-native';

const SkeletonLoader = () => {
  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLineSmall} />
      </View>

      {/* Stats Cards Skeleton */}
      <View style={styles.statsGrid}>
        <View style={styles.statCardSkeleton} />
        <View style={styles.statCardSkeleton} />
        <View style={styles.statCardSkeleton} />
        <View style={styles.statCardSkeleton} />
        <View style={styles.statCardSkeleton} />
        <View style={styles.statCardSkeleton} />
      </View>

      {/* Chart Skeleton */}
      <View style={styles.chartSkeleton}>
        <View style={styles.skeletonLine} />
        <View style={styles.chartBars}>
          <View style={styles.chartBarSkeleton} />
          <View style={styles.chartBarSkeleton} />
          <View style={styles.chartBarSkeleton} />
          <View style={styles.chartBarSkeleton} />
          <View style={styles.chartBarSkeleton} />
        </View>
      </View>

      {/* Search Skeleton */}
      <View style={styles.searchSkeleton} />

      {/* Table Skeleton */}
      <View style={styles.tableSkeleton}>
        <View style={styles.tableHeaderSkeleton} />
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={styles.tableRowSkeleton}>
            <View style={styles.cellSkeleton} />
            <View style={styles.cellSkeleton} />
            <View style={styles.cellSkeleton} />
            <View style={styles.cellSkeleton} />
            <View style={styles.cellSkeleton} />
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
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  skeletonLine: {
    width: 120,
    height: 28,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  skeletonLineSmall: {
    width: 80,
    height: 40,
    backgroundColor: '#1e293b',
    borderRadius: 12,
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
  chartSkeleton: {
    backgroundColor: '#12141c',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  chartBarSkeleton: {
    width: 30,
    height: 120,
    backgroundColor: '#1e293b',
    borderRadius: 6,
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
    height: 44,
    backgroundColor: '#0f111a',
    marginBottom: 1,
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
    flex: 1,
    height: 16,
    backgroundColor: '#1e293b',
    borderRadius: 4,
  },
});

export default SkeletonLoader;
