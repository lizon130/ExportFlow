// src/screens/BankSubmitScreen.js
import React, {useState, useEffect} from 'react';
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

const BankSubmitScreen = ({userData} = {}) => {
  // Original BankSubmitScreen hooks kept first to avoid Fast Refresh hook mismatch.
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bankData, setBankData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  // Original pagination states kept for hook order compatibility.
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  // Date states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Original department states kept for hook order compatibility.
  const [departmentCode, setDepartmentCode] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentList, setDepartmentList] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Original summary stats state kept for hook order compatibility.
  const [summaryStats, setSummaryStats] = useState({
    totalValue: 0,
    totalPending: 0,
    totalSubmitted: 0,
    totalFiles: 0,
  });

  // Original search/error states kept for hook order compatibility.
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState('');

  // Date picker states
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [tempDay, setTempDay] = useState('');
  const [tempMonth, setTempMonth] = useState('');
  const [tempYear, setTempYear] = useState('');
  const [pickerType, setPickerType] = useState('from');

  // Pending bank summary states
  const [bankSummaryData, setBankSummaryData] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankCurrentPage, setBankCurrentPage] = useState(1);
  const [bankItemsPerPage, setBankItemsPerPage] = useState(20);

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalBankData, setModalBankData] = useState([]);
  const [modalFilteredData, setModalFilteredData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDepartmentName, setModalDepartmentName] = useState('');
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(20);
  const [modalSearchText, setModalSearchText] = useState('');

  const [departmentAccess, setDepartmentAccess] = useState({
    loaded: false,
    accessToken: '',
    departments: [],
    userProfile: null,
  });

  const API_BASE_URL = 'http://192.168.9.45:7000';

  const days = Array.from({length: 31}, (_, i) =>
    String(i + 1).padStart(2, '0'),
  );
  const months = Array.from({length: 12}, (_, i) =>
    String(i + 1).padStart(2, '0'),
  );
  const years = Array.from({length: 11}, (_, i) => String(2025 + i));

  useEffect(() => {
    initializeBankSubmitScreen();
  }, []);

  // Keep modal current page valid after search/data/rows change.
  useEffect(() => {
    const safeLength = Array.isArray(modalFilteredData)
      ? modalFilteredData.length
      : 0;
    const safeTotalPages = Math.max(
      1,
      Math.ceil(safeLength / modalItemsPerPage),
    );

    if (modalCurrentPage > safeTotalPages) {
      setModalCurrentPage(safeTotalPages);
    }
  }, [modalFilteredData, modalItemsPerPage, modalCurrentPage]);

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

  const normalizeText = value => String(value ?? '').trim().toLowerCase();

  const getStoredJsonValue = async key => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (storageError) {
      console.error(`AsyncStorage read error for ${key}:`, storageError);
      return null;
    }
  };

  const getAccessTokenFromPayload = payload => {
    if (!payload) {
      return '';
    }

    if (typeof payload === 'string') {
      return payload;
    }

    return (
      payload?.accessToken ||
      payload?.token ||
      payload?.jwtToken ||
      payload?.authToken ||
      payload?.data?.accessToken ||
      payload?.data?.token ||
      payload?.user?.accessToken ||
      payload?.profile?.accessToken ||
      ''
    );
  };

  const getUserIdFromPayload = payload => {
    if (!payload || typeof payload === 'string') {
      return null;
    }

    return (
      payload?.recId ||
      payload?.userId ||
      payload?.id ||
      payload?.data?.recId ||
      payload?.data?.userId ||
      payload?.data?.id ||
      payload?.user?.recId ||
      payload?.user?.userId ||
      payload?.user?.id ||
      payload?.profile?.recId ||
      payload?.profile?.userId ||
      payload?.profile?.id ||
      null
    );
  };

  const getProfileCandidate = payload => {
    if (!payload || typeof payload === 'string') {
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

  const getDepartmentsFromProfile = profile => {
    return normalizeArray(
      profile?.departments ||
        profile?.department ||
        profile?.assignedDepartments ||
        profile?.userDepartments ||
        profile?.user?.departments ||
        profile?.profile?.departments ||
        [],
    );
  };

  const getBuyersFromProfile = profile => {
    return normalizeArray(
      profile?.buyers ||
        profile?.buyer ||
        profile?.assignedBuyers ||
        profile?.userBuyers ||
        profile?.user?.buyers ||
        profile?.profile?.buyers ||
        [],
    );
  };

  const normalizeDepartmentAccessItem = (department, buyer = null) => {
    const departmentCode = String(
      department?.departmentCode ||
        department?.deptCode ||
        department?.depCode ||
        department?.departmentName ||
        department?.deptName ||
        department?.name ||
        '',
    ).trim();
    const departmentName = String(
      department?.departmentName ||
        department?.deptName ||
        department?.depName ||
        department?.departmentCode ||
        department?.name ||
        '',
    ).trim();
    const buyerName = String(
      department?.buyerName ||
        buyer?.buyerName ||
        department?.customerName ||
        departmentName ||
        departmentCode ||
        '',
    ).trim();
    const buyerCode = String(
      department?.buyerNameCode ||
        buyer?.buyerNameCode ||
        department?.customerCode ||
        buyer?.buyerRecId ||
        departmentCode ||
        '',
    ).trim();

    return {
      recId: department?.recId || department?.id || department?.departmentId,
      departmentCode,
      departmentName,
      customerName: buyerName || departmentName || departmentCode,
      customerCode: buyerCode,
    };
  };

  const getDepartmentQueryCandidates = department => {
    const candidates = [
      department?.departmentCode,
      department?.departmentName,
      department?.deptCode,
      department?.deptName,
      department?.customerCode,
      department?.customerName,
    ];

    const uniqueCandidates = [];

    candidates.forEach(value => {
      const textValue = String(value || '').trim();
      if (
        textValue &&
        !uniqueCandidates.some(
          item => item.toLowerCase() === textValue.toLowerCase(),
        )
      ) {
        uniqueCandidates.push(textValue);
      }
    });

    return uniqueCandidates;
  };

  const attachDepartmentFallback = (row, department) => ({
    ...row,
    departmentCode:
      row?.departmentCode || row?.deptCode || department?.departmentCode || '',
    departmentName:
      row?.departmentName || row?.deptName || department?.departmentName || department?.departmentCode || '-',
    customerCode:
      row?.customerCode || department?.customerCode || department?.departmentCode || '',
    customerName:
      row?.customerName || department?.customerName || department?.departmentName || department?.departmentCode || 'Unknown',
  });

  const getRowsScore = (rows, metricFields = []) => {
    const metricScore = rows.reduce(
      (sum, item) =>
        sum + metricFields.reduce((fieldSum, field) => fieldSum + getNumber(item?.[field]), 0),
      0,
    );

    return metricScore > 0 ? metricScore : rows.length;
  };

  const buildDepartmentUrl = (endpoint, depName) => {
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${API_BASE_URL}${endpoint}${separator}depName=${encodeURIComponent(
      depName || '',
    )}`;
  };

  const fetchJson = async (url, accessToken = '') => {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  const fetchDepartmentRows = async (
    endpoint,
    department,
    metricFields = [],
    accessOverride = departmentAccess,
  ) => {
    const candidates = getDepartmentQueryCandidates(department);
    let bestRows = [];
    let bestScore = -1;

    for (const depName of candidates) {
      try {
        const data = await fetchJson(
          buildDepartmentUrl(endpoint, depName),
          accessOverride?.accessToken || '',
        );
        const rows = normalizeArray(data).map(row =>
          attachDepartmentFallback(row, department),
        );
        const score = getRowsScore(rows, metricFields);

        if (score > bestScore || (score === bestScore && !bestRows.length)) {
          bestRows = rows;
          bestScore = score;
        }
      } catch (fetchError) {
        console.error(`Bank department API error for ${depName}:`, fetchError);
      }
    }

    return bestRows;
  };

  const fetchRowsForAssignedDepartments = async (
    endpoint,
    accessOverride,
    metricFields = [],
  ) => {
    const departments = normalizeArray(accessOverride?.departments);

    // IMPORTANT:
    // If logged-in user has assigned departments, load only those department data.
    // If logged-in Admin/Super-Admin has no assigned department, keep old behavior
    // and load ALL data by calling the API without depName.
    if (!departments.length) {
      const data = await fetchJson(
        `${API_BASE_URL}${endpoint}`,
        accessOverride?.accessToken || '',
      );
      return normalizeArray(data);
    }

    const nestedRows = await Promise.all(
      departments.map(department =>
        fetchDepartmentRows(endpoint, department, metricFields, accessOverride),
      ),
    );

    return nestedRows.flat();
  };

  const loadDepartmentAccess = async () => {
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
      'authData',
      'loginResponse',
      'accessToken',
      'token',
    ];

    const storedPayloads = [];

    for (const key of storageKeys) {
      const value = await getStoredJsonValue(key);
      if (value) {
        storedPayloads.push(value);
      }
    }

    const allPayloads = [userData, ...storedPayloads].filter(Boolean);
    const accessToken =
      allPayloads.map(getAccessTokenFromPayload).find(Boolean) || '';
    const profileFromStorage = allPayloads
      .map(getProfileCandidate)
      .find(profile => getDepartmentsFromProfile(profile).length > 0);

    let userProfile = profileFromStorage || null;

    if (!userProfile) {
      const userId = allPayloads.map(getUserIdFromPayload).find(Boolean);

      if (userId) {
        try {
          userProfile = await fetchJson(
            `${API_BASE_URL}/api/User/${userId}/profile`,
            accessToken,
          );
        } catch (profileError) {
          console.error('Error fetching logged-in user profile:', profileError);
        }
      }
    }

    const profileDepartments = getDepartmentsFromProfile(userProfile);
    const profileBuyers = getBuyersFromProfile(userProfile);
    const firstBuyer = profileBuyers[0] || null;

    const departments = profileDepartments
      .map(department => normalizeDepartmentAccessItem(department, firstBuyer))
      .filter(
        department => department.departmentCode || department.departmentName,
      );

    return {
      loaded: true,
      accessToken,
      departments,
      userProfile,
    };
  };

  const initializeBankSubmitScreen = async () => {
    const access = await loadDepartmentAccess();
    setDepartmentAccess(access);
    await Promise.all([fetchSummaryStats(access), fetchBankSummary(access)]);
  };

  const fetchSummaryStats = async (accessOverride = departmentAccess) => {
    try {
      const activeAccess = accessOverride?.loaded
        ? accessOverride
        : await loadDepartmentAccess();

      const [pendingArray, completedArray] = await Promise.all([
        fetchRowsForAssignedDepartments(
          '/api/Export/Get-Pending-Bank-Submission-Date-Count',
          activeAccess,
          [
            'pendingBankSubmissionDateCount',
            'pendingBank',
            'totalValue',
            'totalExportValue',
            'pendingValue',
          ],
        ),
        fetchRowsForAssignedDepartments(
          '/api/Export/Get-Completed-Bank-Submission-Date-Count',
          activeAccess,
          [
            'completedBankSubmissionDateCount',
            'completedBank',
            'totalPackagingCount',
          ],
        ),
      ]);

      const pendingCount = pendingArray.reduce(
        (sum, item) =>
          sum +
          getNumber(item?.pendingBankSubmissionDateCount || item?.pendingBank),
        0,
      );

      const totalValue = pendingArray.reduce(
        (sum, item) =>
          sum +
          (getNumber(item?.totalValue) ||
            getNumber(item?.totalExportValue) ||
            getNumber(item?.pendingValue) ||
            0),
        0,
      );

      const completedCount = completedArray.reduce(
        (sum, item) =>
          sum +
          (getNumber(item?.completedBankSubmissionDateCount) ||
            getNumber(item?.completedBank) ||
            getNumber(item?.totalPackagingCount) ||
            0),
        0,
      );

      setSummaryStats({
        totalValue,
        totalPending: pendingCount,
        totalSubmitted: completedCount,
        totalFiles: pendingCount + completedCount,
      });
    } catch (statsError) {
      console.error('Error fetching bank dashboard stats:', statsError);
      setSummaryStats({
        totalValue: 0,
        totalPending: 0,
        totalSubmitted: 0,
        totalFiles: 0,
      });
    }
  };

  const fetchBankSummary = async (accessOverride = departmentAccess) => {
    setBankLoading(true);
    setError('');

    try {
      const activeAccess = accessOverride?.loaded
        ? accessOverride
        : await loadDepartmentAccess();

      const dataArray = await fetchRowsForAssignedDepartments(
        '/api/Export/Get-Pending-Bank-Submission-Date-Count',
        activeAccess,
        [
          'pendingBankSubmissionDateCount',
          'pendingBank',
          'totalValue',
          'totalExportValue',
          'pendingValue',
        ],
      );

      // Department access rule:
      // Assigned departments: only data returned by assigned depName API calls can show here.
      // No assigned departments: API is called without depName, so Admin sees all previous data.
      const pendingBankDepartments = dataArray
        .filter(item => getNumber(item?.pendingBankSubmissionDateCount) > 0)
        .map(item => ({
          ...item,
          pendingBank: getNumber(item?.pendingBankSubmissionDateCount),
          customerName: item?.customerName || item?.departmentName || 'Unknown',
          departmentName: item?.departmentName || item?.departmentCode || '-',
          departmentCode: item?.departmentCode || '',
          totalValue: getNumber(item?.totalValue),
        }))
        .sort((a, b) => (b?.pendingBank || 0) - (a?.pendingBank || 0));

      setBankSummaryData(pendingBankDepartments);
      setBankCurrentPage(1);
    } catch (fetchError) {
      console.error('Error fetching pending bank summary:', fetchError);
      setBankSummaryData([]);
      setBankCurrentPage(1);
      setError(`Network error: ${fetchError.message}`);
    } finally {
      setBankLoading(false);
    }
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

    if (type === 'from') {
      setShowFromDatePicker(true);
    } else {
      setShowToDatePicker(true);
    }
  };

  const confirmDate = () => {
    if (tempDay && tempMonth && tempYear) {
      const formattedDate = `${tempDay}-${tempMonth}-${tempYear}`;
      if (pickerType === 'from') {
        setFromDate(formattedDate);
        setShowFromDatePicker(false);
      } else {
        setToDate(formattedDate);
        setShowToDatePicker(false);
      }
    }
  };

  const parseDateString = dateStr => {
    if (!dateStr) {
      return null;
    }

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }

    return null;
  };

  const getDateOnly = date => {
    if (!date || Number.isNaN(date.getTime())) {
      return null;
    }

    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const getFilterDateValue = item => {
    return (
      item?.bankSubmissionDate ||
      item?.shippingDate ||
      item?.blDate ||
      item?.exFacDate ||
      null
    );
  };

  const filterBySelectedDates = data => {
    if (!Array.isArray(data)) {
      return [];
    }

    const fromDateObj = getDateOnly(parseDateString(fromDate));
    const toDateObj = getDateOnly(parseDateString(toDate));

    if (!fromDateObj && !toDateObj) {
      return data;
    }

    return data.filter(item => {
      const dateValue = getFilterDateValue(item);
      if (!dateValue) {
        return false;
      }

      const itemDate = getDateOnly(new Date(dateValue));
      if (!itemDate) {
        return false;
      }

      if (fromDateObj && itemDate < fromDateObj) {
        return false;
      }

      if (toDateObj && itemDate > toDateObj) {
        return false;
      }

      return true;
    });
  };

  const filterDataBySearch = (data, text) => {
    if (!text || !Array.isArray(data)) {
      return data;
    }

    const searchLower = text.toLowerCase();

    return data.filter(
      item =>
        (item?.packagingListNo &&
          item.packagingListNo
            .toString()
            .toLowerCase()
            .includes(searchLower)) ||
        (item?.expDocumentNo &&
          item.expDocumentNo.toString().toLowerCase().includes(searchLower)) ||
        (item?.customerName &&
          item.customerName.toLowerCase().includes(searchLower)) ||
        (item?.departmentName &&
          item.departmentName.toLowerCase().includes(searchLower)) ||
        (item?.totalValue &&
          item.totalValue.toString().toLowerCase().includes(searchLower)),
    );
  };

  const fetchModalBankData = async item => {
    setModalLoading(true);
    setModalSearchText('');

    try {
      const activeAccess = departmentAccess?.loaded
        ? departmentAccess
        : await loadDepartmentAccess();
      const dataArray = await fetchDepartmentRows(
        '/api/Export/Get-By-Dept-Bank-Submission-Date-List',
        item,
        ['totalValue', 'noOfPcs', 'noOfCarton'],
        activeAccess,
      );
      const pendingRows = dataArray.filter(row => !row?.bankSubmissionDate);
      const rowsForModal = pendingRows.length > 0 ? pendingRows : dataArray;
      const dateFilteredData = filterBySelectedDates(rowsForModal);

      setModalBankData(dateFilteredData);
      setModalFilteredData(dateFilteredData);
      setModalCurrentPage(1);
      setModalDepartmentName(getFullDisplayName(item));
    } catch (fetchError) {
      console.error('Bank modal fetch error:', fetchError);
      setModalBankData([]);
      setModalFilteredData([]);
      setModalCurrentPage(1);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCardClick = async item => {
    setModalDepartmentName(getFullDisplayName(item));
    setShowDetailsModal(true);
    await fetchModalBankData(item);
  };

  const handleModalSearch = text => {
    setModalSearchText(text);
    setModalCurrentPage(1);

    if (!Array.isArray(modalBankData)) {
      setModalFilteredData([]);
      return;
    }

    const filtered = filterDataBySearch(modalBankData, text);
    setModalFilteredData(filtered);
  };

  const bankSafeData = Array.isArray(bankSummaryData) ? bankSummaryData : [];

  const bankTotalPages = Math.ceil(bankSafeData.length / bankItemsPerPage);

  const bankCurrentPageData = bankSafeData.slice(
    (bankCurrentPage - 1) * bankItemsPerPage,
    bankCurrentPage * bankItemsPerPage,
  );

  const totalPendingBank = bankSafeData.reduce(
    (sum, item) => sum + (item?.pendingBank || 0),
    0,
  );

  const totalDepartmentCount = bankSafeData.length;

  const displayTotalValue = summaryStats.totalValue || 0;
  const displaySubmittedCount = summaryStats.totalSubmitted || 0;
  const displayPendingCount = summaryStats.totalPending || 0;
  const displayTotalFiles = summaryStats.totalFiles || 0;

  const formatNumber = value => {
    const numericValue = Number(value || 0);
    return Number.isFinite(numericValue) ? numericValue.toLocaleString() : '0';
  };

  const maxPendingBank =
    bankSafeData.length > 0
      ? Math.max(...bankSafeData.map(item => item?.pendingBank || 0))
      : 0;

  const sortedPendingBankData = [...bankSafeData].sort(
    (a, b) => (b?.pendingBank || 0) - (a?.pendingBank || 0),
  );

  const highestPendingItem = sortedPendingBankData[0] || null;
  const lowestPendingItem = sortedPendingBankData.length
    ? sortedPendingBankData[sortedPendingBankData.length - 1]
    : null;

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

  const cardIcons = ['🏦', '📦', '🏬', '📄', '🛒', '🏭', '🧾', '💳'];

  const getDisplayName = item =>
    item?.customerName || item?.departmentName || 'Unknown';

  const getDepartmentSubText = item =>
    item?.departmentName || item?.departmentCode || '-';

  const getFullDisplayName = item => {
    const customer = item?.customerName || 'Unknown';
    const department = item?.departmentName || item?.departmentCode || '';
    return department && department !== customer
      ? `${customer} • ${department}`
      : customer;
  };

  const getPendingPercentage = pending => {
    if (!maxPendingBank || maxPendingBank <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((pending / maxPendingBank) * 100));
  };

  const getProgressWidth = pending => {
    const percentage = getPendingPercentage(pending);
    if (percentage === 0) {
      return '8%';
    }

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

  const getBankStatus = bankSubmissionDate => {
    if (bankSubmissionDate) {
      return 'Submitted';
    }

    return 'Pending';
  };

  const getBankStatusColor = bankSubmissionDate => {
    if (bankSubmissionDate) {
      return '#10b981';
    }

    return '#ef4444';
  };

  const hasActiveFilters = () => fromDate !== '' || toDate !== '';

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      const activeAccess = departmentAccess?.loaded
        ? departmentAccess
        : await loadDepartmentAccess();

      if (!departmentAccess?.loaded) {
        setDepartmentAccess(activeAccess);
      }

      await Promise.all([
        fetchSummaryStats(activeAccess),
        fetchBankSummary(activeAccess),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const getBankPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      bankCurrentPage - Math.floor(maxVisiblePages / 2),
    );
    let endPage = Math.min(bankTotalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  };

  const renderBankPagination = () => {
    if (bankTotalPages <= 1) {
      return null;
    }

    const pageNumbers = getBankPageNumbers();
    const startItem = (bankCurrentPage - 1) * bankItemsPerPage + 1;
    const endItem = Math.min(
      bankCurrentPage * bankItemsPerPage,
      bankSafeData.length,
    );

    return (
      <View style={styles.buyerPaginationContainer}>
        <View style={styles.buyerPaginationInfo}>
          <Text style={styles.buyerPaginationInfoText}>
            {startItem}-{endItem} of {bankSafeData.length}
          </Text>
        </View>

        <View style={styles.buyerPaginationControls}>
          <TouchableOpacity
            style={[
              styles.buyerPaginationButton,
              bankCurrentPage === 1 && styles.buyerPaginationButtonDisabled,
            ]}
            onPress={() => setBankCurrentPage(page => Math.max(1, page - 1))}
            disabled={bankCurrentPage === 1}>
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
                  bankCurrentPage === pageNum &&
                    styles.buyerPageNumberButtonActive,
                ]}
                onPress={() => setBankCurrentPage(pageNum)}>
                <Text
                  style={[
                    styles.buyerPageNumberText,
                    bankCurrentPage === pageNum &&
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
              bankCurrentPage === bankTotalPages &&
                styles.buyerPaginationButtonDisabled,
            ]}
            onPress={() =>
              setBankCurrentPage(page => Math.min(bankTotalPages, page + 1))
            }
            disabled={bankCurrentPage === bankTotalPages}>
            <Text style={styles.buyerPaginationButtonText}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buyerItemsPerPageContainer}>
          <TouchableOpacity
            style={styles.buyerItemsPerPageSelector}
            onPress={() => {
              const newItemsPerPage =
                bankItemsPerPage === 20
                  ? 50
                  : bankItemsPerPage === 50
                  ? 100
                  : 20;
              setBankItemsPerPage(newItemsPerPage);
              setBankCurrentPage(1);
            }}>
            <Text style={styles.buyerItemsPerPageText}>{bankItemsPerPage}</Text>
            <Text style={styles.buyerItemsPerPageIcon}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getModalPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      modalCurrentPage - Math.floor(maxVisiblePages / 2),
    );
    let endPage = Math.min(modalTotalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  };

  const goToPrevModalPage = () => {
    setModalCurrentPage(prevPage => Math.max(prevPage - 1, 1));
  };

  const goToNextModalPage = () => {
    setModalCurrentPage(prevPage =>
      Math.min(prevPage + 1, Math.max(modalTotalPages, 1)),
    );
  };

  const goToModalPage = page => {
    setModalCurrentPage(
      Math.min(Math.max(page, 1), Math.max(modalTotalPages, 1)),
    );
  };

  const renderModalPagination = () => {
    if (modalTotalPages <= 1) {
      return null;
    }

    const pageNumbers = getModalPageNumbers();
    const startItem = (modalCurrentPage - 1) * modalItemsPerPage + 1;
    const endItem = Math.min(
      modalCurrentPage * modalItemsPerPage,
      modalSafeFilteredData.length,
    );

    return (
      <View style={styles.modalPaginationContainer}>
        <View style={styles.modalPaginationInfo}>
          <Text style={styles.modalPaginationInfoText}>
            Showing {startItem} - {endItem} of {modalSafeFilteredData.length}{' '}
            records
          </Text>
        </View>

        <View style={styles.modalPaginationControls}>
          <TouchableOpacity
            style={[
              styles.modalPaginationButton,
              modalCurrentPage === 1 && styles.modalPaginationButtonDisabled,
            ]}
            onPress={goToPrevModalPage}
            disabled={modalCurrentPage === 1}>
            <Text style={styles.modalPaginationButtonText}>Previous</Text>
          </TouchableOpacity>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.modalPageNumbersScroll}>
            {pageNumbers.map(pageNum => (
              <TouchableOpacity
                key={pageNum}
                style={[
                  styles.modalPageNumberButton,
                  modalCurrentPage === pageNum &&
                    styles.modalPageNumberButtonActive,
                ]}
                onPress={() => goToModalPage(pageNum)}>
                <Text
                  style={[
                    styles.modalPageNumberText,
                    modalCurrentPage === pageNum &&
                      styles.modalPageNumberTextActive,
                  ]}>
                  {pageNum}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.modalPaginationButton,
              modalCurrentPage === modalTotalPages &&
                styles.modalPaginationButtonDisabled,
            ]}
            onPress={goToNextModalPage}
            disabled={modalCurrentPage === modalTotalPages}>
            <Text style={styles.modalPaginationButtonText}>Next</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalItemsPerPageContainer}>
          <Text style={styles.modalItemsPerPageLabel}>Rows per page:</Text>
          <TouchableOpacity
            style={styles.modalItemsPerPageSelector}
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
            <Text style={styles.modalItemsPerPageText}>
              {modalItemsPerPage}
            </Text>
            <Text style={styles.modalItemsPerPageIcon}>▼</Text>
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
                <Text style={styles.detailsModalIcon}>🏦</Text>
              </View>
              <View style={styles.detailsTitleWrap}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {modalDepartmentName}
                </Text>
                <Text style={styles.modalSubTitle} numberOfLines={1}>
                  {fromDate || toDate
                    ? `${fromDate || 'Start'} → ${toDate || 'Today'}`
                    : 'All pending bank submission records'}
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
                  placeholder="Search packing, export no, department..."
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
                    setModalFilteredData(modalBankData);
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
              <Text style={styles.loaderText}>Loading bank records...</Text>
            </View>
          ) : modalCurrentPageData.length > 0 ? (
            <View style={styles.modalBodyContent}>
              <View style={styles.modalTableShell}>
                <View style={styles.compactBankTableHeader}>
                  <View
                    style={[
                      styles.compactBankHeaderCell,
                      styles.compactBankDocCol,
                    ]}>
                    <Text style={styles.compactBankHeaderText}>Document</Text>
                  </View>

                  <View
                    style={[
                      styles.compactBankHeaderCell,
                      styles.compactBankQtyCol,
                    ]}>
                    <Text style={styles.compactBankHeaderText}>
                      Qty / Value
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.compactBankHeaderCell,
                      styles.compactBankDateCol,
                    ]}>
                    <Text style={styles.compactBankHeaderText}>
                      Dates / Status
                    </Text>
                  </View>
                </View>

                <ScrollView
                  style={styles.compactBankTableBody}
                  contentContainerStyle={styles.compactBankTableContent}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}>
                  {modalCurrentPageData.map((item, index) => {
                    const bankStatus = getBankStatus(item?.bankSubmissionDate);
                    const bankStatusColor = getBankStatusColor(
                      item?.bankSubmissionDate,
                    );

                    return (
                      <View
                        key={`${
                          item?.packagingListNo || item?.expDocumentNo || index
                        }-${index}`}
                        style={[
                          styles.compactBankTableRow,
                          index % 2 === 0 && styles.compactBankTableRowAlt,
                        ]}>
                        <View
                          style={[
                            styles.compactBankBodyCell,
                            styles.compactBankDocCol,
                          ]}>
                          <View style={styles.compactBankDocTopRow}>
                            <Text style={styles.compactBankSerialBadge}>
                              {(modalCurrentPage - 1) * modalItemsPerPage +
                                index +
                                1}
                            </Text>
                            <Text
                              style={styles.compactBankPackingText}
                              numberOfLines={1}>
                              {item?.packagingListNo || '-'}
                            </Text>
                          </View>

                          <Text
                            style={styles.compactBankExportText}
                            numberOfLines={1}>
                            {item?.expDocumentNo || '-'}
                          </Text>

                          <Text
                            style={styles.compactBankCustomerText}
                            numberOfLines={1}>
                            {item?.customerName || '-'}
                          </Text>

                          <Text
                            style={styles.compactBankDeptText}
                            numberOfLines={1}>
                            {item?.departmentName || '-'}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.compactBankBodyCell,
                            styles.compactBankQtyCol,
                          ]}>
                          <Text
                            style={styles.compactBankCartonText}
                            numberOfLines={1}>
                            {item?.noOfCarton
                              ? item.noOfCarton.toLocaleString()
                              : '0'}{' '}
                            ctn
                          </Text>

                          <Text
                            style={styles.compactBankPcsText}
                            numberOfLines={1}>
                            {item?.noOfPcs
                              ? item.noOfPcs.toLocaleString()
                              : '0'}{' '}
                            pcs
                          </Text>

                          <Text
                            style={styles.compactBankValueText}
                            numberOfLines={1}>
                            {item?.totalValue
                              ? item.totalValue.toLocaleString()
                              : '0'}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.compactBankBodyCell,
                            styles.compactBankDateCol,
                          ]}>
                          <View style={styles.compactBankDateLine}>
                            <Text style={styles.compactBankDateLabel}>B/L</Text>
                            <Text
                              style={styles.compactBankDateText}
                              numberOfLines={1}>
                              {item?.blDate ? item.blDate.split('T')[0] : '-'}
                            </Text>
                          </View>

                          <View style={styles.compactBankDateLine}>
                            <Text style={styles.compactBankDateLabel}>
                              Ship
                            </Text>
                            <Text
                              style={styles.compactBankDateText}
                              numberOfLines={1}>
                              {item?.shippingDate
                                ? item.shippingDate.split('T')[0]
                                : '-'}
                            </Text>
                          </View>

                          <View style={styles.compactBankDateLine}>
                            <Text style={styles.compactBankDateLabel}>
                              Bank
                            </Text>
                            <Text
                              style={styles.compactBankDateText}
                              numberOfLines={1}>
                              {item?.bankSubmissionDate
                                ? item.bankSubmissionDate.split('T')[0]
                                : '-'}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.compactBankStatusBadge,
                              {
                                backgroundColor: `${bankStatusColor}22`,
                                borderColor: `${bankStatusColor}55`,
                              },
                            ]}>
                            <Text
                              style={[
                                styles.compactBankStatusText,
                                {color: bankStatusColor},
                              ]}>
                              {bankStatus}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {renderModalPagination()}
            </View>
          ) : (
            <View style={styles.modalEmptyCard}>
              <Text style={styles.modalEmptyIcon}>🏦</Text>
              <Text style={styles.modalEmptyTitle}>No bank records found</Text>
              <Text style={styles.modalEmptySubTitle}>
                Try changing the selected date range.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Premium Date Filter */}
      <View style={styles.filterPanel}>
        <View style={styles.filterPanelHeader}>
          <View>
            <Text style={styles.filterPanelTitle}>Bank Submission Filter</Text>
            <Text style={styles.filterPanelSubTitle}>
              Choose date range before opening a card
            </Text>
          </View>
          <View style={styles.filterPanelIconBox}>
            <Text style={styles.filterPanelIcon}>🏦</Text>
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
            <Text style={styles.sectionTitle}>🏦 Bank Submission Summary</Text>
            <Text style={styles.summaryHeaderSubText}>
              Overview by active department
            </Text>
          </View>

          <View style={styles.summaryHeaderPill}>
            <Text style={styles.summaryHeaderPillText}>
              {totalDepartmentCount} Depts
            </Text>
          </View>
        </View>

        {/* Existing Bank Summary Cards */}
        <View style={styles.dashboardStatsGrid}>
          <View style={styles.dashboardStatsRow}>
            <View style={[styles.dashboardCard, styles.dashboardValueCard]}>
              <View style={styles.dashboardGlowPurple} />
              <View style={styles.dashboardCardHeader}>
                <View
                  style={[
                    styles.dashboardIconWrap,
                    {backgroundColor: 'rgba(139,92,246,0.18)'},
                  ]}>
                  <Text style={styles.dashboardIcon}>💰</Text>
                </View>
                <Text style={styles.dashboardTag}>Value</Text>
              </View>
              <Text style={styles.dashboardValue}>
                ${formatNumber(displayTotalValue)}
              </Text>
              <Text style={styles.dashboardLabel}>Total Pending Value</Text>
            </View>

            <View style={[styles.dashboardCard, styles.dashboardCompletedCard]}>
              <View style={styles.dashboardGlowGreen} />
              <View style={styles.dashboardCardHeader}>
                <View
                  style={[
                    styles.dashboardIconWrap,
                    {backgroundColor: 'rgba(16,185,129,0.18)'},
                  ]}>
                  <Text style={styles.dashboardIcon}>✅</Text>
                </View>
                <Text style={styles.dashboardTag}>Done</Text>
              </View>
              <Text style={styles.dashboardValue}>
                {formatNumber(displaySubmittedCount)}
              </Text>
              <Text style={styles.dashboardLabel}>Completed Submissions</Text>
            </View>
          </View>

          <View style={styles.dashboardStatsRow}>
            <View style={[styles.dashboardCard, styles.dashboardPendingCard]}>
              <View style={styles.dashboardGlowOrange} />
              <View style={styles.dashboardCardHeader}>
                <View
                  style={[
                    styles.dashboardIconWrap,
                    {backgroundColor: 'rgba(245,158,11,0.18)'},
                  ]}>
                  <Text style={styles.dashboardIcon}>⏳</Text>
                </View>
                <Text style={styles.dashboardTag}>Pending</Text>
              </View>
              <Text style={styles.dashboardValue}>
                {formatNumber(displayPendingCount)}
              </Text>
              <Text style={styles.dashboardLabel}>Pending Bank Submission</Text>
            </View>

            <View style={[styles.dashboardCard, styles.dashboardTotalCard]}>
              <View style={styles.dashboardGlowBlue} />
              <View style={styles.dashboardCardHeader}>
                <View
                  style={[
                    styles.dashboardIconWrap,
                    {backgroundColor: 'rgba(59,130,246,0.18)'},
                  ]}>
                  <Text style={styles.dashboardIcon}>📊</Text>
                </View>
                <Text style={styles.dashboardTag}>Total</Text>
              </View>
              <Text style={styles.dashboardValue}>
                {formatNumber(displayTotalFiles)}
              </Text>
              <Text style={styles.dashboardLabel}>Total Export Documents</Text>
            </View>
          </View>
        </View>

        {!bankLoading && bankSafeData.length > 0 && (
          <View style={styles.pendingInsightBox}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.pendingInsightItem}
              onPress={() =>
                highestPendingItem && handleCardClick(highestPendingItem)
              }>
              <View style={styles.pendingInsightTextWrap}>
                <Text style={styles.pendingInsightLabel}>Highest Pending</Text>
                <Text style={styles.pendingInsightName} numberOfLines={1}>
                  {getDisplayName(highestPendingItem)}
                </Text>
                <Text style={styles.pendingInsightDept} numberOfLines={1}>
                  {getDepartmentSubText(highestPendingItem)}
                </Text>
              </View>

              <View
                style={[styles.pendingInsightCount, styles.pendingHighCount]}>
                <Text style={styles.pendingInsightCountText}>
                  {highestPendingItem?.pendingBank || 0}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.pendingInsightItem, styles.pendingInsightItemLast]}
              onPress={() =>
                lowestPendingItem && handleCardClick(lowestPendingItem)
              }>
              <View style={styles.pendingInsightTextWrap}>
                <Text style={styles.pendingInsightLabel}>Lowest Pending</Text>
                <Text style={styles.pendingInsightName} numberOfLines={1}>
                  {getDisplayName(lowestPendingItem)}
                </Text>
                <Text style={styles.pendingInsightDept} numberOfLines={1}>
                  {getDepartmentSubText(lowestPendingItem)}
                </Text>
              </View>

              <View
                style={[styles.pendingInsightCount, styles.pendingLowCount]}>
                <Text style={styles.pendingInsightCountText}>
                  {lowestPendingItem?.pendingBank || 0}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.departmentListHeader}>
          <Text style={styles.departmentListTitle}>Pending Bank Submission</Text>
          <Text style={styles.departmentListSubTitle}>
            Tap any card for bank submission details
          </Text>
        </View>

        {bankLoading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loaderText}>
              Loading pending bank submissions...
            </Text>
          </View>
        ) : bankCurrentPageData.length > 0 ? (
          <>
            <View style={styles.badgeGrid}>
              {bankCurrentPageData.map((item, index) => {
                const pending = item?.pendingBank || 0;
                const accentColor =
                  cardAccentColors[index % cardAccentColors.length];
                const softColor = cardSoftColors[index % cardSoftColors.length];
                const icon = cardIcons[index % cardIcons.length];
                const percentage = getPendingPercentage(pending);
                const statusMeta = getStatusMeta(pending);

                return (
                  <TouchableOpacity
                    key={`${
                      item?.departmentCode || item?.customerName || index
                    }-${index}`}
                    activeOpacity={0.88}
                    style={[styles.badgeCard, {borderLeftColor: accentColor}]}
                    onPress={() => handleCardClick(item)}>
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

            {renderBankPagination()}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>✅</Text>
            <Text style={styles.emptyStateText}>
              No pending bank submission found
            </Text>
            <Text style={styles.emptyStateSubText}>
              All departments are up to date
            </Text>
          </View>
        )}
      </View>

      {error !== '' && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

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
  container: {
    flex: 1,
    backgroundColor: '#0a0c12',
  },

  // ========== EXISTING TOP BANK CARDS ==========
  dashboardStatsGrid: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 8,
  },
  dashboardStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  dashboardCard: {
    flex: 1,
    minHeight: 122,
    borderRadius: 18,
    padding: 12,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 7},
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  dashboardValueCard: {
    backgroundColor: '#1c1733',
    borderColor: 'rgba(139,92,246,0.24)',
  },
  dashboardCompletedCard: {
    backgroundColor: '#102a24',
    borderColor: 'rgba(16,185,129,0.24)',
  },
  dashboardPendingCard: {
    backgroundColor: '#2b2112',
    borderColor: 'rgba(245,158,11,0.24)',
  },
  dashboardTotalCard: {
    backgroundColor: '#132238',
    borderColor: 'rgba(59,130,246,0.24)',
  },
  dashboardGlowPurple: {
    position: 'absolute',
    top: -24,
    right: -22,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(139,92,246,0.16)',
  },
  dashboardGlowGreen: {
    position: 'absolute',
    top: -24,
    right: -22,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(16,185,129,0.16)',
  },
  dashboardGlowOrange: {
    position: 'absolute',
    top: -24,
    right: -22,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245,158,11,0.16)',
  },
  dashboardGlowBlue: {
    position: 'absolute',
    top: -24,
    right: -22,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(59,130,246,0.16)',
  },
  dashboardCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dashboardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardIcon: {
    fontSize: 20,
  },
  dashboardTag: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  dashboardValue: {
    color: '#ffffff',
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
    marginBottom: 5,
  },
  dashboardLabel: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },

  // ========== FILTER PANEL ==========
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
  filterPanelTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  filterPanelSubTitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 3,
  },
  filterPanelIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanelIcon: {
    fontSize: 18,
  },
  dateContainer: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingTop: 0,
    gap: 10,
  },
  dateBox: {
    flex: 1,
  },
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
  activeDateInput: {
    borderColor: '#3b82f6',
    backgroundColor: '#111c35',
  },
  dateValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    fontSize: 15,
    marginRight: 7,
  },
  dateValue: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  activeDateText: {
    color: '#ffffff',
  },
  placeholderText: {
    color: '#5b6b8c',
  },
  dateChevron: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 4,
  },
  clearDateBtn: {
    paddingHorizontal: 6,
  },
  clearDateText: {
    color: '#ec4899',
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  activeFiltersLabel: {
    fontSize: 9,
    color: '#94a3b8',
  },
  filtersScroll: {
    flex: 1,
    flexDirection: 'row',
  },
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
  filterBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '800',
  },
  filterBadgeClose: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
  },

  // ========== SUMMARY ==========
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  summaryHeaderSubText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  summaryHeaderPill: {
    backgroundColor: 'rgba(59,130,246,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.32)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  summaryHeaderPillText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCardPremium: {
    flex: 1,
    minHeight: 138,
    borderRadius: 20,
    padding: 16,
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
  statIcon: {
    fontSize: 25,
  },
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
    fontWeight: '800',
    color: '#e2e8f0',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  statSubLabel: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  pendingInsightBox: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: '#101a3f',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  pendingInsightItem: {
    flex: 1,
    minHeight: 78,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRightWidth: 2,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  pendingInsightItemLast: {
    borderRightWidth: 0,
  },
  pendingInsightTextWrap: {
    flex: 1,
    paddingRight: 6,
  },
  pendingInsightLabel: {
    color: '#a6b0ca',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  pendingInsightName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  pendingInsightDept: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  pendingInsightCount: {
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  pendingHighCount: {
    backgroundColor: '#ef4444',
  },
  pendingLowCount: {
    backgroundColor: '#10b981',
  },
  pendingInsightCountText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  departmentListHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  departmentListTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  departmentListSubTitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
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
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeLeftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeTitleSection: {
    flex: 1,
    paddingRight: 2,
  },
  badgeBuyerName: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 2,
  },
  badgeDeptName: {
    fontSize: 9,
    color: '#94a3b8',
  },
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
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressPercent: {
    minWidth: 28,
    textAlign: 'right',
    fontSize: 9,
    color: '#e2e8f0',
    fontWeight: '800',
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
  pendingBottomBadgeText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '900',
  },
  badgeFooterRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 8,
    fontWeight: '900',
  },
  tapHintText: {
    color: '#60a5fa',
    fontSize: 8,
    fontWeight: '800',
  },
  emptyState: {
    paddingVertical: 42,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 34,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyStateSubText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  centerLoader: {
    paddingVertical: 34,
    alignItems: 'center',
  },
  loaderText: {
    color: '#94a3b8',
    marginTop: 8,
    fontSize: 12,
  },

  // ========== SUMMARY PAGINATION ==========
  buyerPaginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  buyerPaginationInfo: {
    minWidth: 60,
  },
  buyerPaginationInfoText: {
    color: '#94a3b8',
    fontSize: 10,
  },
  buyerPaginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buyerPaginationButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buyerPaginationButtonDisabled: {
    opacity: 0.4,
  },
  buyerPaginationButtonText: {
    color: '#f1f5f9',
    fontSize: 12,
  },
  buyerPageNumbersScroll: {
    flexDirection: 'row',
    maxWidth: 150,
  },
  buyerPageNumberButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginHorizontal: 2,
    minWidth: 28,
    alignItems: 'center',
  },
  buyerPageNumberButtonActive: {
    backgroundColor: '#3b82f6',
  },
  buyerPageNumberText: {
    color: '#f1f5f9',
    fontSize: 11,
  },
  buyerPageNumberTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  buyerItemsPerPageContainer: {
    minWidth: 50,
  },
  buyerItemsPerPageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  buyerItemsPerPageText: {
    color: '#f1f5f9',
    fontSize: 11,
  },
  buyerItemsPerPageIcon: {
    color: '#5b6b8c',
    fontSize: 8,
  },

  // ========== TABLE ==========
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f111a',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  rowText: {
    fontSize: 11,
    color: '#f1f5f9',
  },
  columnStack: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    color: '#5b6b8c',
  },

  // ========== MODAL ==========
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
  modalBodyContent: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 4,
  },
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
  detailsHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsModalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  detailsModalIcon: {
    fontSize: 20,
  },
  detailsTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
  },
  modalSubTitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 3,
  },
  modalCloseCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239,68,68,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  modalCloseBtn: {
    fontSize: 16,
    color: '#fca5a5',
    fontWeight: '900',
  },
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
  modalStatValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  modalStatLabel: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '800',
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
  modalDateChipText: {
    color: '#bbf7d0',
    fontSize: 11,
    fontWeight: '800',
  },
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
  modalSearchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 12,
    padding: 0,
  },
  modalClearButton: {
    backgroundColor: 'rgba(236,72,153,0.14)',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.28)',
  },
  modalClearButtonText: {
    color: '#f472b6',
    fontSize: 11,
    fontWeight: '900',
  },
  modalTableShell: {
    flex: 1,
    minHeight: 120,
    marginHorizontal: 16,
    marginTop: 2,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  modalTableVerticalScroll: {
    flex: 1,
  },
  modalTableScrollContent: {
    paddingBottom: 4,
  },
  modalTableHeader: {
    backgroundColor: '#16213d',
    borderBottomColor: 'rgba(148,163,184,0.20)',
    paddingVertical: 13,
  },
  modalHeaderText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modalTableRow: {
    backgroundColor: '#0f172a',
    borderBottomColor: 'rgba(148,163,184,0.12)',
    paddingVertical: 13,
  },
  modalTableRowAlt: {
    backgroundColor: '#111c31',
  },
  modalRowText: {
    color: '#e2e8f0',
    fontSize: 11,
  },
  modalSerialCell: {
    color: '#93c5fd',
    fontWeight: '900',
  },
  modalPackingText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  modalColumnStack: {
    paddingVertical: 0,
    paddingRight: 10,
  },
  modalUpperText: {
    fontSize: 11,
    color: '#f8fafc',
    fontWeight: '800',
    marginBottom: 4,
  },
  modalLowerText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalValueText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  modalDateCell: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800',
  },
  modalStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    alignSelf: 'center',
  },
  modalStatusText: {
    fontSize: 10,
    fontWeight: '900',
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
  modalEmptyIcon: {
    fontSize: 34,
    marginBottom: 10,
  },
  modalEmptyTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '900',
  },
  modalEmptySubTitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 5,
  },

  // ========== COMPACT BANK MODAL TABLE ==========
  compactBankTableHeader: {
    flexDirection: 'row',
    minHeight: 42,
    backgroundColor: '#16213d',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.20)',
  },
  compactBankHeaderCell: {
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: 'rgba(148,163,184,0.12)',
  },
  compactBankHeaderText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  compactBankTableBody: {
    flex: 1,
    minHeight: 0,
  },
  compactBankTableContent: {
    paddingBottom: 4,
  },
  compactBankTableRow: {
    flexDirection: 'row',
    minHeight: 84,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.10)',
  },
  compactBankTableRowAlt: {
    backgroundColor: '#111c31',
  },
  compactBankBodyCell: {
    justifyContent: 'center',
    paddingHorizontal: 7,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(148,163,184,0.08)',
  },
  compactBankDocCol: {
    flex: 1.55,
  },
  compactBankQtyCol: {
    flex: 0.9,
  },
  compactBankDateCol: {
    flex: 1.05,
  },
  compactBankDocTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactBankSerialBadge: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.18)',
    color: '#93c5fd',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 20,
    marginRight: 5,
  },
  compactBankPackingText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  compactBankExportText: {
    color: '#c4b5fd',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 3,
  },
  compactBankCustomerText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  compactBankDeptText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },
  compactBankCartonText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
  },
  compactBankPcsText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 5,
  },
  compactBankValueText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '900',
  },
  compactBankDateLine: {
    marginBottom: 3,
  },
  compactBankDateLabel: {
    color: '#64748b',
    fontSize: 7,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  compactBankDateText: {
    color: '#86efac',
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '800',
  },
  compactBankStatusBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  compactBankStatusText: {
    fontSize: 8,
    fontWeight: '900',
  },

  // ========== MODAL PAGINATION ==========
  modalPaginationContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.14)',
    backgroundColor: '#0b1220',
  },
  modalPaginationInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  modalPaginationInfoText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  modalPaginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  modalPaginationButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
  },
  modalPaginationButtonDisabled: {
    opacity: 0.38,
  },
  modalPaginationButtonText: {
    color: '#f1f5f9',
    fontSize: 11,
    fontWeight: '800',
  },
  modalPageNumbersScroll: {
    flexGrow: 0,
    maxWidth: 140,
  },
  modalPageNumberButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 7,
    marginHorizontal: 2,
    minWidth: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  modalPageNumberButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  modalPageNumberText: {
    color: '#f1f5f9',
    fontSize: 11,
    fontWeight: '700',
  },
  modalPageNumberTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  modalItemsPerPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalItemsPerPageLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  modalItemsPerPageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    gap: 4,
  },
  modalItemsPerPageText: {
    color: '#f1f5f9',
    fontSize: 11,
    fontWeight: '800',
  },
  modalItemsPerPageIcon: {
    color: '#5b6b8c',
    fontSize: 8,
  },

  // ========== DATE PICKER ==========
  datePickerModal: {
    backgroundColor: '#12141c',
    borderRadius: 20,
    width: '90%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
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
  datePickerColumn: {
    alignItems: 'center',
    width: '30%',
  },
  datePickerLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
  },
  datePickerScroll: {
    height: 200,
    width: '100%',
  },
  datePickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    borderRadius: 8,
  },
  datePickerItemSelected: {
    backgroundColor: '#3b82f6',
  },
  datePickerItemText: {
    fontSize: 16,
    color: '#f1f5f9',
  },
  datePickerItemTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
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
  datePickerCancelText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  datePickerConfirm: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },

  errorContainer: {
    backgroundColor: 'rgba(236,72,153,0.15)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ec4899',
  },
  errorText: {
    color: '#f472b6',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default BankSubmitScreen;