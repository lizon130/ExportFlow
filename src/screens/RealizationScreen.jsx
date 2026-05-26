import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';

const RealizationScreen = () => {
  const realizationData = {
    total: '$3.8M',
    realized: '$2.1M',
    pending: '$1.7M',
    percentage: 55,
    trend: '+12%',
    target: '$4.5M',
    remaining: '$0.7M',
  };

  const monthlyData = [
    {month: 'Jan', realized: 0.3, target: 0.5},
    {month: 'Feb', realized: 0.45, target: 0.5},
    {month: 'Mar', realized: 0.5, target: 0.6},
    {month: 'Apr', realized: 0.55, target: 0.6},
    {month: 'May', realized: 0.3, target: 0.5},
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Realization</Text>
      <Text style={styles.pageSubtitle}>Track your financial realization</Text>

      {/* Main Realization Card */}
      <View style={styles.realizationCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>💰</Text>
          <Text style={styles.cardTitle}>Realization Tracking</Text>
          <View style={styles.trendBadge}>
            <Text style={styles.trendText}>{realizationData.trend}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Realized</Text>
            <Text style={styles.statValue}>{realizationData.realized}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>{realizationData.pending}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{realizationData.total}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Realization Progress</Text>
            <Text style={styles.progressPercentage}>
              {realizationData.percentage}%
            </Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {width: `${realizationData.percentage}%`},
              ]}
            />
          </View>
        </View>

        <View style={styles.targetInfo}>
          <View style={styles.targetItem}>
            <Text style={styles.targetLabel}>Target (Q2)</Text>
            <Text style={styles.targetValue}>{realizationData.target}</Text>
          </View>
          <View style={styles.targetItem}>
            <Text style={styles.targetLabel}>Remaining</Text>
            <Text style={styles.targetValue}>{realizationData.remaining}</Text>
          </View>
        </View>
      </View>

      {/* Monthly Breakdown */}
      <View style={styles.monthlyCard}>
        <Text style={styles.monthlyTitle}>Monthly Breakdown</Text>
        {monthlyData.map((item, index) => (
          <View key={index} style={styles.monthlyItem}>
            <Text style={styles.monthName}>{item.month}</Text>
            <View style={styles.monthlyBars}>
              <View style={styles.realizedBarContainer}>
                <View
                  style={[
                    styles.realizedBar,
                    {width: `${(item.realized / 0.6) * 100}%`},
                  ]}
                />
                <Text style={styles.barLabel}>${item.realized}M</Text>
              </View>
              <View style={styles.targetBarContainer}>
                <View
                  style={[
                    styles.targetBar,
                    {width: `${(item.target / 0.6) * 100}%`},
                  ]}
                />
                <Text style={styles.barLabel}>${item.target}M</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, {backgroundColor: '#10b981'}]} />
          <Text style={styles.legendText}>Realized</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, {backgroundColor: '#f59e0b'}]} />
          <Text style={styles.legendText}>Target</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0f111a',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 20,
  },
  realizationCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  trendBadge: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trendText: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0f111a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  divider: {
    width: 1,
    backgroundColor: '#1e293b',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  progressPercentage: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 4,
  },
  targetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  targetItem: {
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  monthlyCard: {
    backgroundColor: '#12141c',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  monthlyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  monthlyItem: {
    marginBottom: 16,
  },
  monthName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: 6,
  },
  monthlyBars: {
    gap: 6,
  },
  realizedBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  realizedBar: {
    height: 24,
    backgroundColor: '#10b981',
    borderRadius: 6,
    minWidth: 30,
  },
  targetBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetBar: {
    height: 24,
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    minWidth: 30,
  },
  barLabel: {
    fontSize: 10,
    color: '#f1f5f9',
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: '#94a3b8',
  },
});

export default RealizationScreen;
