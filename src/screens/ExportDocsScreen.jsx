// src/screens/ExportDocsScreen.js
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
  FlatList,
  Alert,
} from 'react-native';

const ExportDocsScreen = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exportData, setExportData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  // Buyer summary states - NEW API
  const [buyerSummaryData, setBuyerSummaryData] = useState([]);
  const [filteredBuyerData, setFilteredBuyerData] = useState([]);
  const [buyerLoading, setBuyerLoading] = useState(false);
  const [buyerSearchText, setBuyerSearchText] = useState('');
  const [buyerCurrentPage, setBuyerCurrentPage] = useState(1);
  const [buyerItemsPerPage, setBuyerItemsPerPage] = useState(20);
  const [buyerTotalItems, setBuyerTotalItems] = useState(0);

  // Pagination states for export data
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  // Date states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Department states
  const [departmentCode, setDepartmentCode] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentList, setDepartmentList] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentsFetched, setDepartmentsFetched] = useState(false);

  // Search state for export data
  const [searchText, setSearchText] = useState('');

  const [error, setError] = useState('');

  // Modal states for details
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalExportData, setModalExportData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDepartmentName, setModalDepartmentName] = useState('');
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(20);
  const [modalTotalItems, setModalTotalItems] = useState(0);
  const [modalFilteredData, setModalFilteredData] = useState([]);
  const [modalSearchText, setModalSearchText] = useState('');

  const API_BASE_URL = 'http://192.168.9.45:7000';

  // Simple date picker using number inputs
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [tempDay, setTempDay] = useState('');
  const [tempMonth, setTempMonth] = useState('');
  const [tempYear, setTempYear] = useState('');
  const [pickerType, setPickerType] = useState('from');

  // Generate days (1-31)
  const days = Array.from({length: 31}, (_, i) =>
    String(i + 1).padStart(2, '0'),
  );
  // Generate months (1-12)
  const months = Array.from({length: 12}, (_, i) =>
    String(i + 1).padStart(2, '0'),
  );
  // Generate years (2020-2030)
  const years = Array.from({length: 11}, (_, i) => String(2025 + i));

  // Fetch departments and buyer summary on component mount
  useEffect(() => {
    fetchDepartmentsAndSummary();
    fetchExportData();
  }, []);

  // Fetch departments AND buyer summary together
  const fetchDepartmentsAndSummary = async () => {
    setBuyerLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Export/Get-Pending-Export-Document-Count`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const dataArray = Array.isArray(data) ? data : data ? [data] : [];

      // New API returns department-wise rows.
      // Keep only departments with pending export documents.
      const pendingDepartments = dataArray
        .filter(item => (item?.pendingExportCount || 0) > 0)
        .map(item => ({
          ...item,

          // IMPORTANT: map new API field to old UI field
          pendingExpDocument: item?.pendingExportCount || 0,

          customerName: item?.customerName || item?.departmentName || 'Unknown',
          departmentName: item?.departmentName || item?.departmentCode || '-',
          departmentCode: item?.departmentCode || '',
        }))
        .sort(
          (a, b) => (b?.pendingExpDocument || 0) - (a?.pendingExpDocument || 0),
        );

      setBuyerSummaryData(pendingDepartments);
      setFilteredBuyerData(pendingDepartments);
      setBuyerTotalItems(pendingDepartments.length);

      // Optional dropdown source if you enable department selector later.
      setDepartmentList(pendingDepartments);
    } catch (error) {
      console.error('Error fetching pending summary:', error);
      setBuyerSummaryData([]);
      setFilteredBuyerData([]);
      setBuyerTotalItems(0);
      setDepartmentList([]);
    } finally {
      setBuyerLoading(false);
      setDepartmentsFetched(true);
    }
  };

  // Search filter for buyer table
  const handleBuyerSearch = text => {
    setBuyerSearchText(text);
    setBuyerCurrentPage(1);

    if (!Array.isArray(buyerSummaryData)) {
      setFilteredBuyerData([]);
      setBuyerTotalItems(0);
      return;
    }

    const searchLower = text.toLowerCase();
    const filtered = buyerSummaryData.filter(
      item =>
        item.customerName?.toLowerCase().includes(searchLower) ||
        item.departmentCode?.toLowerCase().includes(searchLower) ||
        item.departmentName?.toLowerCase().includes(searchLower),
    );
    setFilteredBuyerData(filtered);
    setBuyerTotalItems(filtered.length);
  };

  // Clear buyer search
  const clearBuyerSearch = () => {
    setBuyerSearchText('');
    setFilteredBuyerData(buyerSummaryData);
    setBuyerTotalItems(buyerSummaryData.length);
    setBuyerCurrentPage(1);
  };

  // Get current page data for buyer table
  const getCurrentBuyerPageData = () => {
    const startIndex = (buyerCurrentPage - 1) * buyerItemsPerPage;
    const endIndex = startIndex + buyerItemsPerPage;
    return buyerSafeFilteredData.slice(startIndex, endIndex);
  };

  const buyerSafeFilteredData = Array.isArray(filteredBuyerData)
    ? filteredBuyerData
    : [];
  const buyerTotalPages = Math.ceil(
    buyerSafeFilteredData.length / buyerItemsPerPage,
  );
  const buyerCurrentPageData = getCurrentBuyerPageData();

  // Buyer pagination handlers
  const goToNextBuyerPage = () => {
    if (buyerCurrentPage < buyerTotalPages) {
      setBuyerCurrentPage(buyerCurrentPage + 1);
    }
  };

  const goToPrevBuyerPage = () => {
    if (buyerCurrentPage > 1) {
      setBuyerCurrentPage(buyerCurrentPage - 1);
    }
  };

  const goToBuyerPage = page => {
    setBuyerCurrentPage(page);
  };

  // Calculate total pending for buyer summary
  const totalPendingBuyers = buyerSafeFilteredData.reduce(
    (sum, item) => sum + (item.pendingExpDocument || 0),
    0,
  );
  const totalBuyerCount = buyerSafeFilteredData.length;

  const maxPending =
    buyerSafeFilteredData.length > 0
      ? Math.max(
          ...buyerSafeFilteredData.map(item => item?.pendingExpDocument || 0),
        )
      : 0;

  const sortedPendingData = [...buyerSafeFilteredData].sort(
    (a, b) => (b?.pendingExpDocument || 0) - (a?.pendingExpDocument || 0),
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

  const cardIcons = ['👥', '👔', '🏬', '👜', '🛒', '📦', '📑', '🏭'];

  const getDisplayName = item =>
    item?.customerName || item?.departmentName || 'Unknown';

  const getDepartmentSubText = item =>
    item?.departmentName || item?.departmentCode || '-';

  const getPendingPercentage = pending => {
    if (!maxPending || maxPending <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((pending / maxPending) * 100));
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
        priority: 'High Priority',
      };
    }

    if (percentage >= 40) {
      return {
        label: 'Medium',
        textColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.14)',
        borderColor: 'rgba(245,158,11,0.42)',
        priority: 'Medium Priority',
      };
    }

    return {
      label: 'Low',
      textColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.14)',
      borderColor: 'rgba(16,185,129,0.42)',
      priority: 'Low Priority',
    };
  };

  // Generate buyer page numbers
  const getBuyerPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      buyerCurrentPage - Math.floor(maxVisiblePages / 2),
    );
    let endPage = Math.min(buyerTotalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  // Buyer Pagination Component
  const renderBuyerPagination = () => {
    if (buyerTotalPages <= 1) {
      return null;
    }

    const pageNumbers = getBuyerPageNumbers();
    const startItem = (buyerCurrentPage - 1) * buyerItemsPerPage + 1;
    const endItem = Math.min(
      buyerCurrentPage * buyerItemsPerPage,
      buyerSafeFilteredData.length,
    );

    return (
      <View style={styles.buyerPaginationContainer}>
        <View style={styles.buyerPaginationInfo}>
          <Text style={styles.buyerPaginationInfoText}>
            {startItem}-{endItem} of {buyerSafeFilteredData.length}
          </Text>
        </View>

        <View style={styles.buyerPaginationControls}>
          <TouchableOpacity
            style={[
              styles.buyerPaginationButton,
              buyerCurrentPage === 1 && styles.buyerPaginationButtonDisabled,
            ]}
            onPress={goToPrevBuyerPage}
            disabled={buyerCurrentPage === 1}>
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
                  buyerCurrentPage === pageNum &&
                    styles.buyerPageNumberButtonActive,
                ]}
                onPress={() => goToBuyerPage(pageNum)}>
                <Text
                  style={[
                    styles.buyerPageNumberText,
                    buyerCurrentPage === pageNum &&
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
              buyerCurrentPage === buyerTotalPages &&
                styles.buyerPaginationButtonDisabled,
            ]}
            onPress={goToNextBuyerPage}
            disabled={buyerCurrentPage === buyerTotalPages}>
            <Text style={styles.buyerPaginationButtonText}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buyerItemsPerPageContainer}>
          <TouchableOpacity
            style={styles.buyerItemsPerPageSelector}
            onPress={() => {
              const newItemsPerPage =
                buyerItemsPerPage === 20
                  ? 50
                  : buyerItemsPerPage === 50
                  ? 100
                  : 20;
              setBuyerItemsPerPage(newItemsPerPage);
              setBuyerCurrentPage(1);
            }}>
            <Text style={styles.buyerItemsPerPageText}>
              {buyerItemsPerPage}
            </Text>
            <Text style={styles.buyerItemsPerPageIcon}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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

  // Helper function to parse date string (DD-MM-YYYY)
  const parseDateString = dateStr => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return null;
  };

  const filterBySelectedDates = data => {
    if (!Array.isArray(data)) {
      return [];
    }

    const fromDateObj = fromDate ? parseDateString(fromDate) : null;
    const toDateObj = toDate ? parseDateString(toDate) : null;

    if (!fromDateObj && !toDateObj) {
      return data;
    }

    return data.filter(item => {
      if (!item?.exFacDate) {
        return false;
      }

      const itemDate = new Date(item.exFacDate);

      if (fromDateObj && itemDate < fromDateObj) {
        return false;
      }

      if (toDateObj && itemDate > toDateObj) {
        return false;
      }

      return true;
    });
  };

  // Helper function to filter data by search text
  const filterDataBySearch = (data, text) => {
    if (!text || !Array.isArray(data)) {
      return data;
    }

    return data.filter(
      item =>
        (item.packagingListNo &&
          item.packagingListNo
            .toString()
            .toLowerCase()
            .includes(text.toLowerCase())) ||
        (item.customerName &&
          item.customerName.toLowerCase().includes(text.toLowerCase())) ||
        (item.styleCode &&
          item.styleCode &&
          item.styleCode.toLowerCase().includes(text.toLowerCase())) ||
        (item.expDocumentNo &&
          item.expDocumentNo &&
          item.expDocumentNo.toLowerCase().includes(text.toLowerCase())) ||
        (item.departmentName &&
          item.departmentName.toLowerCase().includes(text.toLowerCase())),
    );
  };

  // Fetch Export Data for Modal
  const fetchModalExportData = async (deptCode, deptName) => {
    setModalLoading(true);

    try {
      let url = `${API_BASE_URL}/api/Export/Get-By-Dept-Export-Docment-List?depName=${encodeURIComponent(
        deptCode || '',
      )}`;

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

      const data = await response.json();

      let dataArray = Array.isArray(data) ? data : data ? [data] : [];

      const dateFilteredArray = filterBySelectedDates(dataArray);

      setModalExportData(dateFilteredArray);
      setModalFilteredData(dateFilteredArray);
      setModalTotalItems(dateFilteredArray.length);
      setModalCurrentPage(1);
      setModalDepartmentName(deptName);
    } catch (error) {
      console.error('Fetch error:', error);
      setModalExportData([]);
      setModalFilteredData([]);
      setModalTotalItems(0);
    } finally {
      setModalLoading(false);
    }
  };

  // Modal search handler
  const handleModalSearch = text => {
    setModalSearchText(text);
    setModalCurrentPage(1);

    if (!Array.isArray(modalExportData)) {
      setModalFilteredData([]);
      setModalTotalItems(0);
      return;
    }

    const filtered = filterDataBySearch(modalExportData, text);
    setModalFilteredData(filtered);
    setModalTotalItems(filtered.length);
  };

  // Modal pagination
  const getModalCurrentPageData = () => {
    const startIndex = (modalCurrentPage - 1) * modalItemsPerPage;
    const endIndex = startIndex + modalItemsPerPage;
    return modalSafeFilteredData.slice(startIndex, endIndex);
  };

  const modalSafeFilteredData = Array.isArray(modalFilteredData)
    ? modalFilteredData
    : [];
  const modalTotalPages = Math.ceil(
    modalSafeFilteredData.length / modalItemsPerPage,
  );
  const modalCurrentPageData = getModalCurrentPageData();

  const goToNextModalPage = () => {
    if (modalCurrentPage < modalTotalPages) {
      setModalCurrentPage(modalCurrentPage + 1);
    }
  };

  const goToPrevModalPage = () => {
    if (modalCurrentPage > 1) {
      setModalCurrentPage(modalCurrentPage - 1);
    }
  };

  const goToModalPage = page => {
    setModalCurrentPage(page);
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

  // Modal Pagination Component
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
      <View style={styles.paginationContainer}>
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationInfoText}>
            Showing {startItem} - {endItem} of {modalSafeFilteredData.length}{' '}
            records
          </Text>
        </View>

        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              modalCurrentPage === 1 && styles.paginationButtonDisabled,
            ]}
            onPress={goToPrevModalPage}
            disabled={modalCurrentPage === 1}>
            <Text style={styles.paginationButtonText}>Previous</Text>
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
                onPress={() => goToModalPage(pageNum)}>
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
            onPress={goToNextModalPage}
            disabled={modalCurrentPage === modalTotalPages}>
            <Text style={styles.paginationButtonText}>Next</Text>
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

  // Handle badge click - open modal with department details
  const handleBadgeClick = async item => {
    const displayTitle =
      item?.customerName && item?.departmentName
        ? `${item.customerName} • ${item.departmentName}`
        : item?.customerName || item?.departmentName || 'Unknown';

    setModalDepartmentName(displayTitle);
    await fetchModalExportData(item?.departmentCode, displayTitle);
    setShowDetailsModal(true);
  };

  // Fetch Export Data from API with department parameter
  const fetchExportData = async () => {
    setLoading(true);
    setError('');

    try {
      let url = `${API_BASE_URL}/api/Export/Get-By-Dept-Export-Docment-List`;

      if (departmentCode) {
        url += `?depName=${encodeURIComponent(departmentCode)}`;
      }

      console.log('Fetching URL:', url);

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

      const data = await response.json();
      console.log(
        'Data received:',
        Array.isArray(data) ? data.length : 'Not array',
      );

      let dataArray = [];
      if (Array.isArray(data)) {
        dataArray = data;
      } else if (data && typeof data === 'object') {
        dataArray = [data];
      } else {
        dataArray = [];
      }

      let filteredByDate = dataArray;
      if (fromDate && toDate) {
        const fromDateObj = parseDateString(fromDate);
        const toDateObj = parseDateString(toDate);

        filteredByDate = dataArray.filter(item => {
          if (!item.exFacDate) {
            return false;
          }
          const itemDate = new Date(item.exFacDate);
          return itemDate >= fromDateObj && itemDate <= toDateObj;
        });
      } else if (fromDate) {
        const fromDateObj = parseDateString(fromDate);
        filteredByDate = dataArray.filter(item => {
          if (!item.exFacDate) {
            return false;
          }
          return new Date(item.exFacDate) >= fromDateObj;
        });
      } else if (toDate) {
        const toDateObj = parseDateString(toDate);
        filteredByDate = dataArray.filter(item => {
          if (!item.exFacDate) {
            return false;
          }
          return new Date(item.exFacDate) <= toDateObj;
        });
      }

      setExportData(filteredByDate);
      setTotalItems(filteredByDate.length);
      setCurrentPage(1);

      if (searchText) {
        const filtered = filterDataBySearch(filteredByDate, searchText);
        setFilteredData(filtered);
        setTotalItems(filtered.length);
      } else {
        setFilteredData(filteredByDate);
      }

      setError('');
    } catch (error) {
      console.error('Fetch error:', error);
      setError(`Network error: ${error.message}`);
      setExportData([]);
      setFilteredData([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // Search filter for export data
  const handleSearch = text => {
    setSearchText(text);
    setCurrentPage(1);

    if (!Array.isArray(exportData)) {
      setFilteredData([]);
      setTotalItems(0);
      return;
    }

    const filtered = filterDataBySearch(exportData, text);
    setFilteredData(filtered);
    setTotalItems(filtered.length);
  };

  // Get current page data for export table
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return safeFilteredData.slice(startIndex, endIndex);
  };

  // Pagination handlers for export table
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = page => {
    setCurrentPage(page);
  };

  const handleDepartmentSelect = dept => {
    setDepartmentCode(dept.departmentCode);
    setDepartmentName(dept.departmentName);
    setCustomerName(dept.customerName || dept.departmentName);
    setSelectedDepartmentId(dept.departmentId);
    setShowDepartmentModal(false);
    setSearchText('');
    setCurrentPage(1);

    setTimeout(() => {
      fetchExportData();
    }, 100);
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchDepartmentsAndSummary(), fetchExportData()]).then(() => {
      setRefreshing(false);
    });
  };

  const clearFilters = () => {
    setSearchText('');
    setFilteredData(exportData);
    setTotalItems(exportData.length);
    setCurrentPage(1);
  };

  const handleApply = () => {
    fetchExportData();
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Filters',
      'Are you sure you want to reset all filters?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          onPress: () => {
            setDepartmentCode('');
            setDepartmentName('');
            setCustomerName('');
            setSelectedDepartmentId(null);
            setFromDate('');
            setToDate('');
            setSearchText('');
            setCurrentPage(1);
            setError('');

            setTimeout(() => {
              fetchExportData();
            }, 100);
          },
          style: 'destructive',
        },
      ],
    );
  };

  const safeFilteredData = Array.isArray(filteredData) ? filteredData : [];
  const totalPages = Math.ceil(safeFilteredData.length / itemsPerPage);
  const currentPageData = getCurrentPageData();

  // Generate page numbers for export pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  // Export Pagination Component
  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    const pageNumbers = getPageNumbers();
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(
      currentPage * itemsPerPage,
      safeFilteredData.length,
    );

    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationInfoText}>
            Showing {startItem} - {endItem} of {safeFilteredData.length} records
          </Text>
        </View>

        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              currentPage === 1 && styles.paginationButtonDisabled,
            ]}
            onPress={goToPrevPage}
            disabled={currentPage === 1}>
            <Text
              style={[
                styles.paginationButtonText,
                currentPage === 1 && styles.paginationButtonTextDisabled,
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
                  currentPage === pageNum && styles.pageNumberButtonActive,
                ]}
                onPress={() => goToPage(pageNum)}>
                <Text
                  style={[
                    styles.pageNumberText,
                    currentPage === pageNum && styles.pageNumberTextActive,
                  ]}>
                  {pageNum}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.paginationButton,
              currentPage === totalPages && styles.paginationButtonDisabled,
            ]}
            onPress={goToNextPage}
            disabled={currentPage === totalPages}>
            <Text
              style={[
                styles.paginationButtonText,
                currentPage === totalPages &&
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
                itemsPerPage === 20 ? 50 : itemsPerPage === 50 ? 100 : 20;
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}>
            <Text style={styles.itemsPerPageText}>{itemsPerPage}</Text>
            <Text style={styles.itemsPerPageIcon}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Date Picker Component
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

  // Department Modal - Shows ONLY departments with pending items
  const renderDepartmentModal = () => (
    <Modal visible={showDepartmentModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.departmentModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Select Department (With Pending)
            </Text>
            <TouchableOpacity onPress={() => setShowDepartmentModal(false)}>
              <Text style={styles.modalCloseBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {loadingDepartments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading departments...</Text>
            </View>
          ) : departmentList.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                No departments with pending documents
              </Text>
            </View>
          ) : (
            <FlatList
              data={departmentList}
              keyExtractor={item => item.departmentId.toString()}
              showsVerticalScrollIndicator={true}
              style={styles.departmentList}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.departmentItem,
                    selectedDepartmentId === item.departmentId &&
                      styles.departmentItemSelected,
                  ]}
                  onPress={() => handleDepartmentSelect(item)}>
                  <View style={styles.departmentItemContent}>
                    <Text
                      style={[
                        styles.departmentNameText,
                        selectedDepartmentId === item.departmentId &&
                          styles.departmentItemTextSelected,
                      ]}>
                      {item.customerName ||
                        item.departmentName ||
                        'Unnamed Department'}
                    </Text>
                    <Text style={styles.buyerNameText}>
                      Dept: {item.departmentName} | Code: {item.departmentCode}
                    </Text>
                  </View>
                  {selectedDepartmentId === item.departmentId && (
                    <Text style={styles.checkIcon}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  // Details Modal Component
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
                <Text style={styles.detailsModalIcon}>📄</Text>
              </View>
              <View style={styles.detailsTitleWrap}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {modalDepartmentName}
                </Text>
                <Text style={styles.modalSubTitle} numberOfLines={1}>
                  {fromDate || toDate
                    ? `${fromDate || 'Start'} → ${toDate || 'Today'}`
                    : 'All export documents'}
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
                  placeholder="Search packing, customer, style..."
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
                    setModalTotalItems(modalExportData.length);
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
              <Text style={styles.loaderText}>Loading export documents...</Text>
            </View>
          ) : modalCurrentPageData.length > 0 ? (
            <View style={styles.modalResultBody}>
              <View style={styles.modalTableShell}>
                <View style={styles.compactModalTableHeader}>
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
                  style={styles.compactModalTableBody}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}>
                  {modalCurrentPageData.map((item, index) => (
                    <View
                      key={`${item?.packagingListNo || index}-${index}`}
                      style={[
                        styles.compactModalTableRow,
                        index % 2 === 0 && styles.compactModalTableRowAlt,
                      ]}>
                      <View
                        style={[styles.compactBodyCell, styles.compactDocCol]}>
                        <View style={styles.compactDocTopRow}>
                          <Text style={styles.compactSerialBadge}>
                            {(modalCurrentPage - 1) * modalItemsPerPage +
                              index +
                              1}
                          </Text>

                          <Text
                            style={styles.compactPackingNo}
                            numberOfLines={1}>
                            {item.packagingListNo || '-'}
                          </Text>
                        </View>

                        <Text
                          style={styles.compactCustomerText}
                          numberOfLines={1}>
                          {item.customerName || '-'}
                        </Text>

                        <Text style={styles.compactDeptText} numberOfLines={1}>
                          {item.departmentName || '-'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.compactBodyCell,
                          styles.compactValueCol,
                        ]}>
                        <Text style={styles.compactValueText} numberOfLines={1}>
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
              <Text style={styles.modalEmptyTitle}>
                No export records found
              </Text>
              <Text style={styles.modalEmptySubTitle}>
                Try changing the selected date range.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  // Check if any filter is active
  const hasActiveFilters = () => {
    return fromDate !== '' || toDate !== '' || selectedDepartmentId !== null;
  };

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
            <Text style={styles.filterPanelTitle}>Export Filter</Text>
            <Text style={styles.filterPanelSubTitle}>
              Choose date range before opening a card
            </Text>
          </View>
          <View style={styles.filterPanelIconBox}>
            <Text style={styles.filterPanelIcon}>⚙️</Text>
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

      {/* Department Selector - Commented as per your request */}
      {/* <View style={styles.departmentContainer}>
        <TouchableOpacity
          style={[
            styles.departmentSelector,
            selectedDepartmentId !== null && styles.activeDepartmentSelector
          ]}
          onPress={() => setShowDepartmentModal(true)}>
          <Text style={styles.departmentIcon}>🏭</Text>
          <View style={styles.departmentInfo}>
            <Text style={[
              styles.departmentValue,
              selectedDepartmentId !== null && styles.activeDepartmentText
            ]}>
              {selectedDepartmentId
                ? customerName || departmentName || 'All Departments'
                : 'All Departments (With Pending)'}
            </Text>
          </View>
          <Text style={styles.dropdownIcon}>▼</Text>
          {selectedDepartmentId !== null && (
            <TouchableOpacity
              onPress={() => {
                setDepartmentCode('');
                setDepartmentName('');
                setCustomerName('');
                setSelectedDepartmentId(null);
                setTimeout(() => fetchExportData(), 100);
              }}
              style={styles.clearDeptBtn}>
              <Text style={styles.clearDateText}>✕</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View> */}

      {/* Active Filters Badge Row */}
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
            {selectedDepartmentId !== null && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  Dept: {departmentName}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setDepartmentCode('');
                    setDepartmentName('');
                    setCustomerName('');
                    setSelectedDepartmentId(null);
                    setTimeout(() => fetchExportData(), 100);
                  }}>
                  <Text style={styles.filterBadgeClose}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* ========== PENDING SUMMARY - PREMIUM CARD DESIGN ========== */}
      <View style={styles.buyerSummarySection}>
        <View style={styles.summaryHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>📊 Pending Summary</Text>
            <Text style={styles.summaryHeaderSubText}>
              Overview by active department
            </Text>
          </View>

          <View style={styles.summaryHeaderPill}>
            <Text style={styles.summaryHeaderPillText}>
              {totalBuyerCount} Depts
            </Text>
          </View>
        </View>

        {/* Premium Summary Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCardPremium, styles.departmentStatCard]}>
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

            <Text style={styles.statValue}>{totalBuyerCount}</Text>
            <Text style={styles.statTitle}>Departments</Text>
            <Text style={styles.statSubLabel}>
              Available active departments
            </Text>
          </View>

          <View style={[styles.statCardPremium, styles.totalDocsStatCard]}>
            <View style={styles.statGlowGreen} />
            <View style={styles.statDecorRing} />

            <View style={styles.statTopRow}>
              <View
                style={[
                  styles.statIconWrap,
                  {backgroundColor: 'rgba(16,185,129,0.20)'},
                ]}>
                <Text style={styles.statIcon}>📄</Text>
              </View>

              <View style={[styles.statMiniBadge, styles.statMiniBadgeGreen]}>
                <Text style={styles.statMiniBadgeText}>Pending</Text>
              </View>
            </View>

            <Text style={styles.statValue}>{totalPendingBuyers}</Text>
            <Text style={styles.statTitle}>Total Documents</Text>
            <Text style={styles.statSubLabel}>Pending export documents</Text>
          </View>
        </View>

        {/* Highest / Lowest Pending */}
        {!buyerLoading && buyerSafeFilteredData.length > 0 && (
          <View style={styles.pendingInsightBox}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.pendingInsightItem}
              onPress={() =>
                highestPendingItem && handleBadgeClick(highestPendingItem)
              }>
              <View style={styles.pendingInsightTextBlock}>
                <Text style={styles.pendingInsightLabel}>Highest Pending</Text>
                <Text
                  style={styles.pendingInsightCustomerName}
                  numberOfLines={1}>
                  {highestPendingItem?.customerName || 'Unknown'}
                </Text>
                <Text
                  style={styles.pendingInsightDepartmentName}
                  numberOfLines={1}>
                  {highestPendingItem?.departmentName ||
                    highestPendingItem?.departmentCode ||
                    '-'}
                </Text>
              </View>

              <View
                style={[styles.pendingInsightCount, styles.pendingHighCount]}>
                <Text style={styles.pendingInsightCountText}>
                  {highestPendingItem?.pendingExpDocument || 0}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.pendingInsightItem, styles.pendingInsightItemLast]}
              onPress={() =>
                lowestPendingItem && handleBadgeClick(lowestPendingItem)
              }>
              <View style={styles.pendingInsightTextBlock}>
                <Text style={styles.pendingInsightLabel}>Lowest Pending</Text>
                <Text
                  style={styles.pendingInsightCustomerName}
                  numberOfLines={1}>
                  {lowestPendingItem?.customerName || 'Unknown'}
                </Text>
                <Text
                  style={styles.pendingInsightDepartmentName}
                  numberOfLines={1}>
                  {lowestPendingItem?.departmentName ||
                    lowestPendingItem?.departmentCode ||
                    '-'}
                </Text>
              </View>

              <View
                style={[styles.pendingInsightCount, styles.pendingLowCount]}>
                <Text style={styles.pendingInsightCountText}>
                  {lowestPendingItem?.pendingExpDocument || 0}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.departmentListHeader}>
          <Text style={styles.departmentListTitle}>Pending by Department</Text>
          <Text style={styles.departmentListSubTitle}>
            Tap any card for details
          </Text>
        </View>

        {/* Department Cards */}
        {buyerLoading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loaderText}>Loading pending summary...</Text>
          </View>
        ) : (
          buyerCurrentPageData.length > 0 && (
            <>
              <View style={styles.badgeGrid}>
                {buyerCurrentPageData.map((item, index) => {
                  const pending = item?.pendingExpDocument || 0;
                  const accentColor =
                    cardAccentColors[index % cardAccentColors.length];
                  const softColor =
                    cardSoftColors[index % cardSoftColors.length];
                  const icon = cardIcons[index % cardIcons.length];
                  const percentage = getPendingPercentage(pending);
                  const statusMeta = getStatusMeta(pending);

                  return (
                    <TouchableOpacity
                      key={`${
                        item?.departmentCode || item?.customerName || index
                      }-${index}`}
                      activeOpacity={0.88}
                      style={[
                        styles.badgeCard,
                        selectedDepartmentId &&
                          departmentCode === item?.departmentCode &&
                          styles.activeBadgeCard,
                        {borderLeftColor: accentColor},
                      ]}
                      onPress={() => handleBadgeClick(item)}>
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
                            <Text
                              style={styles.badgeBuyerName}
                              numberOfLines={2}>
                              {getDisplayName(item)}
                            </Text>
                            <Text
                              style={styles.badgeDeptName}
                              numberOfLines={1}>
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
                        <Text style={styles.progressPercent}>
                          {percentage}%
                        </Text>
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

              {renderBuyerPagination()}
            </>
          )
        )}

        {!buyerLoading && buyerCurrentPageData.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>✅</Text>
            <Text style={styles.emptyStateText}>
              No pending documents found
            </Text>
            <Text style={styles.emptyStateSubText}>
              All departments are up to date
            </Text>
          </View>
        )}
      </View>

      {/* Date Pickers */}
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

      {/* Department Modal */}
      {renderDepartmentModal()}

      {/* Details Modal */}
      {renderDetailsModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c12',
  },
  // ========== PREMIUM PENDING SUMMARY STYLES ==========
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
    minHeight: 158,
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
    paddingHorizontal: 9,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRightWidth: 2,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  pendingInsightItemLast: {
    borderRightWidth: 0,
  },
  pendingInsightTextBlock: {
    flex: 1,
    paddingRight: 8,
  },
  pendingInsightLabel: {
    color: '#a6b0ca',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },
  pendingInsightCustomerName: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
    marginBottom: 2,
  },
  pendingInsightDepartmentName: {
    color: '#94a3b8',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  pendingInsightName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    maxWidth: 104,
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
  activeBadgeCard: {
    borderColor: '#3b82f6',
    backgroundColor: '#1a2232',
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
  badgePendingContainer: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePendingText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
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
  badgeFooterText: {
    fontSize: 10,
    color: '#94a3b8',
    flex: 1,
    marginRight: 8,
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
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    color: '#5b6b8c',
  },
  searchInputField: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 13,
    padding: 0,
  },
  clearButtonText: {
    color: '#ec4899',
    fontSize: 12,
  },
  // Buyer Pagination Styles
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
  // ========== EXISTING STYLES ==========
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e293b',
  },
  dividerText: {
    fontSize: 12,
    color: '#94a3b8',
    paddingHorizontal: 12,
  },
  departmentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  departmentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  activeDepartmentSelector: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e2a3a',
  },
  departmentIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  departmentInfo: {
    flex: 1,
  },
  departmentValue: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '500',
  },
  activeDepartmentText: {
    color: '#3b82f6',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#5b6b8c',
  },
  dateContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  dateBox: {
    flex: 1,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  activeDateInput: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e2a3a',
  },
  dateIcon: {
    fontSize: 16,
    marginRight: 10,
    color: '#5b6b8c',
  },
  dateValue: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 14,
  },
  activeDateText: {
    color: '#3b82f6',
  },
  placeholderText: {
    color: '#5b6b8c',
  },
  clearDateBtn: {
    paddingHorizontal: 6,
  },
  clearDateText: {
    color: '#ec4899',
    fontSize: 14,
    fontWeight: 'bold',
  },
  clearDeptBtn: {
    paddingHorizontal: 6,
    marginLeft: 8,
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
  },
  filterBadgeClose: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonActive: {
    backgroundColor: '#3b82f6',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 13,
    padding: 0,
  },
  clearSearchText: {
    color: '#ec4899',
    fontSize: 12,
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
  resultsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  resultsText: {
    color: '#94a3b8',
    fontSize: 12,
  },
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
  noDataContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  noDataText: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 8,
  },
  noDataSubtext: {
    color: '#5b6b8c',
    fontSize: 12,
  },
  paginationContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 6,
  },
  paginationInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  paginationInfoText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  paginationButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  paginationButtonDisabled: {
    backgroundColor: '#0f111a',
    opacity: 0.5,
  },
  paginationButtonText: {
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: '500',
  },
  paginationButtonTextDisabled: {
    color: '#5b6b8c',
  },
  pageNumbersScroll: {
    flexDirection: 'row',
    maxWidth: 200,
  },
  pageNumberButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  pageNumberButtonActive: {
    backgroundColor: '#3b82f6',
  },
  pageNumberText: {
    color: '#f1f5f9',
    fontSize: 12,
  },
  pageNumberTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  itemsPerPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  itemsPerPageLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  itemsPerPageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  itemsPerPageText: {
    color: '#f1f5f9',
    fontSize: 12,
  },
  itemsPerPageIcon: {
    color: '#5b6b8c',
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  departmentModal: {
    backgroundColor: '#12141c',
    borderRadius: 20,
    width: '85%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  detailsModalContainer: {
    backgroundColor: '#12141c',
    borderRadius: 20,
    width: '95%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  modalCloseBtn: {
    fontSize: 18,
    color: '#94a3b8',
    padding: 4,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 12,
    gap: 12,
  },
  modalSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalSearchInput: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 13,
    padding: 0,
  },
  departmentList: {
    maxHeight: 400,
  },
  departmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  departmentItemSelected: {
    backgroundColor: '#1e293b',
  },
  departmentItemContent: {
    flex: 1,
  },
  departmentNameText: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  buyerNameText: {
    color: '#5b6b8c',
    fontSize: 12,
  },
  departmentItemTextSelected: {
    color: '#3b82f6',
  },
  checkIcon: {
    color: '#3b82f6',
    fontSize: 16,
    marginLeft: 12,
  },
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
  columnStack: {
    flexDirection: 'column',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  upperText: {
    fontSize: 11,
    color: '#f1f5f9',
    fontWeight: '500',
    marginBottom: 4,
  },
  lowerText: {
    fontSize: 10,
    color: '#94a3b8',
  },

  // ========== UPDATED FILTER PANEL STYLES ==========
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
  dateChevron: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingTop: 14,
    paddingBottom: 0,
    gap: 10,
  },
  applyButton: {
    flex: 1,
    minHeight: 50,
    backgroundColor: '#1655ff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#1655ff',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  resetButton: {
    flex: 1,
    minHeight: 50,
    backgroundColor: '#ef4444',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },

  // ========== UPDATED MODAL STYLES ==========
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
    height: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  modalResultBody: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 8,
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
  modalListScroll: {
    paddingHorizontal: 16,
    maxHeight: 430,
  },
  exportCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  exportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exportSerialBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exportSerialText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  exportCardTitleWrap: {
    flex: 1,
  },
  exportPackingNo: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  exportCustomerText: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  exportDateBadge: {
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.24)',
  },
  exportDateText: {
    color: '#86efac',
    fontSize: 9,
    fontWeight: '900',
  },
  exportInfoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  exportInfoBox: {
    flex: 1,
    backgroundColor: '#0b1220',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  exportInfoLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 3,
  },
  exportInfoValue: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '900',
  },
  exportValueText: {
    color: '#34d399',
  },
  modalTableShell: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: 16,
    marginTop: 2,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  modalTableVerticalScroll: {
    maxHeight: 430,
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
  },
  modalDateCell: {
    color: '#86efac',
    fontSize: 10,
    fontWeight: '800',
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
  compactModalTableHeader: {
    flexDirection: 'row',
    minHeight: 42,
    backgroundColor: '#16213d',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.20)',
  },

  compactHeaderCell: {
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: 'rgba(148,163,184,0.12)',
  },

  compactHeaderText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  compactModalTableBody: {
    flex: 1,
    minHeight: 0,
  },

  compactModalTableRow: {
    flexDirection: 'row',
    minHeight: 66,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.10)',
  },

  compactModalTableRowAlt: {
    backgroundColor: '#111c31',
  },

  compactBodyCell: {
    justifyContent: 'center',
    paddingHorizontal: 7,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(148,163,184,0.08)',
  },

  compactDocCol: {
    flex: 1.55,
  },

  compactValueCol: {
    flex: 0.9,
  },

  compactDateCol: {
    flex: 0.78,
  },

  compactDocTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  compactSerialBadge: {
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

  compactPackingNo: {
    flex: 1,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },

  compactCustomerText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },

  compactDeptText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },

  compactValueText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
  },

  compactPcsText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '700',
  },

  compactDateText: {
    color: '#86efac',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 13,
  },
});

export default ExportDocsScreen;