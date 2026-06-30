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

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    if (Array.isArray(data?.result)) {
      return data.result;
    }

    if (Array.isArray(data?.items)) {
      return data.items;
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

  const sumCountField = (data, fieldName) => {
    return normalizeArray(data).reduce(
      (sum, item) => sum + getNumber(item?.[fieldName]),
      0,
    );
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

  const normalizeKey = value => String(value ?? '').trim().toLowerCase();

  const getActiveUserData = profileData => profileData || userData || {};

  const getLoggedInUserId = () => {
    return (
      userData?.recId ||
      userData?.userId ||
      userData?.id ||
      userData?.profile?.recId ||
      userData?.profile?.userId ||
      userData?.user?.recId ||
      userData?.user?.userId ||
      null
    );
  };

  const getAssignedDepartments = activeUserData => {
    const currentUser = getActiveUserData(activeUserData);

    return normalizeArray(
      currentUser?.departments ||
        currentUser?.department ||
        currentUser?.profile?.departments ||
        currentUser?.user?.departments ||
        currentUser?.assignedDepartments ||
        [],
    );
  };

  const addUniqueText = (list, value) => {
    const textValue = String(value ?? '').trim();
    const key = normalizeKey(textValue);

    if (
      textValue &&
      key &&
      key !== '0' &&
      key !== 'null' &&
      key !== 'undefined' &&
      !list.some(item => normalizeKey(item) === key)
    ) {
      list.push(textValue);
    }
  };

  const getDepartmentApiNames = activeUserData => {
    const assignedDepartments = getAssignedDepartments(activeUserData);
    const departmentNames = [];

    assignedDepartments.forEach(department => {
      // API supports depName. Use departmentCode first because
      // direct working example is: ?depName=lpp.
      // Fallback to departmentName when code is missing.
      const primaryDepartmentName =
        department?.departmentCode ||
        department?.deptCode ||
        department?.depCode ||
        department?.departmentName ||
        department?.deptName ||
        department?.depName ||
        department?.name ||
        department?.custDept;

      addUniqueText(departmentNames, primaryDepartmentName);
    });

    return departmentNames;
  };

  const buildEndpointWithDepName = (endpoint, depName) => {
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${separator}depName=${encodeURIComponent(depName)}`;
  };

  const fetchEndpointRowsByDepartment = async (
    endpoint,
    headers,
    userProfileData,
  ) => {
    const departmentApiNames = getDepartmentApiNames(userProfileData);

    // When user has assigned departments, always call the API with depName.
    // This is required because endpoints like
    // Get-Completed-Export-Document-Count?depName=lpp return the correct LPP value,
    // while the same endpoint without depName may return 0 or non-department rows.
    if (departmentApiNames.length) {
      console.log('Dashboard depName filter:', endpoint, departmentApiNames);

      const departmentResponses = await Promise.all(
        departmentApiNames.map(async depName => {
          try {
            const response = await apiClientRef.current.get(
              buildEndpointWithDepName(endpoint, depName),
              {headers},
            );

            return normalizeArray(response.data);
          } catch (error) {
            console.error(
              `Dashboard depName API failed for ${endpoint} depName=${depName}`,
              error,
            );
            return [];
          }
        }),
      );

      return departmentResponses.flat();
    }

    // No assigned department found. Keep old behavior so Super Admin / system users
    // without department assignment can still see the default API response.
    const response = await apiClientRef.current.get(endpoint, {headers});
    return normalizeArray(response.data);
  };

  const sumCountFields = (data, fieldNames) => {
    const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames];

    return normalizeArray(data).reduce((sum, item) => {
      const rowValue = fields.reduce((value, fieldName) => {
        return value || getNumber(item?.[fieldName]);
      }, 0);

      return sum + rowValue;
    }, 0);
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

  const fetchDepartmentMasterData = useCallback(async () => {
    try {
      const headers = {};
      if (userData?.accessToken) {
        headers.Authorization = `Bearer ${userData.accessToken}`;
      }

      const response = await apiClientRef.current.get(
        '/api/Department/get-all-department',
        {headers},
      );

      return normalizeArray(response.data);
    } catch (error) {
      console.error('Error fetching department master data:', error);
      return [];
    }
  }, [userData?.accessToken]);

  const fetchUserProfileData = useCallback(async () => {
    const profileFromLogin =
      userData?.profile ||
      (normalizeArray(userData?.departments).length ? userData : null);

    if (profileFromLogin) {
      return profileFromLogin;
    }

    const loggedInUserId = getLoggedInUserId();

    if (!loggedInUserId) {
      console.warn('Dashboard department access: logged-in user id not found');
      return userData || {};
    }

    try {
      const headers = {};
      if (userData?.accessToken) {
        headers.Authorization = `Bearer ${userData.accessToken}`;
      }

      const response = await apiClientRef.current.get(
        `/api/User/${loggedInUserId}/profile`,
        {headers},
      );

      return response.data || userData || {};
    } catch (error) {
      console.error('Error fetching logged-in user profile:', error);
      return userData || {};
    }
  }, [userData]);

  // Fetch Export Docs Stats
  const fetchExportDocsStats = useCallback(
    async (userProfileData = null) => {
      try {
        const headers = {};
        if (userData?.accessToken) {
          headers.Authorization = `Bearer ${userData.accessToken}`;
        }

        const [packingRows, completedRows, pendingRows] = await Promise.all([
          fetchEndpointRowsByDepartment(
            '/api/Export/Get-Packing-No-Total-count',
            headers,
            userProfileData,
          ),
          fetchEndpointRowsByDepartment(
            '/api/Export/Get-Completed-Export-Document-Count',
            headers,
            userProfileData,
          ),
          fetchEndpointRowsByDepartment(
            '/api/Export/Get-Pending-Export-Document-Count',
            headers,
            userProfileData,
          ),
        ]);

        const packingCount = sumCountFields(packingRows, [
          'totalPackagingCount',
          'totalPackingCount',
        ]);
        const completedCount = sumCountFields(completedRows, [
          'completedExportCount',
          'completedExpDocument',
        ]);
        const shipmentValue = sumTotalValue(completedRows);
        const pendingCount = sumCountFields(pendingRows, [
          'pendingExportCount',
          'pendingExpDocument',
        ]);

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

        console.log('Department depName Export Docs Stats:', {
          assignedDepartments: getDepartmentApiNames(userProfileData),
          packingCount,
          completedCount,
          pendingCount,
          shipmentValue,
          total: completedCount + pendingCount,
        });
      } catch (error) {
        console.error('Error fetching export docs stats:', error);
      }
    },
    [userData?.accessToken, userData],
  );

  // Fetch B/L Date Stats
  const fetchBLDateStats = useCallback(
    async (userProfileData = null) => {
      try {
        const headers = {};
        if (userData?.accessToken) {
          headers.Authorization = `Bearer ${userData.accessToken}`;
        }

        const [completedRows, pendingRows] = await Promise.all([
          fetchEndpointRowsByDepartment(
            '/api/Export/Get-Completed-BL-Date-Count',
            headers,
            userProfileData,
          ),
          fetchEndpointRowsByDepartment(
            '/api/Export/Get-Pending-BL-Date-Count',
            headers,
            userProfileData,
          ),
        ]);

        const completedCount = sumCountFields(completedRows, [
          'completedBLDateCount',
          'completedBL',
        ]);
        const pendingCount = sumCountFields(pendingRows, [
          'pendingBLDateCount',
          'pendingBL',
        ]);

        if (isMounted.current) {
          setExportStats(prev => ({
            ...prev,
            completedBLDateCount: completedCount,
            totalPendingBLDate: pendingCount,
            totalBLDateCount: completedCount + pendingCount,
          }));
        }

        console.log('Department depName B/L Date Stats:', {
          assignedDepartments: getDepartmentApiNames(userProfileData),
          completedCount,
          pendingCount,
          total: completedCount + pendingCount,
        });
      } catch (error) {
        console.error('Error fetching B/L date stats:', error);
      }
    },
    [userData?.accessToken, userData],
  );

  // Fetch Shipping Stats
  const fetchShippingStats = useCallback(
    async (userProfileData = null) => {
      try {
        const headers = {};
        if (userData?.accessToken) {
          headers.Authorization = `Bearer ${userData.accessToken}`;
        }

        const [completedRows, pendingRows] = await Promise.all([
          fetchEndpointRowsByDepartment(
            '/api/Export/Get-Completed-Export-Shipping-Date-Count',
            headers,
            userProfileData,
          ),
          fetchEndpointRowsByDepartment(
            '/api/Export/Get-Pending-Shipping-Date-Count',
            headers,
            userProfileData,
          ),
        ]);

        const completedCount = sumCountFields(completedRows, [
          'completedExportShippingDateCount',
          'completedShipping',
        ]);
        const pendingCount = sumCountFields(pendingRows, [
          'pendingShippingDateCount',
          'pendingShipping',
        ]);

        if (isMounted.current) {
          setExportStats(prev => ({
            ...prev,
            completedExportShippingDateCount: completedCount,
            pendingShippingDateCount: pendingCount,
            totalShippingDateCount: completedCount + pendingCount,
          }));
        }

        console.log('Department depName Shipping Stats:', {
          assignedDepartments: getDepartmentApiNames(userProfileData),
          completedCount,
          pendingCount,
          total: completedCount + pendingCount,
        });
      } catch (error) {
        console.error('Error fetching shipping stats:', error);
      }
    },
    [userData?.accessToken, userData],
  );

  // Fetch Bank Submit Stats
  const fetchBankSubmitStats = useCallback(
    async (userProfileData = null) => {
      try {
        const headers = {};
        if (userData?.accessToken) {
          headers.Authorization = `Bearer ${userData.accessToken}`;
        }

        const [completedRows, pendingRows] = await Promise.all([
          fetchEndpointRowsByDepartment(
            '/api/Export/Get-Completed-Bank-Submission-Date-Count',
            headers,
            userProfileData,
          ),
          fetchEndpointRowsByDepartment(
            '/api/Export/Get-Pending-Bank-Submission-Date-Count',
            headers,
            userProfileData,
          ),
        ]);

        const completedCount = sumCountFields(completedRows, [
          'completedBankSubmissionDateCount',
          'completedBank',
        ]);
        const pendingCount = sumCountFields(pendingRows, [
          'pendingBankSubmissionDateCount',
          'pendingBank',
        ]);

        if (isMounted.current) {
          setExportStats(prev => ({
            ...prev,
            completedBankSubmissionDateCount: completedCount,
            pendingBankSubmissionDateCount: pendingCount,
            totalBankSubmissionDateCount: completedCount + pendingCount,
          }));
        }

        console.log('Department depName Bank Submit Stats:', {
          assignedDepartments: getDepartmentApiNames(userProfileData),
          completedCount,
          pendingCount,
          total: completedCount + pendingCount,
        });
      } catch (error) {
        console.error('Error fetching bank submit stats:', error);
      }
    },
    [userData?.accessToken, userData],
  );

  // Fetch Realization Stats
  const fetchRealizationStats = useCallback(
    async (userProfileData = null) => {
      try {
        const headers = {};
        if (userData?.accessToken) {
          headers.Authorization = `Bearer ${userData.accessToken}`;
        }

        const [expectedRows, realizedRows, upcomingRows, overdueRows] =
          await Promise.all([
            fetchEndpointRowsByDepartment(
              '/api/Export/Get-Pending-Realization-Expected-Date-Count',
              headers,
              userProfileData,
            ),
            fetchEndpointRowsByDepartment(
              '/api/Export/Get-Completed-Realization-Date-Count',
              headers,
              userProfileData,
            ),
            fetchEndpointRowsByDepartment(
              '/api/Export/Get-Pending-Realization-Upcomming-Date-Count',
              headers,
              userProfileData,
            ),
            fetchEndpointRowsByDepartment(
              '/api/Export/Get-Pending-Realization-OverDue-Date-Count',
              headers,
              userProfileData,
            ),
          ]);

        const expectedValue = sumTotalValue(expectedRows);
        const realizedValue = sumTotalValue(realizedRows);
        const upcomingValue = sumTotalValue(upcomingRows);
        const overdueValue = sumTotalValue(overdueRows);
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

        console.log('Department depName Realization Stats:', {
          assignedDepartments: getDepartmentApiNames(userProfileData),
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
    },
    [userData?.accessToken, userData],
  );

  // Fetch all dashboard data - wrapped in useCallback with stable dependencies
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // First load the logged-in user's full profile.
      // Assigned departments from /api/User/{id}/profile decide every dashboard count.
      const userProfileData = await fetchUserProfileData();

      // IMPORTANT:
      // Do not fetch all data and filter on the app side.
      // The working backend scenario is:
      // /api/Export/Get-Completed-Export-Document-Count?depName=lpp
      // /api/Export/Get-Pending-Export-Document-Count?depName=lpp
      // So every dashboard API is called with depName for each assigned department.
      await Promise.all([
        fetchExportDocsStats(userProfileData),
        fetchBLDateStats(userProfileData),
        fetchShippingStats(userProfileData),
        fetchBankSubmitStats(userProfileData),
        fetchRealizationStats(userProfileData),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [
    fetchUserProfileData,
    fetchExportDocsStats,
    fetchBLDateStats,
    fetchShippingStats,
    fetchBankSubmitStats,
    fetchRealizationStats,
  ]);

  // Initial load
  useEffect(() => {
    isMounted.current = true;
    fetchDashboardData();

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [fetchDashboardData]);

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