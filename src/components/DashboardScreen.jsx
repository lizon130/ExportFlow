// src/screens/DashboardScreen.js
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import DashboardSkeleton from '../components/skeleton/DashboardSkeleton';

const DashboardScreen = ({onNavigate, userData}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // API Data states
  const [exportStats, setExportStats] = useState({
    // Export Docs
    totalPackagingCount: 0,
    totalExportCount: 0,
    exportPendingCount: 0,
    exportCompletedCount: 0,
    completedExportCount: 0,
    shipmentValue: 0,
    // B/L Date
    totalBLDateCount: 0,
    totalPendingBLDate: 0,
    completedBLDateCount: 0,
    // Shipping
    totalShippingDateCount: 0,
    pendingShippingDateCount: 0,
    completedExportShippingDateCount: 0,
    // Bank Submit
    totalBankSubmissionDateCount: 0,
    completedBankSubmissionDateCount: 0,
    pendingBankSubmissionDateCount: 0,
  });

  const [realizationStats, setRealizationStats] = useState({
    expectedValue: 0,
    realizedValue: 0,
    pendingValue: 0,
    upcomingValue: 0,
    overdueValue: 0,
    realizedPercent: 0,
  });

  const API_BASE_URL = 'http://192.168.9.45:7000';
  const isMounted = useRef(true);

  // Create axios instance with useRef to prevent recreation
  const apiClientRef = useRef(
    axios.create({
      baseURL: API_BASE_URL,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }),
  );

  const normalizeArray = data => {
    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === 'object') {
      return [data];
    }

    return [];
  };

  const getNumber = value => {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const sumTotalValue = data => {
    return normalizeArray(data).reduce(
      (sum, item) =>
        sum +
        (getNumber(item?.totalValue) ||
          getNumber(item?.totalExportValue) ||
          getNumber(item?.totalNetValue) ||
          0),
      0,
    );
  };

  // Add interceptors only once
  useEffect(() => {
    const apiClient = apiClientRef.current;

    const requestInterceptor = apiClient.interceptors.request.use(
      config => {
        console.log(
          `API Request: ${config.method?.toUpperCase()} ${config.url}`,
        );
        return config;
      },
      error => {
        console.error('Request error:', error);
        return Promise.reject(error);
      },
    );

    const responseInterceptor = apiClient.interceptors.response.use(
      response => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        if (error.response) {
          console.error(
            `API Error Response: ${error.response.status} - ${JSON.stringify(
              error.response.data,
            )}`,
          );
        } else if (error.request) {
          console.error('API No Response:', error.message);
        } else {
          console.error('API Request Error:', error.message);
        }

        return Promise.reject(error);
      },
    );

    // Cleanup interceptors
    return () => {
      isMounted.current = false;
      apiClient.interceptors.request.eject(requestInterceptor);
      apiClient.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Fetch Export Docs Stats
  const fetchExportDocsStats = useCallback(async () => {
    try {
      const headers = {};
      if (userData?.accessToken) {
        headers.Authorization = `Bearer ${userData.accessToken}`;
      }

      // Get packing list count
      const packingResponse = await apiClientRef.current.get(
        '/api/Export/Get-Packing-No-Total-count',
        {headers},
      );
      const packingData = packingResponse.data;

      // Get completed export count
      const completedResponse = await apiClientRef.current.get(
        '/api/Export/Get-Completed-Export-Document-Count',
        {headers},
      );
      const completedData = completedResponse.data;

      // Get pending export count from department-wise API and sum all rows
      const pendingResponse = await apiClientRef.current.get(
        '/api/Export/Get-Pending-Export-Document-Count',
        {headers},
      );
      const pendingData = pendingResponse.data;

      const packingCount =
        Array.isArray(packingData) && packingData.length > 0
          ? packingData[0].totalPackagingCount || 0
          : 0;

      const completedCount =
        Array.isArray(completedData) && completedData.length > 0
          ? completedData[0].completedExportCount || 0
          : 0;

      const shipmentValue = sumTotalValue(completedData);

      const pendingCount = Array.isArray(pendingData)
        ? pendingData.reduce(
            (sum, item) => sum + (item?.pendingExportCount || 0),
            0,
          )
        : 0;

      if (isMounted.current) {
        setExportStats(prev => ({
          ...prev,
          totalPackagingCount: packingCount,
          exportCompletedCount: completedCount,
          exportPendingCount: pendingCount,
          totalExportCount: completedCount + pendingCount,
          completedExportCount: completedCount,
          shipmentValue,
        }));
      }

      console.log('Export Docs Stats:', {
        packingCount,
        completedCount,
        pendingCount,
        shipmentValue,
        total: completedCount + pendingCount,
      });
    } catch (error) {
      console.error('Error fetching export docs stats:', error);
    }
  }, [userData?.accessToken]);

  // Fetch B/L Date Stats
  const fetchBLDateStats = useCallback(async () => {
    try {
      const headers = {};
      if (userData?.accessToken) {
        headers.Authorization = `Bearer ${userData.accessToken}`;
      }

      // Get completed BL date count
      const completedResponse = await apiClientRef.current.get(
        '/api/Export/Get-Completed-BL-Date-Count',
        {headers},
      );
      const completedData = completedResponse.data;

      // Get pending BL date count from department-wise API and sum all rows
      const pendingResponse = await apiClientRef.current.get(
        '/api/Export/Get-Pending-BL-Date-Count',
        {headers},
      );
      const pendingData = pendingResponse.data;

      const completedCount =
        Array.isArray(completedData) && completedData.length > 0
          ? completedData[0].completedBLDateCount || 0
          : 0;

      const pendingCount = Array.isArray(pendingData)
        ? pendingData.reduce(
            (sum, item) => sum + (item?.pendingBLDateCount || 0),
            0,
          )
        : 0;

      if (isMounted.current) {
        setExportStats(prev => ({
          ...prev,
          completedBLDateCount: completedCount,
          totalPendingBLDate: pendingCount,
          totalBLDateCount: completedCount + pendingCount,
        }));
      }

      console.log('B/L Date Stats:', {
        completedCount,
        pendingCount,
        total: completedCount + pendingCount,
      });
    } catch (error) {
      console.error('Error fetching B/L date stats:', error);
    }
  }, [userData?.accessToken]);

  // Fetch Shipping Stats
  const fetchShippingStats = useCallback(async () => {
    try {
      const headers = {};
      if (userData?.accessToken) {
        headers.Authorization = `Bearer ${userData.accessToken}`;
      }

      // Get completed shipping date count
      const completedResponse = await apiClientRef.current.get(
        '/api/Export/Get-Completed-Export-Shipping-Date-Count',
        {headers},
      );
      const completedData = completedResponse.data;

      // Get pending shipping date count from department-wise API and sum all rows
      const pendingResponse = await apiClientRef.current.get(
        '/api/Export/Get-Pending-Shipping-Date-Count',
        {headers},
      );
      const pendingData = pendingResponse.data;

      const completedCount =
        Array.isArray(completedData) && completedData.length > 0
          ? completedData[0].completedExportShippingDateCount || 0
          : 0;

      const pendingCount = Array.isArray(pendingData)
        ? pendingData.reduce(
            (sum, item) => sum + (item?.pendingShippingDateCount || 0),
            0,
          )
        : 0;

      if (isMounted.current) {
        setExportStats(prev => ({
          ...prev,
          completedExportShippingDateCount: completedCount,
          pendingShippingDateCount: pendingCount,
          totalShippingDateCount: completedCount + pendingCount,
        }));
      }

      console.log('Shipping Stats:', {
        completedCount,
        pendingCount,
        total: completedCount + pendingCount,
      });
    } catch (error) {
      console.error('Error fetching shipping stats:', error);
    }
  }, [userData?.accessToken]);

  // Fetch Bank Submit Stats
  const fetchBankSubmitStats = useCallback(async () => {
    try {
      const headers = {};
      if (userData?.accessToken) {
        headers.Authorization = `Bearer ${userData.accessToken}`;
      }

      // Get completed bank submission date count
      const completedResponse = await apiClientRef.current.get(
        '/api/Export/Get-Completed-Bank-Submission-Date-Count',
        {headers},
      );
      const completedData = completedResponse.data;

      // Get pending bank submission date count from department-wise API and sum all rows
      const pendingResponse = await apiClientRef.current.get(
        '/api/Export/Get-Pending-Bank-Submission-Date-Count',
        {headers},
      );
      const pendingData = pendingResponse.data;

      const completedCount =
        Array.isArray(completedData) && completedData.length > 0
          ? completedData[0].completedBankSubmissionDateCount || 0
          : 0;

      const pendingCount = Array.isArray(pendingData)
        ? pendingData.reduce(
            (sum, item) => sum + (item?.pendingBankSubmissionDateCount || 0),
            0,
          )
        : 0;

      if (isMounted.current) {
        setExportStats(prev => ({
          ...prev,
          completedBankSubmissionDateCount: completedCount,
          pendingBankSubmissionDateCount: pendingCount,
          totalBankSubmissionDateCount: completedCount + pendingCount,
        }));
      }

      console.log('Bank Submit Stats:', {
        completedCount,
        pendingCount,
        total: completedCount + pendingCount,
      });
    } catch (error) {
      console.error('Error fetching bank submit stats:', error);
    }
  }, [userData?.accessToken]);

  // Fetch Realization Stats
  const fetchRealizationStats = useCallback(async () => {
    try {
      const headers = {};
      if (userData?.accessToken) {
        headers.Authorization = `Bearer ${userData.accessToken}`;
      }

      const [
        expectedResponse,
        realizedResponse,
        upcomingResponse,
        overdueResponse,
      ] = await Promise.all([
        apiClientRef.current.get(
          '/api/Export/Get-Pending-Realization-Expected-Date-Count',
          {headers},
        ),
        apiClientRef.current.get(
          '/api/Export/Get-Completed-Realization-Date-Count',
          {headers},
        ),
        apiClientRef.current.get(
          '/api/Export/Get-Pending-Realization-Upcomming-Date-Count',
          {headers},
        ),
        apiClientRef.current.get(
          '/api/Export/Get-Pending-Realization-OverDue-Date-Count',
          {headers},
        ),
      ]);

      const expectedValue = sumTotalValue(expectedResponse.data);
      const realizedValue = sumTotalValue(realizedResponse.data);
      const upcomingValue = sumTotalValue(upcomingResponse.data);
      const overdueValue = sumTotalValue(overdueResponse.data);
      const pendingValue = upcomingValue + overdueValue;

      const realizedPercent = expectedValue
        ? Math.min(100, Math.round((realizedValue / expectedValue) * 100))
        : 0;

      if (isMounted.current) {
        setRealizationStats({
          expectedValue,
          realizedValue,
          pendingValue,
          upcomingValue,
          overdueValue,
          realizedPercent,
        });
      }

      console.log('Realization Stats:', {
        expectedValue,
        realizedValue,
        upcomingValue,
        overdueValue,
        pendingValue,
        realizedPercent,
      });
    } catch (error) {
      console.error('Error fetching realization stats:', error);
    }
  }, [userData?.accessToken]);

  // Fetch all dashboard data - wrapped in useCallback with stable dependencies
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all APIs in parallel for better performance
      await Promise.all([
        fetchExportDocsStats(),
        fetchBLDateStats(),
        fetchShippingStats(),
        fetchBankSubmitStats(),
        fetchRealizationStats(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [
    fetchExportDocsStats,
    fetchBLDateStats,
    fetchShippingStats,
    fetchBankSubmitStats,
    fetchRealizationStats,
  ]);

  // Initial load - with proper dependency array
  useEffect(() => {
    fetchDashboardData();

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, []); // Empty dependency array - only run once on mount

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData().then(() => {
      if (isMounted.current) {
        setRefreshing(false);
      }
    });
  };

  const handleCardPress = screenName => {
    if (onNavigate) {
      onNavigate(screenName);
    }
  };

  // Cards data based on API response
  const cardsData = [
    {
      id: 1,
      title: 'Export Docs',
      icon: '📄',
      value: exportStats.completedExportCount.toString(),
      badge: `Pending: ${exportStats.exportPendingCount}`,
      trend: `Packing List: ${exportStats.totalPackagingCount}`,
      shipmentValue: exportStats.shipmentValue,
      color: '#3b82f6',
      screen: 'exportDoc',
    },
    {
      id: 2,
      title: 'B/L Date Check',
      icon: '📋',
      value: exportStats.completedBLDateCount.toString(),
      badge: `Pending: ${exportStats.totalPendingBLDate}`,
      trend: `Total: ${exportStats.totalBLDateCount}`,
      color: '#8b5cf6',
      screen: 'blDates',
    },
    {
      id: 3,
      title: 'Shipping',
      icon: '🚚',
      value: exportStats.completedExportShippingDateCount.toString(),
      badge: `Pending: ${exportStats.pendingShippingDateCount}`,
      trend: `Total: ${exportStats.totalShippingDateCount}`,
      color: '#06b6d4',
      screen: 'shipping',
    },
    {
      id: 4,
      title: 'Bank Submit',
      icon: '🏦',
      value: exportStats.completedBankSubmissionDateCount.toString(),
      badge: `Pending: ${exportStats.pendingBankSubmissionDateCount}`,
      trend: `Total: ${exportStats.totalBankSubmissionDateCount}`,
      color: '#ec4899',
      screen: 'bankSubmit',
    },
  ];

  const formatCurrency = value => {
    const numberValue = Number(value || 0);

    if (!Number.isFinite(numberValue)) {
      return '$0';
    }

    const absValue = Math.abs(numberValue);

    if (absValue >= 1000000000) {
      return `$${(numberValue / 1000000000).toFixed(1)}B`;
    }

    if (absValue >= 1000000) {
      return `$${(numberValue / 1000000).toFixed(1)}M`;
    }

    if (absValue >= 1000) {
      return `$${(numberValue / 1000).toFixed(1)}K`;
    }

    return `$${numberValue.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })}`;
  };

  const realizationTracking = {
    title: 'Realization Tracking',
    shipment: formatCurrency(exportStats.shipmentValue),
    expected: formatCurrency(realizationStats.expectedValue),
    realized: formatCurrency(realizationStats.realizedValue),
    pending: formatCurrency(realizationStats.pendingValue),
    percentage: realizationStats.realizedPercent,
    trend: `${realizationStats.realizedPercent}% realized`,
    upcoming: formatCurrency(realizationStats.upcomingValue),
    overdue: formatCurrency(realizationStats.overdueValue),
  };

  // Show skeleton while loading
  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Stats Grid - 4 cards in one row */}
      <View style={styles.statsGrid}>
        {cardsData.map(card => (
          <TouchableOpacity
            key={card.id}
            style={[styles.statCard, {backgroundColor: card.color}]}
            onPress={() => handleCardPress(card.screen)}
            activeOpacity={0.8}>
            <View style={styles.statHeader}>
              <View style={styles.statIcon}>
                <Text style={styles.statIconText}>{card.icon}</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statBadgeText}>{card.badge}</Text>
              </View>
            </View>
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.title}</Text>
            {card.id === 1 ? (
              <Text style={styles.statShipmentValue}>
                Export Value: {formatCurrency(card.shipmentValue)}
              </Text>
            ) : null}
            <View style={styles.statFooter}>
              <Text style={styles.statFooterText}>{card.trend}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Full Width Realization Tracking Card */}
      {/* Full Width Realization Tracking Card */}
      <TouchableOpacity
        style={styles.fullWidthCard}
        activeOpacity={0.85}
        onPress={() => handleCardPress('realization')}>
        <View style={styles.fullWidthHeader}>
          <View style={styles.fullWidthIcon}>
            <Text style={styles.fullWidthIconText}>💰</Text>
          </View>

          <Text style={styles.fullWidthTitle}>{realizationTracking.title}</Text>

          <View style={styles.fullWidthBadge}>
            <Text style={styles.fullWidthBadgeText}>
              {realizationTracking.trend}
            </Text>
          </View>
        </View>

        <View style={styles.realizationStats}>
          <View style={styles.realizationItem}>
            <Text style={styles.realizationLabel}>Export</Text>
            <Text style={styles.realizationValue}>
              {realizationTracking.shipment}
            </Text>
          </View>

          <View style={styles.realizationDivider} />

          <View style={styles.realizationItem}>
            <Text style={styles.realizationLabel}>Expected</Text>
            <Text style={styles.realizationValue}>
              {realizationTracking.expected}
            </Text>
          </View>

          <View style={styles.realizationDivider} />

          <View style={styles.realizationItem}>
            <Text style={styles.realizationLabel}>Realized</Text>
            <Text style={styles.realizationValue}>
              {realizationTracking.realized}
            </Text>
          </View>

          <View style={styles.realizationDivider} />

          <View style={styles.realizationItem}>
            <Text style={styles.realizationLabel}>Pending</Text>
            <Text style={styles.realizationValue}>
              {realizationTracking.pending}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {width: `${realizationTracking.percentage}%`},
              ]}
            />
          </View>

          <Text style={styles.progressText}>
            {realizationTracking.percentage}% Realized
          </Text>
        </View>

        <View style={styles.fullWidthFooter}>
          <Text style={styles.fullWidthFooterText}>
            Upcoming: {realizationTracking.upcoming}
          </Text>

          <Text style={styles.fullWidthFooterText}>
            Overdue: {realizationTracking.overdue}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Chart Placeholder */}
      <View style={styles.chartContainer}>
        <Text style={styles.cardTitle}>Monthly Export Value (USD k)</Text>
        <View style={styles.chartBars}>
          {['Jan', 'Feb', 'Mar', 'Apr', 'May'].map((month, idx) => (
            <View key={idx} style={styles.chartBarItem}>
              <View style={[styles.chartBar, {height: 60 + idx * 20}]} />
              <Text style={styles.chartLabel}>{month}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    padding: 14,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIcon: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconText: {
    fontSize: 16,
  },
  statBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  statBadgeText: {
    fontSize: 10,
    color: 'white',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  statShipmentValue: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginTop: 4,
  },
  statFooter: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statFooterText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
  },
  fullWidthCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fullWidthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fullWidthIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fullWidthIconText: {
    fontSize: 20,
  },
  fullWidthTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  fullWidthBadge: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  fullWidthBadgeText: {
    fontSize: 10,
    color: '#a78bfa',
  },
  realizationStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#0f111a',
    borderRadius: 16,
    padding: 12,
  },
  realizationItem: {
    flex: 1,
    alignItems: 'center',
  },
  realizationLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 4,
  },
  realizationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  realizationDivider: {
    width: 1,
    backgroundColor: '#1e293b',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#a78bfa',
    textAlign: 'center',
  },
  fullWidthFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  fullWidthFooterText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  chartContainer: {
    backgroundColor: '#12141c',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardTitle: {
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 12,
    fontSize: 13,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  chartBarItem: {
    alignItems: 'center',
    gap: 8,
  },
  chartBar: {
    width: 30,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    minHeight: 30,
  },
  chartLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
});

export default DashboardScreen;