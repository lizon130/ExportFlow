// src/screens/ShippingScreen.js
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

const ShippingScreen = () => {
  const [refreshing, setRefreshing] = useState(false);

  // Pending shipping summary states
  const [shippingSummaryData, setShippingSummaryData] = useState([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingCurrentPage, setShippingCurrentPage] = useState(1);
  const [shippingItemsPerPage, setShippingItemsPerPage] = useState(20);

  // Date states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalShippingData, setModalShippingData] = useState([]);
  const [modalFilteredData, setModalFilteredData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDepartmentName, setModalDepartmentName] = useState('');
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(20);
  const [modalSearchText, setModalSearchText] = useState('');

  const [error, setError] = useState('');

  const API_BASE_URL = 'http://192.168.9.45:7000';

  // Date picker states
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
  const years = Array.from({length: 11}, (_, i) => String(2025 + i));

  useEffect(() => {
    fetchShippingSummary();
  }, []);

  useEffect(() => {
    const totalPages = Math.ceil(
      (Array.isArray(modalFilteredData) ? modalFilteredData.length : 0) /
        modalItemsPerPage,
    );

    if (totalPages > 0 && modalCurrentPage > totalPages) {
      setModalCurrentPage(totalPages);
    }
  }, [modalFilteredData, modalItemsPerPage, modalCurrentPage]);

  const shippingSafeData = Array.isArray(shippingSummaryData)
    ? shippingSummaryData
    : [];

  const shippingTotalPages = Math.ceil(
    shippingSafeData.length / shippingItemsPerPage,
  );

  const getCurrentShippingPageData = () => {
    const startIndex = (shippingCurrentPage - 1) * shippingItemsPerPage;
    const endIndex = startIndex + shippingItemsPerPage;
    return shippingSafeData.slice(startIndex, endIndex);
  };

  const shippingCurrentPageData = getCurrentShippingPageData();

  const totalPendingShipping = shippingSafeData.reduce(
    (sum, item) => sum + (item?.pendingShipping || 0),
    0,
  );

  const totalDepartmentCount = shippingSafeData.length;

  const maxPendingShipping =
    shippingSafeData.length > 0
      ? Math.max(...shippingSafeData.map(item => item?.pendingShipping || 0))
      : 0;

  const sortedPendingShippingData = [...shippingSafeData].sort(
    (a, b) => (b?.pendingShipping || 0) - (a?.pendingShipping || 0),
  );

  const highestPendingItem = sortedPendingShippingData[0] || null;
  const lowestPendingItem = sortedPendingShippingData.length
    ? sortedPendingShippingData[sortedPendingShippingData.length - 1]
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

  const cardIcons = ['🚢', '📦', '🏬', '🛳️', '📑', '🏭', '🚚', '📤'];

  const fetchShippingSummary = async () => {
    setShippingLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Export/GetBy_DepartmentName_Wise_ExpoDoc_Completed_Total_Count`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      let dataArray = [];
      if (Array.isArray(data)) {
        dataArray = data;
      } else if (data && typeof data === 'object') {
        dataArray = [data];
      }

      const pendingShippingDepartments = dataArray.filter(
        item => (item?.pendingShipping || 0) > 0,
      );

      setShippingSummaryData(pendingShippingDepartments);
      setShippingCurrentPage(1);
    } catch (fetchError) {
      console.error('Error fetching pending shipping summary:', fetchError);
      setShippingSummaryData([]);
      setError(`Network error: ${fetchError.message}`);
    } finally {
      setShippingLoading(false);
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

  const filterBySelectedDates = data => {
    if (!Array.isArray(data)) {
      return [];
    }

    const fromDateObj = fromDate ? parseDateString(fromDate) : null;
    const toDateObj = toDate ? parseDateString(toDate) : null;

    if (toDateObj) {
      toDateObj.setHours(23, 59, 59, 999);
    }

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
          item.departmentName.toLowerCase().includes(searchLower)),
    );
  };

  const fetchModalShippingData = async (deptCode, deptName) => {
    setModalLoading(true);
    setModalSearchText('');

    try {
      let url = `${API_BASE_URL}/api/Export/by-dept-Shipping_DateList`;
      if (deptCode) {
        url += `?depName=${encodeURIComponent(deptCode)}`;
      }

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

      let dataArray = [];
      if (Array.isArray(data)) {
        dataArray = data;
      } else if (data && typeof data === 'object') {
        dataArray = [data];
      }

      const dateFilteredData = filterBySelectedDates(dataArray);

      setModalShippingData(dateFilteredData);
      setModalFilteredData(dateFilteredData);
      setModalCurrentPage(1);
      setModalDepartmentName(deptName || 'Unknown Department');
    } catch (fetchError) {
      console.error('Shipping modal fetch error:', fetchError);
      setModalShippingData([]);
      setModalFilteredData([]);
      setModalCurrentPage(1);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCardClick = async item => {
    setModalDepartmentName(getDisplayName(item));
    setShowDetailsModal(true);
    await fetchModalShippingData(item?.departmentCode, getDisplayName(item));
  };

  const handleModalSearch = text => {
    setModalSearchText(text);
    setModalCurrentPage(1);

    if (!Array.isArray(modalShippingData)) {
      setModalFilteredData([]);
      return;
    }

    const filtered = filterDataBySearch(modalShippingData, text);
    setModalFilteredData(filtered);
  };

  const modalSafeFilteredData = Array.isArray(modalFilteredData)
    ? modalFilteredData
    : [];

  const modalTotalPages = Math.ceil(
    modalSafeFilteredData.length / modalItemsPerPage,
  );

  const getModalCurrentPageData = () => {
    const startIndex = (modalCurrentPage - 1) * modalItemsPerPage;
    const endIndex = startIndex + modalItemsPerPage;
    return modalSafeFilteredData.slice(startIndex, endIndex);
  };

  const modalCurrentPageData = getModalCurrentPageData();

  const getDisplayName = item =>
    item?.customerName || item?.departmentName || 'Unknown';

  const getDepartmentSubText = item =>
    item?.departmentName || item?.departmentCode || '-';

  const getPendingPercentage = pending => {
    if (!maxPendingShipping || maxPendingShipping <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((pending / maxPendingShipping) * 100));
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

  const hasActiveFilters = () => fromDate !== '' || toDate !== '';

  const onRefresh = () => {
    setRefreshing(true);
    fetchShippingSummary().then(() => setRefreshing(false));
  };

  const getShippingPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      shippingCurrentPage - Math.floor(maxVisiblePages / 2),
    );
    let endPage = Math.min(shippingTotalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  };

  const renderShippingPagination = () => {
    if (shippingTotalPages <= 1) {
      return null;
    }

    const pageNumbers = getShippingPageNumbers();
    const startItem = (shippingCurrentPage - 1) * shippingItemsPerPage + 1;
    const endItem = Math.min(
      shippingCurrentPage * shippingItemsPerPage,
      shippingSafeData.length,
    );

    return (
      <View style={styles.buyerPaginationContainer}>
        <View style={styles.buyerPaginationInfo}>
          <Text style={styles.buyerPaginationInfoText}>
            {startItem}-{endItem} of {shippingSafeData.length}
          </Text>
        </View>

        <View style={styles.buyerPaginationControls}>
          <TouchableOpacity
            style={[
              styles.buyerPaginationButton,
              shippingCurrentPage === 1 && styles.buyerPaginationButtonDisabled,
            ]}
            onPress={() => setShippingCurrentPage(shippingCurrentPage - 1)}
            disabled={shippingCurrentPage === 1}>
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
                  shippingCurrentPage === pageNum &&
                    styles.buyerPageNumberButtonActive,
                ]}
                onPress={() => setShippingCurrentPage(pageNum)}>
                <Text
                  style={[
                    styles.buyerPageNumberText,
                    shippingCurrentPage === pageNum &&
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
              shippingCurrentPage === shippingTotalPages &&
                styles.buyerPaginationButtonDisabled,
            ]}
            onPress={() => setShippingCurrentPage(shippingCurrentPage + 1)}
            disabled={shippingCurrentPage === shippingTotalPages}>
            <Text style={styles.buyerPaginationButtonText}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buyerItemsPerPageContainer}>
          <TouchableOpacity
            style={styles.buyerItemsPerPageSelector}
            onPress={() => {
              const newItemsPerPage =
                shippingItemsPerPage === 20
                  ? 50
                  : shippingItemsPerPage === 50
                  ? 100
                  : 20;
              setShippingItemsPerPage(newItemsPerPage);
              setShippingCurrentPage(1);
            }}>
            <Text style={styles.buyerItemsPerPageText}>
              {shippingItemsPerPage}
            </Text>
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
                <Text style={styles.detailsModalIcon}>🚢</Text>
              </View>
              <View style={styles.detailsTitleWrap}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {modalDepartmentName}
                </Text>
                <Text style={styles.modalSubTitle} numberOfLines={1}>
                  {fromDate || toDate
                    ? `${fromDate || 'Start'} → ${toDate || 'Today'}`
                    : 'All pending shipping records'}
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
                    setModalFilteredData(modalShippingData);
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
              <Text style={styles.loaderText}>Loading shipping records...</Text>
            </View>
          ) : modalCurrentPageData.length > 0 ? (
            <>
              <View style={styles.modalTableShell}>
                <ScrollView
                  style={styles.modalTableVerticalScroll}
                  showsVerticalScrollIndicator={true}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                      <View
                        style={[styles.tableHeader, styles.modalTableHeader]}>
                        <Text
                          style={[
                            styles.headerText,
                            styles.modalHeaderText,
                            {width: 70},
                          ]}>
                          Sl No
                        </Text>
                        <Text
                          style={[
                            styles.headerText,
                            styles.modalHeaderText,
                            {width: 120},
                          ]}>
                          Packing No
                        </Text>
                        <Text
                          style={[
                            styles.headerText,
                            styles.modalHeaderText,
                            {width: 150},
                          ]}>
                          Export Doc No
                        </Text>
                        <Text
                          style={[
                            styles.headerText,
                            styles.modalHeaderText,
                            {width: 145},
                          ]}>
                          Customer/Dept
                        </Text>
                        <Text
                          style={[
                            styles.headerText,
                            styles.modalHeaderText,
                            {width: 105},
                          ]}>
                          Carton/Pcs
                        </Text>
                        <Text
                          style={[
                            styles.headerText,
                            styles.modalHeaderText,
                            {width: 110},
                          ]}>
                          Value
                        </Text>
                        <Text
                          style={[
                            styles.headerText,
                            styles.modalHeaderText,
                            {width: 120},
                          ]}>
                          Ex-Factory Date
                        </Text>
                      </View>

                      {modalCurrentPageData.map((item, index) => (
                        <View
                          key={`${item?.packagingListNo || index}-${index}`}
                          style={[
                            styles.tableRow,
                            styles.modalTableRow,
                            index % 2 === 0 && styles.modalTableRowAlt,
                          ]}>
                          <Text
                            style={[
                              styles.rowText,
                              styles.modalRowText,
                              styles.modalSerialCell,
                              {width: 70},
                            ]}>
                            {(modalCurrentPage - 1) * modalItemsPerPage +
                              index +
                              1}
                          </Text>

                          <Text
                            style={[
                              styles.rowText,
                              styles.modalPackingText,
                              {width: 120},
                            ]}
                            numberOfLines={1}>
                            {item.packagingListNo || '-'}
                          </Text>

                          <Text
                            style={[
                              styles.rowText,
                              styles.modalRowText,
                              {width: 150},
                            ]}
                            numberOfLines={1}>
                            {item.expDocumentNo || '-'}
                          </Text>

                          <View
                            style={[
                              styles.columnStack,
                              styles.modalColumnStack,
                              {width: 145},
                            ]}>
                            <Text
                              style={styles.modalUpperText}
                              numberOfLines={1}>
                              {item.customerName || '-'}
                            </Text>
                            <Text
                              style={styles.modalLowerText}
                              numberOfLines={1}>
                              {item.departmentName || '-'}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.columnStack,
                              styles.modalColumnStack,
                              {width: 105},
                            ]}>
                            <Text
                              style={styles.modalUpperText}
                              numberOfLines={1}>
                              {item.noOfCarton
                                ? item.noOfCarton.toLocaleString()
                                : '0'}
                            </Text>
                            <Text
                              style={styles.modalLowerText}
                              numberOfLines={1}>
                              {item.noOfPcs
                                ? item.noOfPcs.toLocaleString()
                                : '0'}{' '}
                              pcs
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.rowText,
                              styles.modalValueText,
                              {width: 110},
                            ]}
                            numberOfLines={1}>
                            {item.totalValue
                              ? item.totalValue.toLocaleString()
                              : '0'}
                          </Text>

                          <Text
                            style={[
                              styles.rowText,
                              styles.modalDateCell,
                              {width: 120},
                            ]}
                            numberOfLines={1}>
                            {item.exFacDate
                              ? item.exFacDate.split('T')[0]
                              : '-'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </ScrollView>
              </View>

              {renderModalPagination()}
            </>
          ) : (
            <View style={styles.modalEmptyCard}>
              <Text style={styles.modalEmptyIcon}>🚢</Text>
              <Text style={styles.modalEmptyTitle}>
                No shipping records found
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
            <Text style={styles.filterPanelTitle}>Shipping Filter</Text>
            <Text style={styles.filterPanelSubTitle}>
              Choose date range before opening a card
            </Text>
          </View>
          <View style={styles.filterPanelIconBox}>
            <Text style={styles.filterPanelIcon}>🚢</Text>
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
            <Text style={styles.sectionTitle}>🚢 Shipping Summary</Text>
            <Text style={styles.summaryHeaderSubText}>
              Pending shipping by active department
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
            <Text style={styles.statSubLabel}>With pending shipping</Text>
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
                <Text style={styles.statIcon}>🚢</Text>
              </View>

              <View style={[styles.statMiniBadge, styles.statMiniBadgeGreen]}>
                <Text style={styles.statMiniBadgeText}>Pending</Text>
              </View>
            </View>

            <Text style={styles.statValue}>{totalPendingShipping}</Text>
            <Text style={styles.statTitle}>Total Shipping</Text>
            <Text style={styles.statSubLabel}>Pending shipping dates</Text>
          </View>
        </View>

        {!shippingLoading && shippingSafeData.length > 0 && (
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
                <Text style={styles.pendingInsightDeptName} numberOfLines={1}>
                  {getDepartmentSubText(highestPendingItem)}
                </Text>
              </View>

              <View
                style={[styles.pendingInsightCount, styles.pendingHighCount]}>
                <Text style={styles.pendingInsightCountText}>
                  {highestPendingItem?.pendingShipping || 0}
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
                <Text style={styles.pendingInsightDeptName} numberOfLines={1}>
                  {getDepartmentSubText(lowestPendingItem)}
                </Text>
              </View>

              <View
                style={[styles.pendingInsightCount, styles.pendingLowCount]}>
                <Text style={styles.pendingInsightCountText}>
                  {lowestPendingItem?.pendingShipping || 0}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.departmentListHeader}>
          <Text style={styles.departmentListTitle}>Pending by Department</Text>
          <Text style={styles.departmentListSubTitle}>
            Tap any card for shipping details
          </Text>
        </View>

        {shippingLoading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.loaderText}>Loading pending shipping...</Text>
          </View>
        ) : shippingCurrentPageData.length > 0 ? (
          <>
            <View style={styles.badgeGrid}>
              {shippingCurrentPageData.map((item, index) => {
                const pending = item?.pendingShipping || 0;
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

            {renderShippingPagination()}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>✅</Text>
            <Text style={styles.emptyStateText}>No pending shipping found</Text>
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
    paddingHorizontal: 10,
    paddingVertical: 9,
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
    marginBottom: 5,
  },
  pendingInsightName: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    marginBottom: 3,
  },
  pendingInsightDeptName: {
    color: '#94a3b8',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
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

  // ========== PAGINATION ==========
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
  paginationContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 16,
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
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
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
    marginHorizontal: 16,
    marginTop: 2,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  modalTableVerticalScroll: {
    maxHeight: 300,
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

export default ShippingScreen;