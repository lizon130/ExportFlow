// src/screens/BLScreen.js
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.9.45:7000';

const BLScreen = ({userData} = {}) => {
  const [refreshing, setRefreshing] = useState(false);

  const [blSummaryData, setBlSummaryData] = useState([]);
  const [filteredBlData, setFilteredBlData] = useState([]);
  const [blLoading, setBlLoading] = useState(false);
  const [blCurrentPage, setBlCurrentPage] = useState(1);
  const [blItemsPerPage, setBlItemsPerPage] = useState(20);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalExportData, setModalExportData] = useState([]);
  const [modalFilteredData, setModalFilteredData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDepartmentName, setModalDepartmentName] = useState('');
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(20);
  const [modalSearchText, setModalSearchText] = useState('');

  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [tempDay, setTempDay] = useState('');
  const [tempMonth, setTempMonth] = useState('');
  const [tempYear, setTempYear] = useState('');
  const [pickerType, setPickerType] = useState('from');

  const days = Array.from({length: 31}, (_, i) =>
    String(i + 1).padStart(2, '0'),
  );
  const months = Array.from({length: 12}, (_, i) =>
    String(i + 1).padStart(2, '0'),
  );
  const years = Array.from({length: 11}, (_, i) => String(2020 + i));

  useEffect(() => {
    fetchBlSummary();
  }, []);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(modalFilteredData.length / modalItemsPerPage),
    );
    if (modalCurrentPage > totalPages) {
      setModalCurrentPage(totalPages);
    }
  }, [modalFilteredData, modalItemsPerPage, modalCurrentPage]);

  const normalizeArray = data => {
    if (Array.isArray(data)) return data;

    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.items)) return data.items;

    if (data && typeof data === 'object') return [data];
    return [];
  };

  const normalizeText = value => String(value ?? '').trim().toLowerCase();

  const getNumber = value => {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const getStoredJsonValue = async key => {
    try {
      const rawValue = await AsyncStorage.getItem(key);

      if (!rawValue) {
        return null;
      }

      try {
        return JSON.parse(rawValue);
      } catch {
        return rawValue;
      }
    } catch (error) {
      console.error(`Error reading ${key} from AsyncStorage:`, error);
      return null;
    }
  };

  const getNestedValue = (data, fieldNames = []) => {
    if (!data || typeof data !== 'object') {
      return null;
    }

    for (const fieldName of fieldNames) {
      if (data?.[fieldName] !== undefined && data?.[fieldName] !== null) {
        return data[fieldName];
      }
    }

    return null;
  };

  const getAccessTokenFromPayload = payload => {
    if (!payload || typeof payload !== 'object') {
      return '';
    }

    return (
      payload?.accessToken ||
      payload?.token ||
      payload?.access_token ||
      payload?.jwtToken ||
      payload?.data?.accessToken ||
      payload?.data?.token ||
      payload?.user?.accessToken ||
      payload?.profile?.accessToken ||
      ''
    );
  };

  const getUserIdFromPayload = payload => {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    return (
      payload?.recId ||
      payload?.userId ||
      payload?.id ||
      payload?.userRecId ||
      payload?.profile?.recId ||
      payload?.profile?.userId ||
      payload?.user?.recId ||
      payload?.user?.userId ||
      payload?.data?.recId ||
      payload?.data?.userId ||
      payload?.data?.user?.recId ||
      payload?.data?.user?.userId ||
      null
    );
  };

  const getProfileObjectFromPayload = payload => {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    return (
      payload?.profile ||
      payload?.userProfile ||
      payload?.user ||
      payload?.data?.profile ||
      payload?.data?.user ||
      payload?.data ||
      payload
    );
  };

  const getAuthHeaders = payload => {
    const token = getAccessTokenFromPayload(payload || userData);

    return token
      ? {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      : {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        };
  };

  const getStoredUserPayload = async () => {
    if (userData) {
      return userData;
    }

    const storageKeys = [
      'userData',
      'userInfo',
      'user',
      'authUser',
      'loginUser',
      'loggedInUser',
      'currentUser',
      'profile',
      'userProfile',
    ];

    for (const key of storageKeys) {
      const storedValue = await getStoredJsonValue(key);

      if (storedValue) {
        return storedValue;
      }
    }

    return null;
  };

  const fetchLoggedInUserProfile = async () => {
    const storedPayload = await getStoredUserPayload();
    const profileFromPayload = getProfileObjectFromPayload(storedPayload);
    const existingDepartments = normalizeArray(
      profileFromPayload?.departments || profileFromPayload?.department,
    );

    if (existingDepartments.length) {
      return {profile: profileFromPayload, authPayload: storedPayload};
    }

    const userId = getUserIdFromPayload(storedPayload);

    if (!userId) {
      console.warn('B/L department access: logged-in user id not found');
      return {profile: profileFromPayload || {}, authPayload: storedPayload};
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/User/${userId}/profile`, {
        method: 'GET',
        headers: getAuthHeaders(storedPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const profile = await response.json();
      return {profile, authPayload: storedPayload};
    } catch (error) {
      console.error('Error fetching logged-in user profile:', error);
      return {profile: profileFromPayload || {}, authPayload: storedPayload};
    }
  };

  const getUserRoles = profile =>
    normalizeArray(profile?.roles || profile?.role || profile?.user?.roles || []);

  const userCanSeeAllDepartments = profile => {
    const assignedDepartments = getAssignedDepartments(profile);

    // If the user has assigned departments, always restrict by those departments.
    // Example: Super-Admin Sazzad has LPP assigned, so only LPP should show.
    if (assignedDepartments.length) {
      return false;
    }

    const roleText = getUserRoles(profile)
      .map(role => normalizeText(role?.roleName || role?.name || role))
      .join(' ');

    return (
      roleText.includes('super-admin') ||
      roleText.includes('super admin') ||
      roleText.includes('superadmin') ||
      roleText.includes('admin')
    );
  };

  const getAssignedDepartments = profile =>
    normalizeArray(
      profile?.departments ||
        profile?.department ||
        profile?.profile?.departments ||
        profile?.user?.departments ||
        [],
    );

  const pushUniqueQueryValue = (values, value) => {
    const textValue = String(value || '').trim();

    if (
      textValue &&
      !values.some(item => normalizeText(item) === normalizeText(textValue))
    ) {
      values.push(textValue);
    }
  };

  const getDepartmentQueryValues = departments => {
    const queryValues = [];

    normalizeArray(departments).forEach(department => {
      pushUniqueQueryValue(queryValues, department?.departmentCode);
      pushUniqueQueryValue(queryValues, department?.deptCode);
      pushUniqueQueryValue(queryValues, department?.depCode);
      pushUniqueQueryValue(queryValues, department?.departmentName);
      pushUniqueQueryValue(queryValues, department?.deptName);
      pushUniqueQueryValue(queryValues, department?.depName);
      pushUniqueQueryValue(queryValues, department?.name);
    });

    return queryValues;
  };

  const getDepartmentQueryValuesFromRow = item => {
    const queryValues = [];

    pushUniqueQueryValue(queryValues, item?.departmentCode);
    pushUniqueQueryValue(queryValues, item?.deptCode);
    pushUniqueQueryValue(queryValues, item?.depCode);
    pushUniqueQueryValue(queryValues, item?.departmentName);
    pushUniqueQueryValue(queryValues, item?.deptName);
    pushUniqueQueryValue(queryValues, item?.depName);

    return queryValues;
  };

  const buildDepartmentAccess = profile => {
    const assignedDepartments = getAssignedDepartments(profile);

    if (assignedDepartments.length) {
      return {
        isRestricted: true,
        departments: assignedDepartments,
        queryValues: getDepartmentQueryValues(assignedDepartments),
      };
    }

    if (userCanSeeAllDepartments(profile)) {
      return {isRestricted: false, departments: [], queryValues: ['']};
    }

    return {isRestricted: true, departments: [], queryValues: []};
  };

  const rowMatchesDepartmentAccess = (row, access) => {
    if (!access?.isRestricted) {
      return true;
    }

    if (!access?.departments?.length) {
      return false;
    }

    const rowDepartmentCode = normalizeText(
      row?.departmentCode || row?.deptCode || row?.depCode,
    );
    const rowDepartmentName = normalizeText(
      row?.departmentName || row?.deptName || row?.depName,
    );

    // If backend already filtered by depName and row has no department fields, keep it.
    if (!rowDepartmentCode && !rowDepartmentName) {
      return true;
    }

    return access.departments.some(department => {
      const allowedCodes = [
        department?.departmentCode,
        department?.deptCode,
        department?.depCode,
      ].map(normalizeText);
      const allowedNames = [
        department?.departmentName,
        department?.deptName,
        department?.depName,
        department?.name,
      ].map(normalizeText);
      const allowedValues = [...allowedCodes, ...allowedNames].filter(Boolean);

      return (
        allowedValues.includes(rowDepartmentCode) ||
        allowedValues.includes(rowDepartmentName)
      );
    });
  };

  const getBlSummaryUrl = deptName => {
    const query = String(deptName || '').trim();

    return query
      ? `${API_BASE_URL}/api/Export/Get-Pending-BL-Date-Count?depName=${encodeURIComponent(
          query,
        )}`
      : `${API_BASE_URL}/api/Export/Get-Pending-BL-Date-Count`;
  };

  const getUniqueBlSummaryKey = (item, index) => {
    const keyValue = [
      item?.departmentCode,
      item?.departmentName,
      item?.customerCode,
      item?.customerName,
    ]
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .join('|');

    return normalizeText(keyValue) || `row-${index}`;
  };

  const mergeBlSummaryRows = rows => {
    const rowMap = {};

    normalizeArray(rows).forEach((row, index) => {
      const key = getUniqueBlSummaryKey(row, index);
      const pendingCount = getNumber(row?.pendingBLDateCount || row?.pendingBL);
      const totalValue = getNumber(row?.totalValue);

      if (!rowMap[key]) {
        rowMap[key] = {...row};
        return;
      }

      rowMap[key] = {
        ...rowMap[key],
        ...row,
        pendingBLDateCount: Math.max(
          getNumber(rowMap[key]?.pendingBLDateCount || rowMap[key]?.pendingBL),
          pendingCount,
        ),
        pendingBL: Math.max(
          getNumber(rowMap[key]?.pendingBLDateCount || rowMap[key]?.pendingBL),
          pendingCount,
        ),
        totalValue: Math.max(getNumber(rowMap[key]?.totalValue), totalValue),
      };
    });

    return Object.values(rowMap);
  };

  const getUniqueBlDetailKey = (item, index) => {
    const keyValue =
      item?.expDocumentNo ||
      item?.exportDocumentNo ||
      item?.packagingListNo ||
      item?.recId ||
      item?.id ||
      '';

    return normalizeText(keyValue) || `row-${index}`;
  };

  const removeDuplicateBlDetails = rows => {
    const seenKeys = {};

    return normalizeArray(rows).filter((item, index) => {
      const key = getUniqueBlDetailKey(item, index);

      if (seenKeys[key]) {
        return false;
      }

      seenKeys[key] = true;
      return true;
    });
  };

  const getBlListUrl = (
    deptCode = '',
    selectedFromDate = '',
    selectedToDate = '',
  ) => {
    const params = [
      `depName=${encodeURIComponent(deptCode || '')}`,
      `fromDate=${encodeURIComponent(selectedFromDate || '')}`,
      `toDate=${encodeURIComponent(selectedToDate || '')}`,
    ];

    return `${API_BASE_URL}/api/Export/Get-By-Dept-Bl-Date-List?${params.join(
      '&',
    )}`;
  };

  const fetchBlSummary = async () => {
    setBlLoading(true);

    try {
      const {profile, authPayload} = await fetchLoggedInUserProfile();
      const access = buildDepartmentAccess(profile);
      const queryValues = access.isRestricted ? access.queryValues : [''];

      if (access.isRestricted && !queryValues.length) {
        setBlSummaryData([]);
        setFilteredBlData([]);
        setBlCurrentPage(1);
        return;
      }

      let mergedRows = [];

      for (const queryValue of queryValues) {
        const response = await fetch(getBlSummaryUrl(queryValue), {
          method: 'GET',
          headers: getAuthHeaders(authPayload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const dataArray = normalizeArray(data).filter(item =>
          rowMatchesDepartmentAccess(item, access),
        );

        mergedRows = [...mergedRows, ...dataArray];
      }

      // If code and name both return the same department, keep only one row.
      const dataArray = mergeBlSummaryRows(mergedRows);

      // New API returns department-wise B/L pending rows.
      // Show one card per assigned department where pendingBLDateCount > 0.
      const pendingBlDepartments = dataArray
        .filter(item => getNumber(item?.pendingBLDateCount || item?.pendingBL) > 0)
        .map(item => ({
          ...item,

          // IMPORTANT: map new API field to old UI field
          pendingBL: getNumber(item?.pendingBLDateCount || item?.pendingBL),

          customerName: item?.customerName || item?.departmentName || 'Unknown',
          departmentName: item?.departmentName || item?.departmentCode || '-',
          departmentCode: item?.departmentCode || '',
          totalValue: getNumber(item?.totalValue),
        }))
        .sort((a, b) => (b?.pendingBL || 0) - (a?.pendingBL || 0));

      setBlSummaryData(pendingBlDepartments);
      setFilteredBlData(pendingBlDepartments);
      setBlCurrentPage(1);
    } catch (error) {
      console.error('Error fetching B/L pending summary:', error);
      setBlSummaryData([]);
      setFilteredBlData([]);
      setBlCurrentPage(1);
    } finally {
      setBlLoading(false);
    }
  };

  const parseDateString = dateStr => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    return new Date(parts[2], parts[1] - 1, parts[0]);
  };

  const getDateOnly = date => {
    if (!date || Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const filterBySelectedDates = data => {
    if (!Array.isArray(data)) return [];

    const fromDateObj = getDateOnly(parseDateString(fromDate));
    const toDateObj = getDateOnly(parseDateString(toDate));

    if (!fromDateObj && !toDateObj) return data;

    return data.filter(item => {
      if (!item?.exFacDate) return false;
      const itemDate = getDateOnly(new Date(item.exFacDate));
      if (!itemDate) return false;
      if (fromDateObj && itemDate < fromDateObj) return false;
      if (toDateObj && itemDate > toDateObj) return false;
      return true;
    });
  };

  const filterDataBySearch = (data, text) => {
    if (!text || !Array.isArray(data)) return data;

    const searchLower = text.toLowerCase();

    return data.filter(
      item =>
        item.expDocumentNo?.toString().toLowerCase().includes(searchLower) ||
        item.customerName?.toLowerCase().includes(searchLower) ||
        item.departmentName?.toLowerCase().includes(searchLower) ||
        item.noOfPcs?.toString().toLowerCase().includes(searchLower) ||
        item.totalValue?.toString().toLowerCase().includes(searchLower),
    );
  };

  const fetchModalExportData = async item => {
    const deptQueries = getDepartmentQueryValuesFromRow(item);
    const deptName =
      item?.customerName && item?.departmentName
        ? `${item.customerName} • ${item.departmentName}`
        : getDisplayName(item);

    setModalLoading(true);
    setModalSearchText('');
    setModalCurrentPage(1);
    setModalDepartmentName(deptName);
    setShowDetailsModal(true);

    try {
      const {profile, authPayload} = await fetchLoggedInUserProfile();
      const access = buildDepartmentAccess(profile);
      const queryValues = deptQueries.length
        ? deptQueries
        : access.isRestricted
        ? access.queryValues
        : [''];

      if (access.isRestricted && !queryValues.length) {
        setModalExportData([]);
        setModalFilteredData([]);
        return;
      }

      let mergedRows = [];

      for (const queryValue of queryValues) {
        const response = await fetch(getBlListUrl(queryValue, fromDate, toDate), {
          method: 'GET',
          headers: getAuthHeaders(authPayload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const dataArray = normalizeArray(data).filter(row =>
          rowMatchesDepartmentAccess(row, access),
        );

        mergedRows = [...mergedRows, ...dataArray];
      }

      const uniqueRows = removeDuplicateBlDetails(mergedRows);
      const dateFilteredArray = filterBySelectedDates(uniqueRows);

      setModalExportData(dateFilteredArray);
      setModalFilteredData(dateFilteredArray);
    } catch (error) {
      console.error('Fetch B/L modal error:', error);
      setModalExportData([]);
      setModalFilteredData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalSearch = text => {
    setModalSearchText(text);
    setModalCurrentPage(1);
    setModalFilteredData(filterDataBySearch(modalExportData, text));
  };

  const openDatePicker = (type, currentDate) => {
    setPickerType(type);

    if (currentDate) {
      const parts = currentDate.split('-');
      setTempDay(parts[0] || '');
      setTempMonth(parts[1] || '');
      setTempYear(parts[2] || '');
    } else {
      setTempDay('');
      setTempMonth('');
      setTempYear('');
    }

    type === 'from' ? setShowFromDatePicker(true) : setShowToDatePicker(true);
  };

  const confirmDate = () => {
    if (!tempDay || !tempMonth || !tempYear) return;

    const formattedDate = `${tempDay}-${tempMonth}-${tempYear}`;

    if (pickerType === 'from') {
      setFromDate(formattedDate);
      setShowFromDatePicker(false);
    } else {
      setToDate(formattedDate);
      setShowToDatePicker(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBlSummary().finally(() => setRefreshing(false));
  };

  const blSafeFilteredData = Array.isArray(filteredBlData)
    ? filteredBlData
    : [];
  const blTotalPages = Math.ceil(blSafeFilteredData.length / blItemsPerPage);
  const blCurrentPageData = blSafeFilteredData.slice(
    (blCurrentPage - 1) * blItemsPerPage,
    blCurrentPage * blItemsPerPage,
  );

  const modalSafeFilteredData = Array.isArray(modalFilteredData)
    ? modalFilteredData
    : [];
  const modalTotalPages = Math.max(
    1,
    Math.ceil(modalSafeFilteredData.length / modalItemsPerPage),
  );
  const modalCurrentPageData = modalSafeFilteredData.slice(
    (modalCurrentPage - 1) * modalItemsPerPage,
    modalCurrentPage * modalItemsPerPage,
  );

  const totalPendingBl = blSafeFilteredData.reduce(
    (sum, item) => sum + (item.pendingBL || 0),
    0,
  );
  const totalDepartmentCount = blSafeFilteredData.length;

  const maxPending =
    blSafeFilteredData.length > 0
      ? Math.max(...blSafeFilteredData.map(item => item?.pendingBL || 0))
      : 0;
  const sortedPendingData = [...blSafeFilteredData].sort(
    (a, b) => (b?.pendingBL || 0) - (a?.pendingBL || 0),
  );
  const highestPendingItem = sortedPendingData[0] || null;
  const lowestPendingItem = sortedPendingData.length
    ? sortedPendingData[sortedPendingData.length - 1]
    : null;

  const cardAccentColors = [
    '#8b5cf6',
    '#f59e0b',
    '#06b6d4',
    '#3b82f6',
    '#ec4899',
    '#22c55e',
    '#ef4444',
    '#14b8a6',
  ];
  const cardSoftColors = [
    'rgba(139,92,246,0.18)',
    'rgba(245,158,11,0.18)',
    'rgba(6,182,212,0.18)',
    'rgba(59,130,246,0.18)',
    'rgba(236,72,153,0.18)',
    'rgba(34,197,94,0.18)',
    'rgba(239,68,68,0.18)',
    'rgba(20,184,166,0.18)',
  ];
  const cardIcons = ['🚢', '📦', '🏬', '📄', '🛒', '🏭', '🧾', '⚓'];

  const getDisplayName = item =>
    item?.customerName || item?.departmentName || 'Unknown';
  const getDepartmentSubText = item =>
    item?.departmentName || item?.departmentCode || '-';

  const getPendingPercentage = pending => {
    if (!maxPending || maxPending <= 0) return 0;
    return Math.min(100, Math.round((pending / maxPending) * 100));
  };

  const getProgressWidth = pending => {
    const percentage = getPendingPercentage(pending);
    if (percentage === 0) return '8%';
    return `${Math.max(8, percentage)}%`;
  };

  const getStatusMeta = pending => {
    const percentage = getPendingPercentage(pending);

    if (percentage >= 70) {
      return {
        label: 'High',
        textColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.14)',
        borderColor: 'rgba(239,68,68,0.42)',
      };
    }

    if (percentage >= 40) {
      return {
        label: 'Medium',
        textColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.14)',
        borderColor: 'rgba(245,158,11,0.42)',
      };
    }

    return {
      label: 'Low',
      textColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.14)',
      borderColor: 'rgba(16,185,129,0.42)',
    };
  };

  const getPageNumbers = (currentPage, totalPages) => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
    return pageNumbers;
  };

  const renderBlPagination = () => {
    if (blTotalPages <= 1) return null;

    const pageNumbers = getPageNumbers(blCurrentPage, blTotalPages);
    const startItem = (blCurrentPage - 1) * blItemsPerPage + 1;
    const endItem = Math.min(
      blCurrentPage * blItemsPerPage,
      blSafeFilteredData.length,
    );

    return (
      <View style={styles.buyerPaginationContainer}>
        <Text style={styles.buyerPaginationInfoText}>
          {startItem}-{endItem} of {blSafeFilteredData.length}
        </Text>
        <View style={styles.buyerPaginationControls}>
          <TouchableOpacity
            style={[
              styles.buyerPaginationButton,
              blCurrentPage === 1 && styles.buyerPaginationButtonDisabled,
            ]}
            onPress={() => setBlCurrentPage(page => Math.max(1, page - 1))}
            disabled={blCurrentPage === 1}>
            <Text style={styles.buyerPaginationButtonText}>◀</Text>
          </TouchableOpacity>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.buyerPageNumbersScroll}>
            {pageNumbers.map(pageNum => (
              <TouchableOpacity
                key={pageNum}
                style={[
                  styles.buyerPageNumberButton,
                  blCurrentPage === pageNum &&
                    styles.buyerPageNumberButtonActive,
                ]}
                onPress={() => setBlCurrentPage(pageNum)}>
                <Text
                  style={[
                    styles.buyerPageNumberText,
                    blCurrentPage === pageNum &&
                      styles.buyerPageNumberTextActive,
                  ]}>
                  {pageNum}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[
              styles.buyerPaginationButton,
              blCurrentPage === blTotalPages &&
                styles.buyerPaginationButtonDisabled,
            ]}
            onPress={() =>
              setBlCurrentPage(page => Math.min(blTotalPages, page + 1))
            }
            disabled={blCurrentPage === blTotalPages}>
            <Text style={styles.buyerPaginationButtonText}>▶</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.buyerItemsPerPageSelector}
          onPress={() => {
            const newItemsPerPage =
              blItemsPerPage === 20 ? 50 : blItemsPerPage === 50 ? 100 : 20;
            setBlItemsPerPage(newItemsPerPage);
            setBlCurrentPage(1);
          }}>
          <Text style={styles.buyerItemsPerPageText}>{blItemsPerPage}</Text>
          <Text style={styles.buyerItemsPerPageIcon}>▼</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderModalPagination = () => {
    if (modalSafeFilteredData.length <= modalItemsPerPage) return null;

    const pageNumbers = getPageNumbers(modalCurrentPage, modalTotalPages);
    const startItem = (modalCurrentPage - 1) * modalItemsPerPage + 1;
    const endItem = Math.min(
      modalCurrentPage * modalItemsPerPage,
      modalSafeFilteredData.length,
    );

    return (
      <View style={styles.paginationContainer}>
        <Text style={styles.paginationInfoText}>
          Showing {startItem} - {endItem} of {modalSafeFilteredData.length}{' '}
          records
        </Text>
        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              modalCurrentPage === 1 && styles.paginationButtonDisabled,
            ]}
            onPress={() => setModalCurrentPage(page => Math.max(1, page - 1))}
            disabled={modalCurrentPage === 1}>
            <Text
              style={[
                styles.paginationButtonText,
                modalCurrentPage === 1 && styles.paginationButtonTextDisabled,
              ]}>
              Previous
            </Text>
          </TouchableOpacity>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pageNumbersScroll}>
            {pageNumbers.map(pageNum => (
              <TouchableOpacity
                key={pageNum}
                style={[
                  styles.pageNumberButton,
                  modalCurrentPage === pageNum && styles.pageNumberButtonActive,
                ]}
                onPress={() => setModalCurrentPage(pageNum)}>
                <Text
                  style={[
                    styles.pageNumberText,
                    modalCurrentPage === pageNum && styles.pageNumberTextActive,
                  ]}>
                  {pageNum}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              modalCurrentPage === modalTotalPages &&
                styles.paginationButtonDisabled,
            ]}
            onPress={() =>
              setModalCurrentPage(page => Math.min(modalTotalPages, page + 1))
            }
            disabled={modalCurrentPage === modalTotalPages}>
            <Text
              style={[
                styles.paginationButtonText,
                modalCurrentPage === modalTotalPages &&
                  styles.paginationButtonTextDisabled,
              ]}>
              Next
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.itemsPerPageContainer}>
          <Text style={styles.itemsPerPageLabel}>Rows per page:</Text>
          <TouchableOpacity
            style={styles.itemsPerPageSelector}
            onPress={() => {
              const newItemsPerPage =
                modalItemsPerPage === 20
                  ? 50
                  : modalItemsPerPage === 50
                  ? 100
                  : 20;
              setModalItemsPerPage(newItemsPerPage);
              setModalCurrentPage(1);
            }}>
            <Text style={styles.itemsPerPageText}>{modalItemsPerPage}</Text>
            <Text style={styles.itemsPerPageIcon}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDatePicker = (visible, onClose, title) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerModal}>
          <Text style={styles.datePickerTitle}>{title}</Text>
          <View style={styles.datePickerColumns}>
            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerLabel}>Day</Text>
              <ScrollView
                style={styles.datePickerScroll}
                showsVerticalScrollIndicator={false}>
                {days.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.datePickerItem,
                      tempDay === day && styles.datePickerItemSelected,
                    ]}
                    onPress={() => setTempDay(day)}>
                    <Text
                      style={[
                        styles.datePickerItemText,
                        tempDay === day && styles.datePickerItemTextSelected,
                      ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerLabel}>Month</Text>
              <ScrollView
                style={styles.datePickerScroll}
                showsVerticalScrollIndicator={false}>
                {months.map(month => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.datePickerItem,
                      tempMonth === month && styles.datePickerItemSelected,
                    ]}
                    onPress={() => setTempMonth(month)}>
                    <Text
                      style={[
                        styles.datePickerItemText,
                        tempMonth === month &&
                          styles.datePickerItemTextSelected,
                      ]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.datePickerColumn}>
              <Text style={styles.datePickerLabel}>Year</Text>
              <ScrollView
                style={styles.datePickerScroll}
                showsVerticalScrollIndicator={false}>
                {years.map(year => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.datePickerItem,
                      tempYear === year && styles.datePickerItemSelected,
                    ]}
                    onPress={() => setTempYear(year)}>
                    <Text
                      style={[
                        styles.datePickerItemText,
                        tempYear === year && styles.datePickerItemTextSelected,
                      ]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={styles.datePickerButtons}>
            <TouchableOpacity style={styles.datePickerCancel} onPress={onClose}>
              <Text style={styles.datePickerCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.datePickerConfirm}
              onPress={confirmDate}>
              <Text style={styles.datePickerConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetailsModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.detailsModalContainer}>
          <View style={styles.detailsModalHeader}>
            <View style={styles.detailsHeaderLeft}>
              <View style={styles.detailsModalIconBox}>
                <Text style={styles.detailsModalIcon}>🚢</Text>
              </View>
              <View style={styles.detailsTitleWrap}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {modalDepartmentName}
                </Text>
                <Text style={styles.modalSubTitle} numberOfLines={1}>
                  {fromDate || toDate
                    ? `${fromDate || 'Start'} → ${toDate || 'Today'}`
                    : 'All B/L records'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.modalCloseCircle}
              onPress={() => setShowDetailsModal(false)}>
              <Text style={styles.modalCloseBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalStatsRow}>
            <View style={styles.modalStatChip}>
              <Text style={styles.modalStatValue}>
                {modalSafeFilteredData.length}
              </Text>
              <Text style={styles.modalStatLabel}>Records</Text>
            </View>
            <View style={styles.modalDateChip}>
              <Text style={styles.modalDateChipText} numberOfLines={1}>
                {fromDate || toDate
                  ? `${fromDate || 'Start'} - ${toDate || 'Today'}`
                  : 'No date filter'}
              </Text>
            </View>
          </View>

          {modalSafeFilteredData.length > 0 && (
            <View style={styles.modalSearchContainer}>
              <View style={styles.modalSearchBox}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search export no, customer, department..."
                  placeholderTextColor="#64748b"
                  value={modalSearchText}
                  onChangeText={handleModalSearch}
                />
              </View>
              {modalSearchText !== '' && (
                <TouchableOpacity
                  style={styles.modalClearButton}
                  onPress={() => {
                    setModalSearchText('');
                    setModalFilteredData(modalExportData);
                    setModalCurrentPage(1);
                  }}>
                  <Text style={styles.modalClearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {modalLoading ? (
            <View style={styles.modalLoaderCard}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loaderText}>Loading B/L records...</Text>
            </View>
          ) : modalCurrentPageData.length > 0 ? (
            <View style={styles.modalBodyContent}>
              <View style={styles.compactTableShell}>
                <View style={styles.compactTableHeader}>
                  <View
                    style={[styles.compactHeaderCell, styles.compactDocCol]}>
                    <Text style={styles.compactHeaderText}>Document</Text>
                  </View>
                  <View
                    style={[styles.compactHeaderCell, styles.compactValueCol]}>
                    <Text style={styles.compactHeaderText}>Value / Pcs</Text>
                  </View>
                  <View
                    style={[styles.compactHeaderCell, styles.compactDateCol]}>
                    <Text style={styles.compactHeaderText}>Ex-Factory</Text>
                  </View>
                </View>
                <ScrollView
                  style={styles.compactTableScroll}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator>
                  {modalCurrentPageData.map((item, index) => (
                    <View
                      key={`${item?.expDocumentNo || index}-${index}`}
                      style={[
                        styles.compactTableRow,
                        index % 2 === 0 && styles.compactTableRowAlt,
                      ]}>
                      <View
                        style={[styles.compactBodyCell, styles.compactDocCol]}>
                        <Text style={styles.compactDocNo} numberOfLines={1}>
                          {item.expDocumentNo || item.packagingListNo || '-'}
                        </Text>
                        <Text style={styles.compactDeptName} numberOfLines={1}>
                          {item.departmentName || item.customerName || '-'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.compactBodyCell,
                          styles.compactValueCol,
                        ]}>
                        <Text style={styles.compactValueText} numberOfLines={1}>
                          $
                          {item.totalValue
                            ? item.totalValue.toLocaleString()
                            : '0'}
                        </Text>
                        <Text style={styles.compactPcsText} numberOfLines={1}>
                          {item.noOfPcs ? item.noOfPcs.toLocaleString() : '0'}{' '}
                          pcs
                        </Text>
                      </View>
                      <View
                        style={[styles.compactBodyCell, styles.compactDateCol]}>
                        <Text style={styles.compactDateText} numberOfLines={2}>
                          {item.exFacDate ? item.exFacDate.split('T')[0] : '-'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
              {renderModalPagination()}
            </View>
          ) : (
            <View style={styles.modalEmptyCard}>
              <Text style={styles.modalEmptyIcon}>📭</Text>
              <Text style={styles.modalEmptyTitle}>No B/L records found</Text>
              <Text style={styles.modalEmptySubTitle}>
                Try changing the selected date range.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const hasActiveFilters = () => fromDate !== '' || toDate !== '';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={styles.filterPanel}>
        <View style={styles.filterPanelHeader}>
          <View>
            <Text style={styles.filterPanelTitle}>B/L Filter</Text>
            <Text style={styles.filterPanelSubTitle}>
              Choose date range before opening a card
            </Text>
          </View>
          <View style={styles.filterPanelIconBox}>
            <Text style={styles.filterPanelIcon}>BL</Text>
          </View>
        </View>
        <View style={styles.dateContainer}>
          <View style={styles.dateBox}>
            <Text style={styles.sectionLabel}>From Date</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.dateInputWrapper,
                fromDate !== '' && styles.activeDateInput,
              ]}
              onPress={() => openDatePicker('from', fromDate)}>
              <View style={styles.dateValueRow}>
                <Text style={styles.dateIcon}>📅</Text>
                <Text
                  style={[
                    styles.dateValue,
                    !fromDate && styles.placeholderText,
                    fromDate !== '' && styles.activeDateText,
                  ]}
                  numberOfLines={1}>
                  {fromDate || 'DD-MM-YYYY'}
                </Text>
              </View>
              {fromDate !== '' ? (
                <TouchableOpacity
                  onPress={() => setFromDate('')}
                  style={styles.clearDateBtn}>
                  <Text style={styles.clearDateText}>✕</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.dateChevron}>⌄</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.sectionLabel}>To Date</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.dateInputWrapper,
                toDate !== '' && styles.activeDateInput,
              ]}
              onPress={() => openDatePicker('to', toDate)}>
              <View style={styles.dateValueRow}>
                <Text style={styles.dateIcon}>📅</Text>
                <Text
                  style={[
                    styles.dateValue,
                    !toDate && styles.placeholderText,
                    toDate !== '' && styles.activeDateText,
                  ]}
                  numberOfLines={1}>
                  {toDate || 'DD-MM-YYYY'}
                </Text>
              </View>
              {toDate !== '' ? (
                <TouchableOpacity
                  onPress={() => setToDate('')}
                  style={styles.clearDateBtn}>
                  <Text style={styles.clearDateText}>✕</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.dateChevron}>⌄</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {hasActiveFilters() && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.activeFiltersLabel}>Active Filters:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}>
            {fromDate !== '' && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>From: {fromDate}</Text>
                <TouchableOpacity onPress={() => setFromDate('')}>
                  <Text style={styles.filterBadgeClose}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {toDate !== '' && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>To: {toDate}</Text>
                <TouchableOpacity onPress={() => setToDate('')}>
                  <Text style={styles.filterBadgeClose}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.buyerSummarySection}>
        <View style={styles.summaryHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>🚢 B/L Pending Summary</Text>
            <Text style={styles.summaryHeaderSubText}>
              Overview by assigned department
            </Text>
          </View>
          <View style={styles.summaryHeaderPill}>
            <Text style={styles.summaryHeaderPillText}>
              {totalDepartmentCount} Depts
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCardPremium, styles.departmentStatCard]}>
            <View style={styles.statAccentBlue} />
            <View style={styles.statGlowBlue} />
            <View style={styles.statDecorRing} />
            <View style={styles.statTopRow}>
              <View
                style={[
                  styles.statIconWrap,
                  {backgroundColor: 'rgba(59,130,246,0.20)'},
                ]}>
                <Text style={styles.statIcon}>🏢</Text>
              </View>
              <View style={styles.statMiniBadge}>
                <Text style={styles.statMiniBadgeText}>Active</Text>
              </View>
            </View>
            <Text style={styles.statValue}>{totalDepartmentCount}</Text>
            <Text style={styles.statTitle}>Departments</Text>
            <Text style={styles.statSubLabel}>Assigned departments with pending B/L</Text>
          </View>

          <View style={[styles.statCardPremium, styles.totalDocsStatCard]}>
            <View style={styles.statAccentGreen} />
            <View style={styles.statGlowGreen} />
            <View style={styles.statDecorRing} />
            <View style={styles.statTopRow}>
              <View
                style={[
                  styles.statIconWrap,
                  {backgroundColor: 'rgba(16,185,129,0.20)'},
                ]}>
                <Text style={styles.statIcon}>🚢</Text>
              </View>
              <View style={[styles.statMiniBadge, styles.statMiniBadgeGreen]}>
                <Text style={styles.statMiniBadgeText}>Pending</Text>
              </View>
            </View>
            <Text style={styles.statValue}>{totalPendingBl}</Text>
            <Text style={styles.statTitle}>Total Pending B/L</Text>
            <Text style={styles.statSubLabel}>Pending B/L date count</Text>
          </View>
        </View>

        {!blLoading && blSafeFilteredData.length > 0 && (
          <View style={styles.pendingInsightBox}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.pendingInsightItem}
              onPress={() =>
                highestPendingItem && fetchModalExportData(highestPendingItem)
              }>
              <View style={styles.pendingInsightTextBlock}>
                <Text style={styles.pendingInsightLabel}>Highest Pending</Text>
                <Text style={styles.pendingInsightName} numberOfLines={1}>
                  {getDisplayName(highestPendingItem)}
                </Text>
                <Text style={styles.pendingInsightDeptName} numberOfLines={1}>
                  {getDepartmentSubText(highestPendingItem)}
                </Text>
              </View>
              <View
                style={[styles.pendingInsightCount, styles.pendingHighCount]}>
                <Text style={styles.pendingInsightCountText}>
                  {highestPendingItem?.pendingBL || 0}
                </Text>
                <Text style={styles.pendingInsightCountLabel}>B/L</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.pendingInsightItem, styles.pendingInsightItemLast]}
              onPress={() =>
                lowestPendingItem && fetchModalExportData(lowestPendingItem)
              }>
              <View style={styles.pendingInsightTextBlock}>
                <Text style={styles.pendingInsightLabel}>Lowest Pending</Text>
                <Text style={styles.pendingInsightName} numberOfLines={1}>
                  {getDisplayName(lowestPendingItem)}
                </Text>
                <Text style={styles.pendingInsightDeptName} numberOfLines={1}>
                  {getDepartmentSubText(lowestPendingItem)}
                </Text>
              </View>
              <View
                style={[styles.pendingInsightCount, styles.pendingLowCount]}>
                <Text style={styles.pendingInsightCountText}>
                  {lowestPendingItem?.pendingBL || 0}
                </Text>
                <Text style={styles.pendingInsightCountLabel}>B/L</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.departmentListHeader}>
          <Text style={styles.departmentListTitle}>Pending by Department</Text>
          <Text style={styles.departmentListSubTitle}>
            Tap any card for B/L details
          </Text>
        </View>

        {blLoading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loaderText}>
              Loading B/L pending summary...
            </Text>
          </View>
        ) : blCurrentPageData.length > 0 ? (
          <>
            <View style={styles.badgeGrid}>
              {blCurrentPageData.map((item, index) => {
                const pending = item?.pendingBL || 0;
                const accentColor =
                  cardAccentColors[index % cardAccentColors.length];
                const softColor = cardSoftColors[index % cardSoftColors.length];
                const icon = cardIcons[index % cardIcons.length];
                const percentage = getPendingPercentage(pending);
                const statusMeta = getStatusMeta(pending);

                return (
                  <TouchableOpacity
                    key={`${
                      item?.departmentCode || item?.departmentName || index
                    }-${index}`}
                    activeOpacity={0.88}
                    style={[styles.badgeCard, {borderLeftColor: accentColor}]}
                    onPress={() => fetchModalExportData(item)}>
                    <View
                      style={[
                        styles.cardCornerGlow,
                        {backgroundColor: softColor},
                      ]}
                    />
                    <View style={styles.badgeHeader}>
                      <View style={styles.badgeLeftSection}>
                        <View
                          style={[
                            styles.badgeIconWrap,
                            {backgroundColor: softColor},
                          ]}>
                          <Text style={styles.badgeIcon}>{icon}</Text>
                        </View>
                        <View style={styles.badgeTitleSection}>
                          <Text style={styles.badgeBuyerName} numberOfLines={2}>
                            {getDisplayName(item)}
                          </Text>
                          <Text style={styles.badgeDeptName} numberOfLines={1}>
                            {getDepartmentSubText(item)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.progressRow}>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: getProgressWidth(pending),
                              backgroundColor: accentColor,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressPercent}>{percentage}%</Text>
                    </View>
                    <View style={styles.badgeFooter}>
                      <View
                        style={[
                          styles.pendingBottomBadge,
                          {backgroundColor: accentColor},
                        ]}>
                        <Text style={styles.pendingBottomBadgeText}>
                          Pending: {pending}
                        </Text>
                      </View>
                      <View style={styles.badgeFooterRight}>
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: statusMeta.backgroundColor,
                              borderColor: statusMeta.borderColor,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.statusPillText,
                              {color: statusMeta.textColor},
                            ]}>
                            {statusMeta.label}
                          </Text>
                        </View>
                        <Text style={styles.tapHintText}>View →</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {renderBlPagination()}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>✅</Text>
            <Text style={styles.emptyStateText}>No pending B/L found</Text>
            <Text style={styles.emptyStateSubText}>
              All B/L dates are up to date
            </Text>
          </View>
        )}
      </View>

      {renderDatePicker(
        showFromDatePicker,
        () => setShowFromDatePicker(false),
        'Select From Date',
      )}
      {renderDatePicker(
        showToDatePicker,
        () => setShowToDatePicker(false),
        'Select To Date',
      )}
      {renderDetailsModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a0c12'},
  filterPanel: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 10,
    padding: 14,
    backgroundColor: '#101827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  filterPanelTitle: {color: '#ffffff', fontSize: 18, fontWeight: '900'},
  filterPanelSubTitle: {color: '#94a3b8', fontSize: 11, marginTop: 3},
  filterPanelIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanelIcon: {color: '#93c5fd', fontSize: 13, fontWeight: '900'},
  dateContainer: {flexDirection: 'row', gap: 10},
  dateBox: {flex: 1},
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dateInputWrapper: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0b1220',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },
  activeDateInput: {borderColor: '#3b82f6', backgroundColor: '#111c35'},
  dateValueRow: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  dateIcon: {fontSize: 15, marginRight: 7},
  dateValue: {flex: 1, color: '#f8fafc', fontSize: 12, fontWeight: '700'},
  activeDateText: {color: '#ffffff'},
  placeholderText: {color: '#64748b'},
  clearDateBtn: {paddingHorizontal: 5, paddingVertical: 3},
  clearDateText: {color: '#ec4899', fontSize: 13, fontWeight: '900'},
  dateChevron: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 4,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  activeFiltersLabel: {fontSize: 9, color: '#94a3b8'},
  filtersScroll: {flex: 1},
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    gap: 4,
  },
  filterBadgeText: {fontSize: 10, color: 'white', fontWeight: '800'},
  filterBadgeClose: {
    fontSize: 12,
    color: 'white',
    fontWeight: '900',
    marginLeft: 4,
  },
  buyerSummarySection: {
    backgroundColor: '#0f111a',
    paddingTop: 6,
    paddingBottom: 14,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  sectionTitle: {fontSize: 20, fontWeight: '900', color: '#f8fafc'},
  summaryHeaderSubText: {fontSize: 12, color: '#94a3b8', marginTop: 4},
  summaryHeaderPill: {
    backgroundColor: 'rgba(59,130,246,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.32)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  summaryHeaderPillText: {color: '#93c5fd', fontSize: 11, fontWeight: '900'},
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  statCardPremium: {
    flex: 1,
    minHeight: 168,
    borderRadius: 20,
    padding: 14,
    paddingLeft: 17,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 7,
  },
  departmentStatCard: {
    backgroundColor: '#132238',
    borderColor: 'rgba(59,130,246,0.22)',
  },
  totalDocsStatCard: {
    backgroundColor: '#102a24',
    borderColor: 'rgba(16,185,129,0.22)',
  },
  statAccentBlue: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#3b82f6',
  },
  statAccentGreen: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#10b981',
  },
  statGlowBlue: {
    position: 'absolute',
    top: -28,
    right: -24,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(59,130,246,0.16)',
  },
  statGlowGreen: {
    position: 'absolute',
    top: -28,
    right: -24,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(16,185,129,0.16)',
  },
  statDecorRing: {
    position: 'absolute',
    right: 18,
    bottom: -28,
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {fontSize: 25},
  statMiniBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.30)',
  },
  statMiniBadgeGreen: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(16,185,129,0.30)',
  },
  statMiniBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#e2e8f0',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 4,
  },
  statSubLabel: {fontSize: 11, color: '#94a3b8', lineHeight: 16},
  pendingInsightBox: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 18,
    backgroundColor: '#101a3f',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  pendingInsightItem: {
    flex: 1,
    minHeight: 86,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  pendingInsightItemLast: {borderRightWidth: 0},
  pendingInsightTextBlock: {flex: 1, marginRight: 6},
  pendingInsightLabel: {
    color: '#a6b0ca',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },
  pendingInsightName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  pendingInsightDeptName: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 14,
    marginTop: 2,
  },
  pendingInsightCount: {
    minWidth: 44,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  pendingHighCount: {backgroundColor: '#ef4444'},
  pendingLowCount: {backgroundColor: '#10b981'},
  pendingInsightCountText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  pendingInsightCountLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 1,
  },
  departmentListHeader: {paddingHorizontal: 16, marginBottom: 12},
  departmentListTitle: {color: '#ffffff', fontSize: 18, fontWeight: '900'},
  departmentListSubTitle: {color: '#94a3b8', fontSize: 11, marginTop: 4},
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    rowGap: 10,
  },
  badgeCard: {
    width: '49%',
    minHeight: 115,
    backgroundColor: '#161b26',
    borderRadius: 12,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#293244',
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  cardCornerGlow: {
    position: 'absolute',
    top: -32,
    right: -30,
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  badgeHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  badgeLeftSection: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  badgeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  badgeIcon: {fontSize: 16},
  badgeTitleSection: {flex: 1, paddingRight: 2},
  badgeBuyerName: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 2,
  },
  badgeDeptName: {fontSize: 9, color: '#94a3b8'},
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#243041',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {height: '100%', borderRadius: 999},
  progressPercent: {
    minWidth: 28,
    textAlign: 'right',
    fontSize: 9,
    color: '#e2e8f0',
    fontWeight: '900',
  },
  badgeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingBottomBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBottomBadgeText: {fontSize: 9, color: '#ffffff', fontWeight: '900'},
  badgeFooterRight: {alignItems: 'flex-end', gap: 2},
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillText: {fontSize: 8, fontWeight: '900'},
  tapHintText: {color: '#60a5fa', fontSize: 8, fontWeight: '900'},
  emptyState: {paddingVertical: 42, alignItems: 'center'},
  emptyStateIcon: {fontSize: 34, marginBottom: 8},
  emptyStateText: {color: '#e2e8f0', fontSize: 14, fontWeight: '800'},
  emptyStateSubText: {color: '#94a3b8', fontSize: 11, marginTop: 4},
  centerLoader: {paddingVertical: 34, alignItems: 'center'},
  loaderText: {color: '#94a3b8', marginTop: 8, fontSize: 12},
  buyerPaginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  buyerPaginationInfoText: {color: '#94a3b8', fontSize: 10},
  buyerPaginationControls: {flexDirection: 'row', alignItems: 'center', gap: 6},
  buyerPaginationButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buyerPaginationButtonDisabled: {opacity: 0.4},
  buyerPaginationButtonText: {color: '#f1f5f9', fontSize: 12},
  buyerPageNumbersScroll: {flexDirection: 'row', maxWidth: 150},
  buyerPageNumberButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginHorizontal: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  buyerPageNumberButtonActive: {backgroundColor: '#3b82f6'},
  buyerPageNumberText: {color: '#f1f5f9', fontSize: 11},
  buyerPageNumberTextActive: {color: 'white', fontWeight: 'bold'},
  buyerItemsPerPageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  buyerItemsPerPageText: {color: '#f1f5f9', fontSize: 11},
  buyerItemsPerPageIcon: {color: '#5b6b8c', fontSize: 8},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  detailsModalContainer: {
    backgroundColor: '#0b1220',
    borderRadius: 24,
    width: '96%',
    height: '92%',
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  modalBodyContent: {flex: 1, minHeight: 0, paddingBottom: 4},
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#111c35',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detailsHeaderLeft: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  detailsModalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  detailsModalIcon: {fontSize: 20},
  detailsTitleWrap: {flex: 1},
  modalTitle: {fontSize: 16, fontWeight: '900', color: '#f8fafc'},
  modalSubTitle: {color: '#94a3b8', fontSize: 11, marginTop: 3},
  modalCloseCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239,68,68,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  modalCloseBtn: {fontSize: 16, color: '#fca5a5', fontWeight: '900'},
  modalStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  modalStatChip: {
    minWidth: 92,
    backgroundColor: '#132238',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.22)',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  modalStatValue: {color: '#ffffff', fontSize: 18, fontWeight: '900'},
  modalStatLabel: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 1,
  },
  modalDateChip: {
    flex: 1,
    backgroundColor: '#102a24',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.22)',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  modalDateChipText: {color: '#bbf7d0', fontSize: 11, fontWeight: '900'},
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  modalSearchBox: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  searchIcon: {fontSize: 14, marginRight: 8, color: '#5b6b8c'},
  modalSearchInput: {flex: 1, color: '#f8fafc', fontSize: 12, padding: 0},
  modalClearButton: {
    backgroundColor: 'rgba(236,72,153,0.14)',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.28)',
  },
  modalClearButtonText: {color: '#f472b6', fontSize: 11, fontWeight: '900'},
  compactTableShell: {
    flex: 1,
    minHeight: 120,
    marginHorizontal: 12,
    marginTop: 2,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  compactTableHeader: {
    flexDirection: 'row',
    minHeight: 42,
    backgroundColor: '#16213d',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.18)',
  },
  compactHeaderCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(148,163,184,0.12)',
  },
  compactHeaderText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  compactTableScroll: {flex: 1},
  compactTableRow: {
    flexDirection: 'row',
    minHeight: 68,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.10)',
  },
  compactTableRowAlt: {backgroundColor: '#111c31'},
  compactBodyCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(148,163,184,0.08)',
  },
  compactDocCol: {flex: 1.5},
  compactValueCol: {flex: 0.92},
  compactDateCol: {flex: 0.82},
  compactDocNo: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 3,
  },
  compactDeptName: {color: '#94a3b8', fontSize: 9, fontWeight: '700'},
  compactValueText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
  },
  compactPcsText: {color: '#cbd5e1', fontSize: 9, fontWeight: '700'},
  compactDateText: {
    color: '#86efac',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 13,
  },
  modalLoaderCard: {
    margin: 16,
    paddingVertical: 42,
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 18,
  },
  modalEmptyCard: {
    margin: 16,
    paddingVertical: 44,
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalEmptyIcon: {fontSize: 34, marginBottom: 10},
  modalEmptyTitle: {color: '#f8fafc', fontSize: 15, fontWeight: '900'},
  modalEmptySubTitle: {color: '#94a3b8', fontSize: 11, marginTop: 5},
  paginationContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.12)',
    marginTop: 6,
    backgroundColor: '#0b1220',
  },
  paginationInfoText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  paginationButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginHorizontal: 3,
  },
  paginationButtonDisabled: {backgroundColor: '#0f111a', opacity: 0.5},
  paginationButtonText: {color: '#f1f5f9', fontSize: 12, fontWeight: '700'},
  paginationButtonTextDisabled: {color: '#5b6b8c'},
  pageNumbersScroll: {flexDirection: 'row', flexGrow: 0, maxWidth: 150},
  pageNumberButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 6,
    marginHorizontal: 3,
    minWidth: 32,
    alignItems: 'center',
  },
  pageNumberButtonActive: {backgroundColor: '#3b82f6'},
  pageNumberText: {color: '#f1f5f9', fontSize: 12},
  pageNumberTextActive: {color: 'white', fontWeight: 'bold'},
  itemsPerPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  itemsPerPageLabel: {color: '#94a3b8', fontSize: 11},
  itemsPerPageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  itemsPerPageText: {color: '#f1f5f9', fontSize: 12},
  itemsPerPageIcon: {color: '#5b6b8c', fontSize: 10},
  datePickerModal: {
    backgroundColor: '#12141c',
    borderRadius: 20,
    width: '90%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f1f5f9',
    textAlign: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  datePickerColumns: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  datePickerColumn: {alignItems: 'center', width: '30%'},
  datePickerLabel: {fontSize: 12, color: '#94a3b8', marginBottom: 10},
  datePickerScroll: {height: 200, width: '100%'},
  datePickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    borderRadius: 8,
  },
  datePickerItemSelected: {backgroundColor: '#3b82f6'},
  datePickerItemText: {fontSize: 16, color: '#f1f5f9'},
  datePickerItemTextSelected: {color: 'white', fontWeight: 'bold'},
  datePickerButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  datePickerCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
  },
  datePickerCancelText: {color: '#94a3b8', fontSize: 14},
  datePickerConfirm: {flex: 1, paddingVertical: 14, alignItems: 'center'},
  datePickerConfirmText: {color: '#3b82f6', fontSize: 14, fontWeight: '800'},
});

export default BLScreen;
