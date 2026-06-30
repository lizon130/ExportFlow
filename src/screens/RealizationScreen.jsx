// src/screens/RealizationScreen.js
import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RealizationScreen = ({userData}) => {
  const [activeModal, setActiveModal] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedRealizationGroup, setSelectedRealizationGroup] = useState(null);
  const [upcomingViewMode, setUpcomingViewMode] = useState('deptBuyer');
  const [overdueViewMode, setOverdueViewMode] = useState('deptBuyer');
  const [realizationSearchText, setRealizationSearchText] = useState({
    upcoming: '',
    overdue: '',
  });
  const [groupDetailSearchText, setGroupDetailSearchText] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalAmount: 0,
    realizedAmount: 0,
    expectedAmount: 0,
    overdueAmount: 0,

    expectedDocumentCount: 0,
    realizedDocumentCount: 0,
    upcomingDocumentCount: 0,
    overdueDocumentCount: 0,

    expectedRows: [],
    realizedRows: [],
    upcomingRows: [],
    overdueRows: [],

    invoices: 0,
    realizedPercent: 0,
    lastUpdated: '-',
  });

  const API_BASE_URL = 'http://192.168.9.45:7000';

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

  const normalizeText = value => String(value || '').trim().toLowerCase();

  const getUniqueRowKey = (item, index) => {
    const monthValue =
      item?.expectedMonth ||
      item?.realizationMonth ||
      item?.upcomingMonth ||
      item?.overDueMonth ||
      '';

    const keyParts = [
      item?.recId,
      item?.id,
      item?.exportDocumentNo,
      item?.expDocumentNo,
      item?.invoiceNo,
      item?.departmentCode,
      item?.departmentName,
      item?.customerCode,
      item?.customerName,
      monthValue,
      item?.totalValue,
      item?.expectedMonthlyTotalDocumentsCount,
      item?.completedRealizationDateCount,
      item?.upcomingMonthlyTotalDocumentsCount,
      item?.overDueMonthlyTotalDocumentsCount,
    ]
      .map(value => normalizeText(value))
      .filter(Boolean)
      .join('|');

    return keyParts || `row-${index}`;
  };

  const removeDuplicateRows = rows => {
    const seen = new Set();

    return normalizeArray(rows).filter((item, index) => {
      const key = getUniqueRowKey(item, index);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  };

  const getStoredTextValue = async key => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (storageError) {
      console.log(`Unable to read ${key} from storage`, storageError);
      return null;
    }
  };

  const getStoredJsonValue = async key => {
    try {
      const value = await getStoredTextValue(key);

      if (!value) {
        return null;
      }

      return JSON.parse(value);
    } catch (storageError) {
      return null;
    }
  };

  const getStoredPlainUserId = async () => {
    const keys = ['userId', 'recId', 'id', 'loggedInUserId', 'currentUserId'];

    for (const key of keys) {
      const value = await getStoredTextValue(key);

      if (value) {
        return value;
      }
    }

    return null;
  };

  const getStoredPlainAccessToken = async () => {
    const keys = ['accessToken', 'token', 'jwtToken', 'authToken'];

    for (const key of keys) {
      const value = await getStoredTextValue(key);

      if (value) {
        return value;
      }
    }

    return '';
  };

  const getUserIdFromPayload = payload =>
    payload?.recId ||
    payload?.userId ||
    payload?.id ||
    payload?.profile?.recId ||
    payload?.profile?.userId ||
    payload?.profile?.id ||
    payload?.user?.recId ||
    payload?.user?.userId ||
    payload?.user?.id ||
    payload?.data?.recId ||
    payload?.data?.userId ||
    payload?.data?.id ||
    null;

  const getAccessTokenFromPayload = payload =>
    payload?.accessToken ||
    payload?.token ||
    payload?.jwtToken ||
    payload?.data?.accessToken ||
    payload?.user?.accessToken ||
    userData?.accessToken ||
    '';

  const getProfileFromPayload = payload => {
    if (!payload) {
      return null;
    }

    if (normalizeArray(payload?.departments).length) {
      return payload;
    }

    if (normalizeArray(payload?.profile?.departments).length) {
      return payload.profile;
    }

    if (normalizeArray(payload?.user?.departments).length) {
      return payload.user;
    }

    if (normalizeArray(payload?.data?.departments).length) {
      return payload.data;
    }

    return null;
  };

  const getStoredAuthPayload = async () => {
    const storageKeys = [
      'userData',
      'userInfo',
      'user',
      'authUser',
      'authData',
      'loginUser',
      'loggedInUser',
      'currentUser',
      'profile',
      'userProfile',
    ];

    for (const key of storageKeys) {
      const payload = await getStoredJsonValue(key);

      if (payload) {
        return payload;
      }
    }

    return null;
  };

  const fetchLoggedInUserProfile = async () => {
    const storedPayload = await getStoredAuthPayload();
    const profileFromPayload =
      getProfileFromPayload(userData) || getProfileFromPayload(storedPayload);

    if (profileFromPayload) {
      return profileFromPayload;
    }

    const storedPlainUserId = await getStoredPlainUserId();
    const userId =
      getUserIdFromPayload(userData) ||
      getUserIdFromPayload(storedPayload) ||
      storedPlainUserId;

    if (!userId) {
      console.warn('Realization access: logged-in user id not found');
      return userData || storedPayload || null;
    }

    try {
      const storedPlainAccessToken = await getStoredPlainAccessToken();
      const token =
        getAccessTokenFromPayload(userData) ||
        getAccessTokenFromPayload(storedPayload) ||
        storedPlainAccessToken;
      const response = await fetch(`${API_BASE_URL}/api/User/${userId}/profile`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (profileError) {
      console.error('Error fetching logged-in user profile:', profileError);
      return userData || storedPayload || null;
    }
  };

  const getAssignedDepartments = profile =>
    normalizeArray(
      profile?.departments ||
        profile?.department ||
        profile?.assignedDepartments ||
        profile?.profile?.departments ||
        profile?.user?.departments ||
        profile?.data?.departments ||
        [],
    );

  const getDepartmentQueryValues = department => {
    const values = [
      department?.departmentCode,
      department?.deptCode,
      department?.depCode,
      department?.departmentName,
      department?.deptName,
      department?.depName,
      department?.name,
    ]
      .map(value => String(value || '').trim())
      .filter(Boolean);

    return values.filter(
      (value, index, allValues) =>
        allValues.findIndex(item => normalizeText(item) === normalizeText(value)) ===
        index,
    );
  };

  const getAuthorizedDepartments = async () => {
    const profile = await fetchLoggedInUserProfile();
    const assignedDepartments = getAssignedDepartments(profile);

    // If any department is assigned, realization must load only those departments,
    // even for Super-Admin or Admin users.
    if (assignedDepartments.length) {
      return assignedDepartments;
    }

    // Important:
    // No assigned department means unrestricted user/admin.
    // Do NOT return "All Departments" because the backend does not have a
    // department with that name. Returning an empty array lets the API call run
    // without depName, exactly like the previous old behavior.
    return [];
  };

  const fetchRowsWithoutDepartment = async endpoint => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return normalizeArray(await response.json());
  };

  const fetchRowsForDepartment = async (endpoint, department) => {
    const queryValues = getDepartmentQueryValues(department);
    const finalQueryValues = queryValues.length ? queryValues : [''];

    for (const queryValue of finalQueryValues) {
      const url = queryValue
        ? `${API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}depName=${encodeURIComponent(
            queryValue,
          )}`
        : `${API_BASE_URL}${endpoint}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rows = normalizeArray(await response.json());

      // Use first matching department token that returns data.
      // This avoids double count when both code and name return same rows.
      if (rows.length || !queryValue) {
        return rows;
      }
    }

    return [];
  };

  const fetchRowsForAuthorizedDepartments = async endpoint => {
    const authorizedDepartments = await getAuthorizedDepartments();

    // Admin/user with no assigned department must see all data.
    // So call old API URL without depName.
    if (!authorizedDepartments.length) {
      const rows = await fetchRowsWithoutDepartment(endpoint);
      return removeDuplicateRows(rows);
    }

    let mergedRows = [];

    for (const department of authorizedDepartments) {
      const rows = await fetchRowsForDepartment(endpoint, department);
      mergedRows = [...mergedRows, ...rows];
    }

    return removeDuplicateRows(mergedRows);
  };


  const getNumber = value => {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const getFirstNumberField = (data, fieldName) => {
    const rows = normalizeArray(data);
    const rowWithValue = rows.find(item => getNumber(item?.[fieldName]) > 0);

    if (rowWithValue) {
      return getNumber(rowWithValue?.[fieldName]);
    }

    return rows.length > 0 ? getNumber(rows[0]?.[fieldName]) : 0;
  };

  const sumField = (data, fieldName) => {
    return normalizeArray(data).reduce(
      (sum, item) => sum + getNumber(item?.[fieldName]),
      0,
    );
  };

  const sumValueFields = data => {
    return normalizeArray(data).reduce(
      (sum, item) =>
        sum +
        (getNumber(item?.totalValue) ||
          getNumber(item?.totalExportValue) ||
          getNumber(item?.totalNetValue) ||
          getNumber(item?.pendingRealizationAmount) ||
          0),
      0,
    );
  };

  const getRealizedValue = data => {
    // Updated API returns realized value in totalValue per row.
    // Card value should be SUM of all totalValue.
    return normalizeArray(data).reduce(
      (sum, item) => sum + getNumber(item?.totalValue),
      0,
    );
  };

  const sumUniqueMonthField = (data, monthFieldName, valueFieldName) => {
    const monthValues = {};

    normalizeArray(data).forEach(item => {
      const monthValue = item?.[monthFieldName];

      if (!monthValue) {
        return;
      }

      const monthKey = String(monthValue).trim().toLowerCase();

      if (!monthKey) {
        return;
      }

      if (monthValues[monthKey] === undefined) {
        monthValues[monthKey] = getNumber(item?.[valueFieldName]);
      }
    });

    return Object.values(monthValues).reduce((sum, value) => sum + value, 0);
  };

  const fetchJson = async endpoint => {
    return fetchRowsForAuthorizedDepartments(endpoint);
  };

  const fetchRealizationDashboardStats = async () => {
    setDashboardLoading(true);

    try {
      // Every realization endpoint is called with depName only when departments
      // are assigned from /api/User/{id}/profile. If no department is assigned,
      // APIs are called without depName so admin can see all data.
      const [expectedData, realizedData, upcomingData, overdueData] =
        await Promise.all([
          fetchJson('/api/Export/Get-Pending-Realization-Expected-Date-Count'),
          fetchJson('/api/Export/Get-Completed-Realization-Date-Count'),
          fetchJson('/api/Export/Get-Pending-Realization-Upcomming-Date-Count'),
          fetchJson('/api/Export/Get-Pending-Realization-OverDue-Date-Count'),
        ]);

      const expectedRows = normalizeArray(expectedData);
      const realizedRows = normalizeArray(realizedData);
      const upcomingRows = normalizeArray(upcomingData);
      const overdueRows = normalizeArray(overdueData);

      // Expected Value card:
      // Sum all totalValue and all expectedMonthlyTotalDocumentsCount.
      const expectedTotal = sumValueFields(expectedRows);
      const expectedDocumentCount = sumField(
        expectedRows,
        'expectedMonthlyTotalDocumentsCount',
      );

      // Realized Value card:
      // Value from completedRealizationAmount if available, otherwise totalValue.
      // Document count from completedRealizationDateCount.
      const realizedTotal = getRealizedValue(realizedRows);
      const realizedDocumentCount = sumField(
        realizedRows,
        'completedRealizationDateCount',
      );

      // Upcoming card:
      // Sum all totalValue and upcomingMonthlyTotalDocumentsCount.
      const upcomingTotal = sumValueFields(upcomingRows);
      const upcomingDocumentCount = sumField(
        upcomingRows,
        'upcomingMonthlyTotalDocumentsCount',
      );

      // Overdue card:
      // Sum all totalValue and overDueMonthlyTotalDocumentsCount.
      const overdueTotal = sumValueFields(overdueRows);
      const overdueDocumentCount = sumField(
        overdueRows,
        'overDueMonthlyTotalDocumentsCount',
      );

      const realizedPercent = expectedTotal
        ? Math.min(100, Math.round((realizedTotal / expectedTotal) * 100))
        : 0;

      setDashboardStats({
        totalAmount: expectedTotal,
        realizedAmount: realizedTotal,
        expectedAmount: upcomingTotal,
        overdueAmount: overdueTotal,

        expectedDocumentCount,
        realizedDocumentCount,
        upcomingDocumentCount,
        overdueDocumentCount,

        expectedRows,
        realizedRows,
        upcomingRows,
        overdueRows,

        invoices: overdueDocumentCount || overdueRows.length,
        realizedPercent,
        lastUpdated: new Date().toLocaleString(),
      });
    } catch (error) {
      console.error('Error fetching realization dashboard stats:', error);
      setDashboardStats({
        totalAmount: 0,
        realizedAmount: 0,
        expectedAmount: 0,
        overdueAmount: 0,

        expectedDocumentCount: 0,
        realizedDocumentCount: 0,
        upcomingDocumentCount: 0,
        overdueDocumentCount: 0,

        expectedRows: [],
        realizedRows: [],
        upcomingRows: [],
        overdueRows: [],

        invoices: 0,
        realizedPercent: 0,
        lastUpdated: '-',
      });
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    fetchRealizationDashboardStats();
  }, []);

  const pendingAmount =
    dashboardStats.expectedAmount + dashboardStats.overdueAmount;

  const monthlyData = [
    {month: 'Jan', realized: 1450000, expected: 850000, overdue: 120000},
    {month: 'Feb', realized: 1200000, expected: 780000, overdue: 150000},
    {month: 'Mar', realized: 1750000, expected: 500000, overdue: 250000},
    {month: 'Apr', realized: 1650000, expected: 900000, overdue: 110000},
    {month: 'May', realized: 1300000, expected: 740000, overdue: 180000},
    {month: 'Jun', realized: 1250000, expected: 680000, overdue: 95000},
    {month: 'Jul', realized: 1180000, expected: 720000, overdue: 135000},
    {month: 'Aug', realized: 1580000, expected: 820000, overdue: 165000},
    {month: 'Sep', realized: 1020000, expected: 600000, overdue: 90000},
    {month: 'Oct', realized: 800000, expected: 500000, overdue: 70000},
    {month: 'Nov', realized: 1150000, expected: 650000, overdue: 120000},
    {month: 'Dec', realized: 1320000, expected: 760000, overdue: 155000},
  ];

  const agingData = [
    {label: '1-7 Days', amount: 40000, color: '#3b82f6'},
    {label: '8-15 Days', amount: 55000, color: '#10b981'},
    {label: '16-30 Days', amount: 75000, color: '#f59e0b'},
    {label: '31-60 Days', amount: 40000, color: '#ef4444'},
    {label: '60+ Days', amount: 25000, color: '#8b5cf6'},
  ];

  const buyerSummary = [
    {
      buyer: 'ABC Fashion Ltd.',
      total: 500000,
      realized: 400000,
      expected: 70000,
      overdue: 30000,
      percentage: 80,
      risk: 'Good',
    },
    {
      buyer: 'XYZ Garments',
      total: 300000,
      realized: 180000,
      expected: 60000,
      overdue: 60000,
      percentage: 60,
      risk: 'Monitor',
    },
    {
      buyer: 'Global Wear Inc.',
      total: 450000,
      realized: 250000,
      expected: 100000,
      overdue: 100000,
      percentage: 55,
      risk: 'High Risk',
    },
    {
      buyer: 'Denim House',
      total: 350000,
      realized: 240000,
      expected: 50000,
      overdue: 60000,
      percentage: 68,
      risk: 'Monitor',
    },
    {
      buyer: 'Style World',
      total: 250000,
      realized: 150000,
      expected: 60000,
      overdue: 40000,
      percentage: 60,
      risk: 'Monitor',
    },
  ];

  const invoiceData = [
    {
      buyer: 'ABC Fashion Ltd.',
      invoiceNo: 'INV-1025',
      paymentTerm: '120 Days From Shipment',
      expectedDate: '01 May 2026',
      daysStatus: '15 Days Overdue',
      invoiceAmount: 50000,
      realizedAmount: 30000,
      pendingAmount: 20000,
      status: 'Partially Realized',
      bankRef: 'BR-6541',
      mode: 'TT',
      collectionFrom: 'Ex-Factory Date',
      baseDate: '01 Jan 2026',
    },
    {
      buyer: 'XYZ Garments',
      invoiceNo: 'INV-1026',
      paymentTerm: '60 Days Acceptance',
      expectedDate: '20 Apr 2026',
      daysStatus: '5 Days Overdue',
      invoiceAmount: 35000,
      realizedAmount: 35000,
      pendingAmount: 0,
      status: 'Realized',
      bankRef: 'BR-4432',
      mode: 'TT',
      collectionFrom: 'BL Date',
      baseDate: '20 Feb 2026',
    },
    {
      buyer: 'Global Wear Inc.',
      invoiceNo: 'INV-1027',
      paymentTerm: '30 Days BL/AWB',
      expectedDate: '15 May 2026',
      daysStatus: '1 Day Left',
      invoiceAmount: 20000,
      realizedAmount: 0,
      pendingAmount: 20000,
      status: 'Upcoming',
      bankRef: '-',
      mode: '-',
      collectionFrom: 'BL Date',
      baseDate: '15 Apr 2026',
    },
    {
      buyer: 'Denim House',
      invoiceNo: 'INV-1028',
      paymentTerm: 'TT At Sight',
      expectedDate: '18 Mar 2026',
      daysStatus: '67 Days Overdue',
      invoiceAmount: 15000,
      realizedAmount: 15000,
      pendingAmount: 0,
      status: 'Realized',
      bankRef: 'BR-7710',
      mode: 'TT',
      collectionFrom: 'Invoice Date',
      baseDate: '18 Mar 2026',
    },
    {
      buyer: 'ABC Fashion Ltd.',
      invoiceNo: 'INV-1029',
      paymentTerm: 'EOM + 63 Days',
      expectedDate: '25 May 2026',
      daysStatus: '2 Days Left',
      invoiceAmount: 25000,
      realizedAmount: 0,
      pendingAmount: 25000,
      status: 'Due Today',
      bankRef: '-',
      mode: '-',
      collectionFrom: 'Invoice Date',
      baseDate: '23 Mar 2026',
    },
    {
      buyer: 'Style World',
      invoiceNo: 'INV-1030',
      paymentTerm: '120 Days Delivery',
      expectedDate: '05 Jun 2026',
      daysStatus: '13 Days Left',
      invoiceAmount: 30000,
      realizedAmount: 0,
      pendingAmount: 30000,
      status: 'Upcoming',
      bankRef: '-',
      mode: '-',
      collectionFrom: 'Delivery Date',
      baseDate: '05 Feb 2026',
    },
    {
      buyer: 'XYZ Garments',
      invoiceNo: 'INV-1031',
      paymentTerm: '90 Days From BL',
      expectedDate: '10 Apr 2026',
      daysStatus: '45 Days Overdue',
      invoiceAmount: 40000,
      realizedAmount: 20000,
      pendingAmount: 20000,
      status: 'Partially Realized',
      bankRef: 'BR-8842',
      mode: 'TT',
      collectionFrom: 'BL Date',
      baseDate: '10 Jan 2026',
    },
  ];

  const money = value =>
    `USD ${Number(value || 0).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })}`;

  const shortMoney = value => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }

    if (value >= 1000) {
      return `${Math.round(value / 1000)}K`;
    }

    return `${value}`;
  };

  const maxMonthlyAmount = useMemo(() => {
    return Math.max(
      ...monthlyData.map(item => item.realized + item.expected + item.overdue),
    );
  }, [monthlyData]);

  const overdueInvoices = invoiceData.filter(
    item => item.daysStatus.includes('Overdue') || item.pendingAmount > 0,
  );

  const realizedInvoices = invoiceData.filter(item => item.realizedAmount > 0);

  const upcomingInvoices = invoiceData.filter(
    item => item.status === 'Upcoming' || item.status === 'Due Today',
  );

  const closeModal = () => {
    setActiveModal(null);
    setSelectedInvoice(null);
    setSelectedRealizationGroup(null);
    setGroupDetailSearchText('');
  };

  const getStatusMeta = status => {
    if (status === 'Realized') {
      return {
        bg: 'rgba(16,185,129,0.14)',
        color: '#22c55e',
        border: 'rgba(16,185,129,0.35)',
      };
    }

    if (status === 'Partially Realized') {
      return {
        bg: 'rgba(139,92,246,0.14)',
        color: '#a78bfa',
        border: 'rgba(139,92,246,0.35)',
      };
    }

    if (status === 'Due Today') {
      return {
        bg: 'rgba(245,158,11,0.14)',
        color: '#f59e0b',
        border: 'rgba(245,158,11,0.35)',
      };
    }

    return {
      bg: 'rgba(59,130,246,0.14)',
      color: '#60a5fa',
      border: 'rgba(59,130,246,0.35)',
    };
  };

  const getRiskStyle = risk => {
    if (risk === 'Good') {
      return {
        bg: 'rgba(16,185,129,0.15)',
        color: '#22c55e',
        border: 'rgba(16,185,129,0.35)',
      };
    }

    if (risk === 'High Risk') {
      return {
        bg: 'rgba(239,68,68,0.15)',
        color: '#ef4444',
        border: 'rgba(239,68,68,0.35)',
      };
    }

    return {
      bg: 'rgba(245,158,11,0.15)',
      color: '#f59e0b',
      border: 'rgba(245,158,11,0.35)',
    };
  };

  const renderInvoiceRows = data => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.invoiceTable}>
        <View style={styles.invoiceTableHeader}>
          <Text style={[styles.invoiceHeaderText, styles.invoiceBuyerCol]}>
            Buyer
          </Text>
          <Text style={[styles.invoiceHeaderText, styles.invoiceNoCol]}>
            Invoice
          </Text>
          <Text style={[styles.invoiceHeaderText, styles.invoiceDateCol]}>
            Expected
          </Text>
          <Text style={[styles.invoiceHeaderText, styles.invoiceDaysCol]}>
            Days
          </Text>
          <Text style={[styles.invoiceHeaderText, styles.invoiceAmountCol]}>
            Amount
          </Text>
          <Text style={[styles.invoiceHeaderText, styles.invoiceStatusCol]}>
            Status
          </Text>
        </View>

        {data.map((item, index) => {
          const statusMeta = getStatusMeta(item.status);

          return (
            <TouchableOpacity
              key={item.invoiceNo}
              activeOpacity={0.85}
              style={[
                styles.invoiceTableRow,
                index % 2 === 0 && styles.invoiceTableRowAlt,
              ]}
              onPress={() => {
                setSelectedInvoice(item);
                setActiveModal('invoiceDetails');
              }}>
              <Text
                style={[styles.invoiceCellText, styles.invoiceBuyerCol]}
                numberOfLines={1}>
                {item.buyer}
              </Text>

              <Text style={[styles.invoiceCellStrong, styles.invoiceNoCol]}>
                {item.invoiceNo}
              </Text>

              <Text style={[styles.invoiceCellText, styles.invoiceDateCol]}>
                {item.expectedDate}
              </Text>

              <Text
                style={[
                  styles.invoiceDaysText,
                  styles.invoiceDaysCol,
                  item.daysStatus.includes('Overdue') &&
                    styles.invoiceDaysOverdue,
                ]}
                numberOfLines={2}>
                {item.daysStatus}
              </Text>

              <Text style={[styles.invoiceCellText, styles.invoiceAmountCol]}>
                {shortMoney(item.invoiceAmount)}
              </Text>

              <View style={styles.invoiceStatusCol}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: statusMeta.bg,
                      borderColor: statusMeta.border,
                    },
                  ]}>
                  <Text
                    style={[styles.statusBadgeText, {color: statusMeta.color}]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderRealizationMonthRows = (data, type) => {
    const rows = normalizeArray(data);

    const config =
      type === 'expected'
        ? {
            monthField: 'expectedMonth',
            docsField: 'expectedMonthlyTotalDocumentsCount',
            pcsField: 'expectedMonthlyTotalTotalPcsCount',
            emptyTitle: 'No expected realization data found',
          }
        : type === 'upcoming'
        ? {
            monthField: 'upcomingMonth',
            docsField: 'upcomingMonthlyTotalDocumentsCount',
            pcsField: 'upcomingMonthlyTotalTotalPcsCount',
            emptyTitle: 'No upcoming realization data found',
          }
        : type === 'overdue'
        ? {
            monthField: 'overDueMonth',
            docsField: 'overDueMonthlyTotalDocumentsCount',
            pcsField: 'overDueMonthlyTotalTotalPcsCount',
            emptyTitle: 'No overdue realization data found',
          }
        : {
            monthField: 'realizationMonth',
            docsField: 'completedRealizationDateCount',
            pcsField: 'completedRealizationPcsCount',
            emptyTitle: 'No realized realization data found',
          };

    if (!rows.length) {
      return (
        <View style={styles.emptyModalCard}>
          <Text style={styles.emptyModalText}>{config.emptyTitle}</Text>
        </View>
      );
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.realizationMonthTable}>
          <View style={styles.realizationMonthHeader}>
            <Text
              style={[
                styles.realizationMonthHeaderText,
                styles.realizationMonthCol,
              ]}>
              Month
            </Text>
            <Text
              style={[
                styles.realizationMonthHeaderText,
                styles.realizationDocsCol,
              ]}>
              Documents
            </Text>
            <Text
              style={[
                styles.realizationMonthHeaderText,
                styles.realizationPcsCol,
              ]}>
              Total Pcs
            </Text>
            <Text
              style={[
                styles.realizationMonthHeaderText,
                styles.realizationValueCol,
              ]}>
              Value
            </Text>
          </View>

          {rows.map((item, index) => (
            <View
              key={`${item?.[config.monthField] || 'month'}-${index}`}
              style={[
                styles.realizationMonthRow,
                index % 2 === 0 && styles.realizationMonthRowAlt,
              ]}>
              <Text
                style={[
                  styles.realizationMonthCellStrong,
                  styles.realizationMonthCol,
                ]}
                numberOfLines={1}>
                {item?.[config.monthField] || '-'}
              </Text>
              <Text
                style={[
                  styles.realizationMonthCell,
                  styles.realizationDocsCol,
                ]}>
                {getNumber(item?.[config.docsField]).toLocaleString()}
              </Text>
              <Text
                style={[styles.realizationMonthCell, styles.realizationPcsCol]}>
                {getNumber(item?.[config.pcsField]).toLocaleString()}
              </Text>
              <Text
                style={[
                  styles.realizationMonthCellValue,
                  styles.realizationValueCol,
                ]}>
                {shortMoney(sumValueFields([item]))}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderRealizedMonthRows = data => {
    const rows = normalizeArray(data);

    if (!rows.length) {
      return (
        <View style={styles.emptyModalCard}>
          <Text style={styles.emptyModalText}>No realized data found</Text>
        </View>
      );
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.realizedMonthOnlyTable}>
          <View style={styles.realizedMonthOnlyHeader}>
            <Text
              style={[
                styles.realizedMonthOnlyHeaderText,
                styles.realizedMonthOnlyMonthCol,
              ]}>
              Month
            </Text>
            <Text
              style={[
                styles.realizedMonthOnlyHeaderText,
                styles.realizedMonthOnlyDocsCol,
              ]}>
              Documents
            </Text>
            <Text
              style={[
                styles.realizedMonthOnlyHeaderText,
                styles.realizedMonthOnlyValueCol,
              ]}>
              Value
            </Text>
          </View>

          {rows.map((item, index) => (
            <View
              key={`${item?.realizationMonth || 'month'}-${index}`}
              style={[
                styles.realizedMonthOnlyRow,
                index % 2 === 0 && styles.realizedMonthOnlyRowAlt,
              ]}>
              <Text
                style={[
                  styles.realizedMonthOnlyCellStrong,
                  styles.realizedMonthOnlyMonthCol,
                ]}
                numberOfLines={1}>
                {item?.realizationMonth || '-'}
              </Text>

              <Text
                style={[
                  styles.realizedMonthOnlyCell,
                  styles.realizedMonthOnlyDocsCol,
                ]}>
                {getNumber(
                  item?.completedRealizationDateCount,
                ).toLocaleString()}
              </Text>

              <Text
                style={[
                  styles.realizedMonthOnlyValueText,
                  styles.realizedMonthOnlyValueCol,
                ]}>
                {money(item?.totalValue)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const getMonthOrderNumber = monthValue => {
    const monthText = String(monthValue || '').trim().toLowerCase();

    const monthOrder = {
      january: 1,
      jan: 1,
      february: 2,
      feb: 2,
      march: 3,
      mar: 3,
      april: 4,
      apr: 4,
      may: 5,
      june: 6,
      jun: 6,
      july: 7,
      jul: 7,
      august: 8,
      aug: 8,
      september: 9,
      sep: 9,
      october: 10,
      oct: 10,
      november: 11,
      nov: 11,
      december: 12,
      dec: 12,
    };

    return monthOrder[monthText] || 99;
  };

  const joinUniqueText = values => {
    const uniqueValues = [];

    values.forEach(value => {
      const textValue = String(value || '').trim();

      if (
        textValue &&
        !uniqueValues.some(
          item => item.toLowerCase() === textValue.toLowerCase(),
        )
      ) {
        uniqueValues.push(textValue);
      }
    });

    return uniqueValues.join(', ');
  };

  const getRealizationConfig = type => {
    if (type === 'upcoming') {
      return {
        monthField: 'upcomingMonth',
        docsField: 'upcomingMonthlyTotalDocumentsCount',
        pcsField: 'upcomingMonthlyTotalTotalPcsCount',
        emptyTitle: 'No upcoming realization data found',
        icon: '🗓️',
        accent: '#f59e0b',
        softBg: 'rgba(245,158,11,0.14)',
        badge: 'Upcoming',
      };
    }

    return {
      monthField: 'overDueMonth',
      docsField: 'overDueMonthlyTotalDocumentsCount',
      pcsField: 'overDueMonthlyTotalTotalPcsCount',
      emptyTitle: 'No overdue realization data found',
      icon: '⏰',
      accent: '#ef4444',
      softBg: 'rgba(239,68,68,0.14)',
      badge: 'Overdue',
    };
  };

  const getRealizationGroupMeta = viewMode => {
    if (viewMode === 'deptBuyer') {
      return {
        label: 'Dept/Buyer',
        badge: 'D/B',
        codeLabel: 'Codes',
        icon: '🏢',
        nameGetter: item => {
          const deptName =
            item?.departmentName || item?.departmentCode || 'Unknown Department';
          const buyerName =
            item?.customerName || item?.customerCode || 'Unknown Buyer';
          return `${deptName} • ${buyerName}`;
        },
        codeGetter: item =>
          joinUniqueText([
            item?.departmentCode ? `Dept: ${item.departmentCode}` : '',
            item?.customerCode ? `Buyer: ${item.customerCode}` : '',
          ]),
      };
    }

    if (viewMode === 'department') {
      return {
        label: 'Department',
        badge: 'Dept',
        codeLabel: 'Department Code',
        icon: '🏢',
        nameGetter: item => item?.departmentName || item?.departmentCode,
        codeGetter: item => item?.departmentCode || '',
      };
    }

    if (viewMode === 'buyer') {
      return {
        label: 'Buyer',
        badge: 'Buyer',
        codeLabel: 'Buyer Code',
        icon: '👤',
        nameGetter: item => item?.customerName || item?.customerCode,
        codeGetter: item => item?.customerCode || '',
      };
    }

    return {
      label: 'Month',
      badge: 'Month',
      codeLabel: '',
      icon: '',
      nameGetter: null,
      codeGetter: null,
    };
  };

  const buildGroupedRealizationRows = (data, type, viewMode) => {
    const config = getRealizationConfig(type);
    const groupMeta = getRealizationGroupMeta(viewMode);
    const groupMap = {};

    normalizeArray(data).forEach(item => {
      const monthName = String(
        item?.[config.monthField] || 'Unknown Month',
      ).trim();
      const departmentName = String(
        item?.departmentName || item?.departmentCode || 'Unknown Department',
      ).trim();
      const buyerName = String(
        item?.customerName || item?.customerCode || 'Unknown Buyer',
      ).trim();
      const departmentCode = String(item?.departmentCode || '').trim();
      const customerCode = String(item?.customerCode || '').trim();

      const groupName =
        viewMode === 'month'
          ? monthName || 'Unknown Month'
          : viewMode === 'deptBuyer'
          ? `${departmentName || 'Unknown Department'} • ${
              buyerName || 'Unknown Buyer'
            }`
          : String(groupMeta.nameGetter?.(item) || 'Unknown').trim();

      const groupCode =
        viewMode === 'month'
          ? ''
          : viewMode === 'deptBuyer'
          ? `${departmentCode}|${customerCode}`
          : String(groupMeta.codeGetter?.(item) || '').trim();

      const key = `${viewMode}-${groupCode || groupName}`.toLowerCase();

      if (!groupMap[key]) {
        groupMap[key] = {
          label: groupName || 'Unknown',
          code:
            viewMode === 'deptBuyer'
              ? joinUniqueText([
                  departmentCode ? `Dept: ${departmentCode}` : '',
                  customerCode ? `Buyer: ${customerCode}` : '',
                ])
              : groupCode,
          departmentName,
          departmentCode,
          buyerName,
          customerCode,
          months: [],
          sourceRows: [],
          documents: 0,
          pcs: 0,
          value: 0,
          viewMode,
        };
      }

      groupMap[key].documents += getNumber(item?.[config.docsField]);
      groupMap[key].pcs += getNumber(item?.[config.pcsField]);
      groupMap[key].value += sumValueFields([item]);
      groupMap[key].sourceRows.push(item);

      if (monthName) {
        groupMap[key].months.push(monthName);
      }
    });

    return Object.values(groupMap)
      .map(item => ({
        ...item,
        monthsText: joinUniqueText(item.months),
      }))
      .sort((a, b) => {
        if (viewMode === 'month') {
          const leftOrder = getMonthOrderNumber(a.label);
          const rightOrder = getMonthOrderNumber(b.label);

          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          return a.label.localeCompare(b.label);
        }

        return b.value - a.value;
      });
  };

  const buildRealizationGroupMonthDetails = (groupItem, type) => {
    const config = getRealizationConfig(type);
    const monthMap = {};

    normalizeArray(groupItem?.sourceRows).forEach(item => {
      const monthName = String(
        item?.[config.monthField] || 'Unknown Month',
      ).trim();
      const monthKey = monthName.toLowerCase();

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthName || 'Unknown Month',
          documents: 0,
          pcs: 0,
          value: 0,
        };
      }

      monthMap[monthKey].documents += getNumber(item?.[config.docsField]);
      monthMap[monthKey].pcs += getNumber(item?.[config.pcsField]);
      monthMap[monthKey].value += sumValueFields([item]);
    });

    return Object.values(monthMap).sort((a, b) => {
      const leftOrder = getMonthOrderNumber(a.month);
      const rightOrder = getMonthOrderNumber(b.month);

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return a.month.localeCompare(b.month);
    });
  };

  const openRealizationGroupDetails = ({item, type, viewMode, config, groupMeta}) => {
    if (viewMode === 'month') {
      return;
    }

    const detailRows = buildRealizationGroupMonthDetails(item, type);

    setGroupDetailSearchText('');
    setSelectedRealizationGroup({
      ...item,
      type,
      viewMode,
      groupLabel: groupMeta.label,
      codeLabel: groupMeta.codeLabel,
      accent: config.accent,
      softBg: config.softBg,
      detailRows,
    });
  };

  const renderRealizationGroupDetailModal = () => {
    const group = selectedRealizationGroup;

    if (!group) {
      return null;
    }

    const totalValue = normalizeArray(group.detailRows).reduce(
      (sum, item) => sum + getNumber(item?.value),
      0,
    );
    const filteredDetailRows = normalizeArray(group.detailRows).filter(row =>
      rowMatchesSearch(row, groupDetailSearchText),
    );

    return (
      <Modal
        visible={!!selectedRealizationGroup}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedRealizationGroup(null)}>
        <View style={styles.groupDetailOverlay}>
          <View style={styles.groupDetailModal}>
            <View style={styles.groupDetailHeader}>
              <View style={styles.groupDetailTitleWrap}>
                <Text style={styles.groupDetailTitle} numberOfLines={2}>
                  {group.label || '-'}
                </Text>
                <Text style={styles.groupDetailSubtitle} numberOfLines={1}>
                  {`${group.groupLabel} wise month details`}
                </Text>
                {group.code ? (
                  <Text style={styles.groupDetailCodeText} numberOfLines={1}>
                    {group.codeLabel}: {group.code}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.groupDetailCloseBtn}
                onPress={() => setSelectedRealizationGroup(null)}>
                <Text style={styles.groupDetailCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.groupDetailSummaryRow}>
              <View style={styles.groupDetailSummaryBox}>
                <Text style={styles.groupDetailSummaryValue}>
                  {money(totalValue)}
                </Text>
                <Text style={styles.groupDetailSummaryLabel}>Total Value</Text>
              </View>
            </View>

            <View style={styles.groupDetailSearchWrap}>
              <View style={styles.groupDetailSearchBox}>
                <Text style={styles.realizationSearchIcon}>🔍</Text>
                <TextInput
                  style={styles.groupDetailSearchInput}
                  placeholder="Search month or value..."
                  placeholderTextColor="#64748b"
                  value={groupDetailSearchText}
                  onChangeText={setGroupDetailSearchText}
                />
              </View>

              {groupDetailSearchText ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.groupDetailSearchClearBtn}
                  onPress={() => setGroupDetailSearchText('')}>
                  <Text style={styles.realizationSearchClearText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.groupDetailTable}>
              <View style={styles.groupDetailTableHeader}>
                <Text
                  style={[
                    styles.groupDetailHeaderText,
                    styles.groupDetailMonthCol,
                  ]}>
                  Month
                </Text>
                <Text
                  style={[
                    styles.groupDetailHeaderText,
                    styles.groupDetailValueCol,
                  ]}>
                  Value
                </Text>
              </View>

              <ScrollView
                style={styles.groupDetailTableBody}
                showsVerticalScrollIndicator={true}>
                {filteredDetailRows.length ? (
                  filteredDetailRows.map((item, index) => (
                    <View
                      key={`${item?.month || 'month'}-${index}`}
                      style={[
                        styles.groupDetailTableRow,
                      index % 2 === 0 && styles.groupDetailTableRowAlt,
                      ]}>
                      <Text
                        style={[
                          styles.groupDetailMonthText,
                        styles.groupDetailMonthCol,
                      ]}
                      numberOfLines={2}>
                      {item.month || '-'}
                    </Text>
                    <Text
                      style={[
                        styles.groupDetailValueText,
                        styles.groupDetailValueCol,
                      ]}
                      numberOfLines={1}>
                      {shortMoney(getNumber(item.value))}
                    </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.groupDetailNoDataRow}>
                    <Text style={styles.emptyModalText}>No matching month found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const getSearchableValue = value => String(value || '').trim().toLowerCase();

  const rowMatchesSearch = (row, searchText) => {
    const normalizedSearch = getSearchableValue(searchText);

    if (!normalizedSearch) {
      return true;
    }

    return [
      row?.label,
      row?.code,
      row?.departmentName,
      row?.departmentCode,
      row?.buyerName,
      row?.customerCode,
      row?.monthsText,
      row?.month,
      row?.value,
    ].some(value => getSearchableValue(value).includes(normalizedSearch));
  };

  const getRealizationSearchText = type =>
    type === 'upcoming'
      ? realizationSearchText.upcoming
      : realizationSearchText.overdue;

  const updateRealizationSearchText = (type, value) => {
    setRealizationSearchText(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  const clearRealizationSearchText = type => {
    updateRealizationSearchText(type, '');
  };

  const renderRealizationSearchBox = type => {
    const searchValue = getRealizationSearchText(type);

    return (
      <View style={styles.realizationSearchWrap}>
        <View style={styles.realizationSearchBox}>
          <Text style={styles.realizationSearchIcon}>🔍</Text>
          <TextInput
            style={styles.realizationSearchInput}
            placeholder="Search month, department, buyer, code..."
            placeholderTextColor="#64748b"
            value={searchValue}
            onChangeText={value => updateRealizationSearchText(type, value)}
          />
        </View>

        {searchValue ? (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.realizationSearchClearBtn}
            onPress={() => clearRealizationSearchText(type)}>
            <Text style={styles.realizationSearchClearText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderRealizationViewFilter = type => {
    const activeMode = type === 'upcoming' ? upcomingViewMode : overdueViewMode;
    const setActiveMode =
      type === 'upcoming' ? setUpcomingViewMode : setOverdueViewMode;

    return (
      <View style={styles.realizationFilterWrap}>
        {[
          {key: 'deptBuyer', label: 'Dept / Buyer Wise'},
          {key: 'month', label: 'Month Wise'},
        ].map(option => {
          const isActive = activeMode === option.key;

          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.85}
              style={[
                styles.realizationFilterButton,
                isActive && styles.realizationFilterButtonActive,
              ]}
              onPress={() => setActiveMode(option.key)}>
              <Text
                style={[
                  styles.realizationFilterText,
                  isActive && styles.realizationFilterTextActive,
                ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderSmartRealizationCards = (data, type) => {
    const activeMode = type === 'upcoming' ? upcomingViewMode : overdueViewMode;
    const rows = buildGroupedRealizationRows(data, type, activeMode);
    const config = getRealizationConfig(type);
    const groupMeta = getRealizationGroupMeta(activeMode);
    const searchText = getRealizationSearchText(type);
    const filteredRows = rows.filter(row => rowMatchesSearch(row, searchText));

    if (!rows.length) {
      return (
        <View style={styles.emptyModalCard}>
          <Text style={styles.emptyModalText}>{config.emptyTitle}</Text>
        </View>
      );
    }

    if (!filteredRows.length) {
      return (
        <View style={styles.emptyModalCard}>
          <Text style={styles.emptyModalText}>No matching data found</Text>
        </View>
      );
    }

    const maxValue = Math.max(...filteredRows.map(item => item.value), 1);

    return (
      <View style={styles.smartCardGrid}>
        {filteredRows.map((item, index) => {
          const percentage = Math.min(
            100,
            Math.round((item.value / maxValue) * 100),
          );
          const icon = activeMode === 'month' ? config.icon : groupMeta.icon;

          const canOpenDetails = activeMode !== 'month';

          return (
            <TouchableOpacity
              key={`${activeMode}-${item.code || item.label}-${index}`}
              activeOpacity={canOpenDetails ? 0.86 : 1}
              disabled={!canOpenDetails}
              style={[
                styles.smartRealizationCard,
                canOpenDetails && styles.smartRealizationCardClickable,
                {borderLeftColor: config.accent},
              ]}
              onPress={() =>
                openRealizationGroupDetails({
                  item,
                  type,
                  viewMode: activeMode,
                  config,
                  groupMeta,
                })
              }>
              <View
                style={[styles.smartCardGlow, {backgroundColor: config.softBg}]}
              />

              <View style={styles.smartCardTopRow}>
                <View
                  style={[
                    styles.smartCardIconBox,
                    {backgroundColor: config.softBg},
                  ]}>
                  <Text style={styles.smartCardIcon}>{icon}</Text>
                </View>

                <View style={styles.smartCardTitleWrap}>
                  <Text style={styles.smartCardLabel}>
                    {`${config.badge} ${groupMeta.label}`}
                  </Text>
                  {activeMode === 'deptBuyer' ? (
                    <>
                      <Text style={styles.smartCardEntityLabel}>Department</Text>
                      <Text style={styles.smartCardMonth}>
                        {item.departmentName || '-'}
                      </Text>
                      <Text style={styles.smartCardEntityLabel}>Buyer</Text>
                      <Text style={styles.smartCardMonth}>
                        {item.buyerName || '-'}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.smartCardMonth}>
                      {item.label || '-'}
                    </Text>
                  )}

                  {activeMode !== 'month' && item.code ? (
                    <Text style={styles.smartCardSubInfo}>
                      {groupMeta.codeLabel}: {item.code}
                    </Text>
                  ) : null}
                  {activeMode !== 'month' && item.monthsText ? (
                    <Text style={styles.smartCardSubInfo}>
                      Months: {item.monthsText}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.smartCardBadge,
                    {
                      backgroundColor: config.softBg,
                      borderColor: `${config.accent}55`,
                    },
                  ]}>
                  <Text
                    style={[styles.smartCardBadgeText, {color: config.accent}]}>
                    {groupMeta.badge}
                  </Text>
                </View>
              </View>

              <Text style={[styles.smartCardValue, {color: config.accent}]}>
                {money(item.value)}
              </Text>


              <View style={styles.smartProgressRow}>
                <View style={styles.smartProgressTrack}>
                  <View
                    style={[
                      styles.smartProgressFill,
                      {
                        width: `${Math.max(8, percentage)}%`,
                        backgroundColor: config.accent,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.smartProgressText}>{percentage}%</Text>
              </View>

              {canOpenDetails ? (
                <Text style={styles.smartCardTapHint}>
                  Tap to view month details
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderModalContent = () => {
    if (activeModal === 'expectedTotal') {
      return (
        <>
          <ModalSummaryCard
            title="Expected Value"
            value={money(dashboardStats.totalAmount)}
            subtitle={`${dashboardStats.expectedDocumentCount.toLocaleString()} documents`}
            icon="💼"
            color="#3b82f6"
          />
          {renderRealizationMonthRows(dashboardStats.expectedRows, 'expected')}
        </>
      );
    }

    if (activeModal === 'realized') {
      return (
        <>
          <ModalSummaryCard
            title="Realized Value"
            value={money(dashboardStats.realizedAmount)}
            subtitle={`${dashboardStats.realizedDocumentCount.toLocaleString()} documents realized`}
            icon="📈"
            color="#10b981"
          />
          {renderRealizedMonthRows(dashboardStats.realizedRows)}
        </>
      );
    }

    if (activeModal === 'upcoming') {
      return (
        <>
          <ModalSummaryCard
            title="Upcoming Value"
            value={money(dashboardStats.expectedAmount)}
            subtitle={`${dashboardStats.upcomingDocumentCount.toLocaleString()} upcoming documents`}
            icon="🗓️"
            color="#f59e0b"
          />
          {renderRealizationViewFilter('upcoming')}
          {renderRealizationSearchBox('upcoming')}
          {renderSmartRealizationCards(dashboardStats.upcomingRows, 'upcoming')}
        </>
      );
    }

    if (activeModal === 'overdue') {
      return (
        <>
          <ModalSummaryCard
            title="Overdue Value"
            value={money(dashboardStats.overdueAmount)}
            subtitle={`${dashboardStats.overdueDocumentCount.toLocaleString()} overdue documents`}
            icon="⏰"
            color="#ef4444"
          />
          {renderRealizationViewFilter('overdue')}
          {renderRealizationSearchBox('overdue')}

          {renderSmartRealizationCards(dashboardStats.overdueRows, 'overdue')}
        </>
      );
    }

    if (activeModal === 'monthly') {
      return (
        <View style={styles.modalSectionCard}>
          <Text style={styles.modalSectionTitle}>
            Month-wise Realization Overview
          </Text>

          {monthlyData.map(item => {
            const total = item.realized + item.expected + item.overdue;
            const realizedWidth = `${Math.max(
              5,
              (item.realized / maxMonthlyAmount) * 100,
            )}%`;
            const expectedWidth = `${Math.max(
              5,
              (item.expected / maxMonthlyAmount) * 100,
            )}%`;
            const overdueWidth = `${Math.max(
              5,
              (item.overdue / maxMonthlyAmount) * 100,
            )}%`;

            return (
              <View key={item.month} style={styles.monthRow}>
                <View style={styles.monthNameBox}>
                  <Text style={styles.monthName}>{item.month}</Text>
                </View>

                <View style={styles.monthBarsArea}>
                  <View style={styles.monthBarLine}>
                    <View
                      style={[styles.monthBarRealized, {width: realizedWidth}]}
                    />
                    <Text style={styles.monthBarText}>
                      Realized {shortMoney(item.realized)}
                    </Text>
                  </View>

                  <View style={styles.monthBarLine}>
                    <View
                      style={[styles.monthBarExpected, {width: expectedWidth}]}
                    />
                    <Text style={styles.monthBarText}>
                      Expected {shortMoney(item.expected)}
                    </Text>
                  </View>

                  <View style={styles.monthBarLine}>
                    <View
                      style={[styles.monthBarOverdue, {width: overdueWidth}]}
                    />
                    <Text style={styles.monthBarText}>
                      Overdue {shortMoney(item.overdue)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.monthTotalText}>{shortMoney(total)}</Text>
              </View>
            );
          })}
        </View>
      );
    }

    if (activeModal === 'buyer') {
      return (
        <View style={styles.modalSectionCard}>
          <Text style={styles.modalSectionTitle}>
            Buyer-wise Realization Summary
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.buyerTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.buyerCol]}>
                  Buyer
                </Text>
                <Text style={[styles.tableHeaderText, styles.moneyCol]}>
                  Total
                </Text>
                <Text style={[styles.tableHeaderText, styles.moneyCol]}>
                  Realized
                </Text>
                <Text style={[styles.tableHeaderText, styles.moneyCol]}>
                  Expected
                </Text>
                <Text style={[styles.tableHeaderText, styles.moneyCol]}>
                  Overdue
                </Text>
                <Text style={[styles.tableHeaderText, styles.riskCol]}>
                  Risk
                </Text>
              </View>

              {buyerSummary.map((item, index) => {
                const riskStyle = getRiskStyle(item.risk);

                return (
                  <View
                    key={item.buyer}
                    style={[
                      styles.tableRow,
                      index % 2 === 0 && styles.tableRowAlt,
                    ]}>
                    <Text
                      style={[styles.tableCellText, styles.buyerCol]}
                      numberOfLines={1}>
                      {item.buyer}
                    </Text>
                    <Text style={[styles.tableCellText, styles.moneyCol]}>
                      {shortMoney(item.total)}
                    </Text>
                    <Text style={[styles.tableRealizedText, styles.moneyCol]}>
                      {shortMoney(item.realized)}
                    </Text>
                    <Text style={[styles.tableExpectedText, styles.moneyCol]}>
                      {shortMoney(item.expected)}
                    </Text>
                    <Text style={[styles.tableOverdueText, styles.moneyCol]}>
                      {shortMoney(item.overdue)}
                    </Text>
                    <View style={styles.riskCol}>
                      <View
                        style={[
                          styles.riskBadge,
                          {
                            backgroundColor: riskStyle.bg,
                            borderColor: riskStyle.border,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.riskBadgeText,
                            {color: riskStyle.color},
                          ]}>
                          {item.risk}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      );
    }

    if (activeModal === 'invoices') {
      return (
        <View style={styles.modalSectionCard}>
          <Text style={styles.modalSectionTitle}>
            Payment Realization Details
          </Text>
          {renderInvoiceRows(invoiceData)}
        </View>
      );
    }

    if (activeModal === 'invoiceDetails') {
      const invoice = selectedInvoice || invoiceData[0];

      return (
        <>
          <ModalSummaryCard
            title={invoice.invoiceNo}
            value={money(invoice.invoiceAmount)}
            subtitle={`${invoice.buyer} • ${invoice.status}`}
            icon="🧾"
            color="#8b5cf6"
          />

          <View style={styles.modalSectionCard}>
            <Text style={styles.modalSectionTitle}>Invoice Information</Text>
            <InfoRow label="Buyer" value={invoice.buyer} />
            <InfoRow label="Invoice No." value={invoice.invoiceNo} />
            <InfoRow label="Order No." value="PO-7801" />
            <InfoRow
              label="Invoice Amount"
              value={money(invoice.invoiceAmount)}
            />
            <InfoRow label="Currency" value="USD" />
          </View>

          <View style={styles.modalSectionCard}>
            <Text style={styles.modalSectionTitle}>
              Payment Term Information
            </Text>
            <InfoRow label="Payment Term" value={invoice.paymentTerm} />
            <InfoRow label="Collection From" value={invoice.collectionFrom} />
            <InfoRow label="Base Date" value={invoice.baseDate} />
            <InfoRow label="Expected Date" value={invoice.expectedDate} />
          </View>

          <View style={styles.modalSectionCard}>
            <Text style={styles.modalSectionTitle}>Collection Status</Text>
            <InfoRow label="Status" value={invoice.status} highlight />
            <InfoRow label="Days Status" value={invoice.daysStatus} danger />
            <InfoRow
              label="Pending Amount"
              value={money(invoice.pendingAmount)}
            />
            <InfoRow
              label="Overdue Amount"
              value={money(invoice.pendingAmount)}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.modalPrimaryBtn}>
              <Text style={styles.modalPrimaryBtnText}>Add Realization</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.modalSecondaryBtn}>
              <Text style={styles.modalSecondaryBtnText}>Mark Follow-up</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    return null;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Payment Realization Dashboard</Text>
          <Text style={styles.pageSubtitle}>
            Collection tracking by month and buyer
          </Text>
        </View>

        <View style={styles.updatedBox}>
          <Text style={styles.updatedLabel}>Last updated</Text>
          <Text style={styles.updatedText}>{dashboardStats.lastUpdated}</Text>
        </View>
      </View> */}

      {/* <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}>
        {[
          'Jan 2026 - Dec 2026',
          'All Buyers',
          'All Payment Terms',
          'All Status',
          'USD',
          'More Filters',
        ].map((filter, index) => (
          <TouchableOpacity
            key={filter}
            activeOpacity={0.85}
            style={[styles.filterChip, index === 0 && styles.filterChipActive]}>
            <Text
              style={[
                styles.filterChipText,
                index === 0 && styles.filterChipTextActive,
              ]}>
              {filter}
            </Text>
            <Text style={styles.filterChevron}>⌄</Text>
          </TouchableOpacity>
        ))}
      </ScrollView> */}

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.expectedFullCard}
        onPress={() => setActiveModal('expectedTotal')}>
        <View style={styles.expectedTopRow}>
          <View style={styles.expectedIconBox}>
            <Text style={styles.kpiIcon}>💼</Text>
          </View>

          <View style={styles.expectedContent}>
            <Text style={styles.expectedLabel}>Expected Value</Text>
            <Text style={styles.expectedValue}>
              {money(dashboardStats.totalAmount)}
            </Text>
            <Text style={styles.expectedSubText}>
              {dashboardStats.expectedDocumentCount.toLocaleString()} documents
              • Tap to view
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.realizedFullCard}
        onPress={() => setActiveModal('realized')}>
        <View style={styles.realizedTopRow}>
          <View style={styles.realizedIconBox}>
            <Text style={styles.kpiIcon}>📈</Text>
          </View>

          <View style={styles.realizedContent}>
            <Text style={styles.realizedLabel}>Realized Value</Text>
            <Text style={styles.realizedValue}>
              {money(dashboardStats.realizedAmount)}
            </Text>
            <Text style={styles.realizedSubText}>
              {dashboardStats.realizedDocumentCount.toLocaleString()} documents
              • Tap to view
            </Text>
          </View>

          <View style={styles.realizedPercentBadge}>
            <Text style={styles.realizedPercentText}>
              {dashboardStats.realizedPercent}%
            </Text>
          </View>
        </View>

        <View style={styles.realizedProgressTrack}>
          <View
            style={[
              styles.realizedProgressFill,
              {width: `${dashboardStats.realizedPercent}%`},
            ]}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.pendingFullCard}>
        <View style={styles.pendingHeaderRow}>
          <View>
            <Text style={styles.pendingTitle}>Pending</Text>
            <Text style={styles.pendingValue}>{money(pendingAmount)}</Text>
            <Text style={styles.pendingSubText}>
              Remaining amount from expected value
            </Text>
          </View>

          <View style={styles.pendingIconBox}>
            <Text style={styles.kpiIcon}>⏳</Text>
          </View>
        </View>

        <View style={styles.pendingMiniRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.pendingMiniCard, styles.upcomingMiniCard]}
            onPress={() => setActiveModal('upcoming')}>
            <View style={styles.miniIconBox}>
              <Text style={styles.miniIcon}>🗓️</Text>
            </View>

            <Text style={styles.pendingMiniLabel}>Upcoming</Text>
            <Text style={styles.upcomingMiniValue}>
              {money(dashboardStats.expectedAmount)}
            </Text>
            <Text style={styles.pendingMiniSub}>
              {dashboardStats.upcomingDocumentCount.toLocaleString()} documents
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.pendingMiniCard, styles.overdueMiniCard]}
            onPress={() => setActiveModal('overdue')}>
            <View style={styles.miniIconBox}>
              <Text style={styles.miniIcon}>⏰</Text>
            </View>

            <Text style={styles.pendingMiniLabel}>Overdue</Text>
            <Text style={styles.overdueMiniValue}>
              {money(dashboardStats.overdueAmount)}
            </Text>
            <Text style={styles.pendingMiniSub}>
              {dashboardStats.overdueDocumentCount.toLocaleString()} documents
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={activeModal !== null}
        transparent
        animationType="slide"
        onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {activeModal === 'expectedTotal'
                    ? 'Expected Amount Details'
                    : activeModal === 'overdue'
                    ? 'Overdue Details'
                    : activeModal === 'realized'
                    ? 'Realized Details'
                    : activeModal === 'upcoming'
                    ? 'Upcoming Details'
                    : activeModal === 'monthly'
                    ? 'Monthly Overview'
                    : activeModal === 'buyer'
                    ? 'Buyer Summary'
                    : activeModal === 'invoices'
                    ? 'Invoice Details'
                    : activeModal === 'invoiceDetails'
                    ? 'Invoice Information'
                    : 'Realization Details'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Payment realization information
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.modalCloseButton}
                onPress={closeModal}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}>
              {renderModalContent()}
              <View style={styles.modalBottomSpace} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {renderRealizationGroupDetailModal()}
    </ScrollView>
  );
};

const ModalSummaryCard = ({title, value, subtitle, icon, color}) => (
  <View style={[styles.modalSummaryCard, {borderColor: `${color}55`}]}>
    <View style={[styles.modalSummaryIcon, {backgroundColor: `${color}22`}]}>
      <Text style={styles.modalSummaryIconText}>{icon}</Text>
    </View>

    <View style={styles.modalSummaryInfo}>
      <Text style={styles.modalSummaryTitle}>{title}</Text>
      <Text style={[styles.modalSummaryValue, {color}]}>{value}</Text>
      <Text style={styles.modalSummarySub}>{subtitle}</Text>
    </View>
  </View>
);

const InfoRow = ({label, value, highlight, danger}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text
      style={[
        styles.infoValue,
        highlight && styles.infoHighlight,
        danger && styles.infoDanger,
      ]}
      numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b14',
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
  },
  pageSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
  },
  updatedBox: {
    alignItems: 'flex-end',
  },
  updatedLabel: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '700',
  },
  updatedText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },

  filterScroll: {
    marginBottom: 14,
  },
  filterChip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121a29',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#132238',
    borderColor: 'rgba(59,130,246,0.45)',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: '#dbeafe',
  },
  filterChevron: {
    color: '#64748b',
    fontSize: 12,
    marginLeft: 6,
  },

  expectedFullCard: {
    backgroundColor: '#0f2342',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.38)',
    marginBottom: 12,
    shadowColor: '#3b82f6',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  expectedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expectedIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expectedContent: {
    flex: 1,
  },
  expectedLabel: {
    color: '#bfdbfe',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  expectedValue: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    marginTop: 4,
  },
  expectedSubText: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 4,
  },

  realizedFullCard: {
    backgroundColor: '#0d2b23',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.34)',
    marginBottom: 12,
    shadowColor: '#10b981',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
  realizedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  realizedIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(16,185,129,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  realizedContent: {
    flex: 1,
  },
  realizedLabel: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  realizedValue: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    marginTop: 4,
  },
  realizedSubText: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 4,
  },
  realizedPercentBadge: {
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  realizedPercentText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '900',
  },
  realizedProgressTrack: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 14,
  },
  realizedProgressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 999,
  },

  pendingFullCard: {
    backgroundColor: '#101620',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.10)',
  },
  pendingTitle: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pendingValue: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    marginTop: 4,
  },
  pendingSubText: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 3,
  },
  pendingIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingMiniRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pendingMiniCard: {
    flex: 1,
    minHeight: 128,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  upcomingMiniCard: {
    backgroundColor: '#2d210f',
    borderColor: 'rgba(251,191,36,0.34)',
  },
  overdueMiniCard: {
    backgroundColor: '#2d1519',
    borderColor: 'rgba(248,113,113,0.34)',
  },
  miniIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  miniIcon: {
    fontSize: 16,
  },
  pendingMiniLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 5,
  },
  upcomingMiniValue: {
    color: '#fbbf24',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  overdueMiniValue: {
    color: '#f87171',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  pendingMiniSub: {
    color: '#94a3b8',
    fontSize: 9,
    marginTop: 5,
  },
  kpiIcon: {
    fontSize: 18,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  modalContainer: {
    width: '96%',
    maxHeight: '92%',
    backgroundColor: '#0b1220',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  modalHeader: {
    minHeight: 72,
    backgroundColor: '#111c35',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.14)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#fca5a5',
    fontSize: 15,
    fontWeight: '900',
  },
  modalBody: {
    padding: 14,
  },
  modalBottomSpace: {
    height: 22,
  },

  modalSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalSummaryIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalSummaryIconText: {
    fontSize: 22,
  },
  modalSummaryInfo: {
    flex: 1,
  },
  modalSummaryTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  modalSummaryValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  modalSummarySub: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 4,
  },
  modalSectionCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  modalSectionTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
  },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.10)',
    paddingVertical: 8,
  },
  monthNameBox: {
    width: 42,
    alignItems: 'center',
  },
  monthName: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '900',
  },
  monthBarsArea: {
    flex: 1,
    gap: 5,
  },
  monthBarLine: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 16,
  },
  monthBarRealized: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#10b981',
  },
  monthBarExpected: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#f59e0b',
  },
  monthBarOverdue: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#ef4444',
  },
  monthBarText: {
    color: '#94a3b8',
    fontSize: 9,
    marginLeft: 7,
    fontWeight: '700',
  },
  monthTotalText: {
    width: 42,
    textAlign: 'right',
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '900',
  },

  agingRowLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agingBigDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  agingInfo: {
    flex: 1,
  },
  agingLabelLarge: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
  },
  agingTrack: {
    height: 6,
    backgroundColor: '#243041',
    borderRadius: 999,
    overflow: 'hidden',
  },
  agingFill: {
    height: '100%',
    borderRadius: 999,
  },
  agingAmountLarge: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 10,
  },

  buyerTable: {
    minWidth: 610,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  tableHeader: {
    flexDirection: 'row',
    minHeight: 38,
    alignItems: 'center',
    backgroundColor: '#16213d',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 44,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.10)',
  },
  tableRowAlt: {
    backgroundColor: '#111c31',
  },
  tableHeaderText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
  },
  tableCellText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  tableRealizedText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
  },
  tableExpectedText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
  },
  tableOverdueText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
  },
  buyerCol: {
    width: 135,
  },
  moneyCol: {
    width: 85,
  },
  riskCol: {
    width: 100,
    justifyContent: 'center',
  },
  riskBadge: {
    alignSelf: 'flex-start',
    marginHorizontal: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },

  invoiceTable: {
    minWidth: 720,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  invoiceTableHeader: {
    flexDirection: 'row',
    minHeight: 42,
    backgroundColor: '#16213d',
    alignItems: 'center',
  },
  invoiceTableRow: {
    flexDirection: 'row',
    minHeight: 58,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.10)',
  },
  invoiceTableRowAlt: {
    backgroundColor: '#111c31',
  },
  invoiceHeaderText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
  },
  invoiceCellText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  invoiceCellStrong: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
  },
  invoiceDaysText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
  },
  invoiceDaysOverdue: {
    color: '#ef4444',
  },
  invoiceBuyerCol: {
    width: 130,
  },
  invoiceNoCol: {
    width: 95,
  },
  invoiceDateCol: {
    width: 110,
  },
  invoiceDaysCol: {
    width: 100,
  },
  invoiceAmountCol: {
    width: 95,
  },
  invoiceStatusCol: {
    width: 140,
    justifyContent: 'center',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginHorizontal: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },

  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 120,
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  infoValue: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '800',
  },
  infoHighlight: {
    color: '#a78bfa',
  },
  infoDanger: {
    color: '#ef4444',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  modalPrimaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  modalSecondaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  modalSecondaryBtnText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '900',
  },

  emptyModalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    padding: 18,
    alignItems: 'center',
  },
  emptyModalText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  realizationMonthTable: {
    minWidth: 520,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  realizationMonthHeader: {
    flexDirection: 'row',
    minHeight: 40,
    alignItems: 'center',
    backgroundColor: '#16213d',
  },
  realizationMonthRow: {
    flexDirection: 'row',
    minHeight: 48,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.10)',
  },
  realizationMonthRowAlt: {
    backgroundColor: '#111c31',
  },
  realizationMonthHeaderText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
  },
  realizationMonthCell: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
  },
  realizationMonthCellStrong: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
  },
  realizationMonthCellValue: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
  },
  realizationMonthCol: {
    width: 120,
  },
  realizationDocsCol: {
    width: 105,
  },
  realizationPcsCol: {
    width: 120,
  },
  realizationValueCol: {
    width: 150,
  },


  realizationSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  realizationSearchBox: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    paddingHorizontal: 12,
  },
  realizationSearchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  realizationSearchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    padding: 0,
  },
  realizationSearchClearBtn: {
    minHeight: 42,
    justifyContent: 'center',
    backgroundColor: 'rgba(236,72,153,0.14)',
    borderRadius: 12,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.28)',
  },
  realizationSearchClearText: {
    color: '#f472b6',
    fontSize: 10,
    fontWeight: '900',
  },

  realizationFilterWrap: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    marginBottom: 12,
    gap: 4,
  },
  realizationFilterButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  realizationFilterButtonActive: {
    backgroundColor: '#2563eb',
  },
  realizationFilterText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  realizationFilterTextActive: {
    color: '#ffffff',
  },
  smartCardSubInfo: {
    color: '#94a3b8',
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  smartCardEntityLabel: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 3,
    marginBottom: 1,
  },

  smartCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 10,
  },
  smartRealizationCard: {
    width: '100%',
    minHeight: 112,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  smartCardGlow: {
    position: 'absolute',
    top: -24,
    right: -24,
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  smartCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  smartCardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  smartCardIcon: {
    fontSize: 15,
  },
  smartCardTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  smartCardLabel: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  smartCardMonth: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  smartCardBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  smartCardBadgeText: {
    fontSize: 7,
    fontWeight: '900',
  },
  smartCardValue: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    marginBottom: 8,
  },
  smartMetricRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  smartMetricBox: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  smartMetricValue: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 3,
  },
  smartMetricLabel: {
    color: '#94a3b8',
    fontSize: 7,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  smartProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smartProgressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#243041',
    borderRadius: 999,
    overflow: 'hidden',
  },
  smartProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  smartProgressText: {
    width: 30,
    textAlign: 'right',
    color: '#cbd5e1',
    fontSize: 8,
    fontWeight: '900',
  },

  smartRealizationCardClickable: {
    borderColor: 'rgba(59,130,246,0.24)',
  },
  smartCardTapHint: {
    color: '#60a5fa',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'right',
  },
  groupDetailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  groupDetailModal: {
    width: '96%',
    maxHeight: '86%',
    backgroundColor: '#0b1220',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  groupDetailHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111c35',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.14)',
  },
  groupDetailTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  groupDetailTitle: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  groupDetailSubtitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
  groupDetailCodeText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 3,
  },
  groupDetailCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239,68,68,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupDetailCloseText: {
    color: '#fca5a5',
    fontSize: 15,
    fontWeight: '900',
  },
  groupDetailSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  groupDetailSummaryBox: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  groupDetailSummaryValue: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
  },
  groupDetailSummaryLabel: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  groupDetailSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  groupDetailSearchBox: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    paddingHorizontal: 12,
  },
  groupDetailSearchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    padding: 0,
  },
  groupDetailSearchClearBtn: {
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: 'rgba(236,72,153,0.14)',
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.28)',
  },
  groupDetailNoDataRow: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },

  groupDetailTable: {
    width: '78%',
    alignSelf: 'center',
    marginBottom: 14,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    overflow: 'hidden',
  },
  groupDetailTableHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16213d',
  },
  groupDetailTableBody: {
    maxHeight: 320,
  },
  groupDetailTableRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.10)',
  },
  groupDetailTableRowAlt: {
    backgroundColor: '#111c31',
  },
  groupDetailHeaderText: {
    color: '#cbd5e1',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    paddingHorizontal: 6,
  },
  groupDetailMonthText: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    paddingHorizontal: 6,
  },
  groupDetailCellText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
  },
  groupDetailValueText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 6,
  },
  groupDetailMonthCol: {
    width: 120,
  },
  groupDetailDocsCol: {
    flex: 0.65,
    textAlign: 'center',
  },
  groupDetailPcsCol: {
    flex: 0.75,
    textAlign: 'center',
  },
  groupDetailValueCol: {
    width: 100,
    textAlign: 'right',
  },

  realizedMonthOnlyTable: {
    minWidth: 430,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  realizedMonthOnlyHeader: {
    flexDirection: 'row',
    minHeight: 42,
    alignItems: 'center',
    backgroundColor: '#123224',
  },
  realizedMonthOnlyRow: {
    flexDirection: 'row',
    minHeight: 50,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.10)',
  },
  realizedMonthOnlyRowAlt: {
    backgroundColor: '#111c31',
  },
  realizedMonthOnlyHeaderText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
  },
  realizedMonthOnlyCell: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
  },
  realizedMonthOnlyCellStrong: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
  },
  realizedMonthOnlyValueText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
  },
  realizedMonthOnlyMonthCol: {
    width: 140,
  },
  realizedMonthOnlyDocsCol: {
    width: 120,
  },
  realizedMonthOnlyValueCol: {
    width: 170,
  },
});

export default RealizationScreen;