// File: src/screens/NotificationScreen.js
// Fixed: notification click opens modal + one feedback per notification + edit existing feedback + department from notification body
// Important: this file does NOT call parent onNotificationPress on item click,
// because your AppNavigator was closing the notification screen.

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationStorage';

const API_BASE_URL = 'http://192.168.9.45:7000';

const FEEDBACK_API_URL =
  `${API_BASE_URL}/api/Notification/save-update-export-document-feedback`;
const FEEDBACK_LIST_API_URL = userId =>
  `${API_BASE_URL}/api/Notification/get-export-document-feedback-by-userId?userId=${encodeURIComponent(
    userId,
  )}`;

const ROLE_API_URL = `${API_BASE_URL}/api/Role/all`;
const USER_LIST_API_URL = `${API_BASE_URL}/api/User/get-all-users-list`;

// Used only if the logged-in user id is not found in app storage/notification data.
// Change this value only if your login user id is different and not stored locally.
const FALLBACK_LOGGED_IN_USER_ID = 9;

const NotificationScreen = ({onClose, onRefreshCount}) => {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [loggedInUserInfo, setLoggedInUserInfo] = useState(null);
  const [loggedInRoleInfo, setLoggedInRoleInfo] = useState(null);
  const [loggedInOrgInfo, setLoggedInOrgInfo] = useState(null);
  const [existingFeedbackList, setExistingFeedbackList] = useState([]);

  const removeDuplicateNotifications = items => {
    const seen = new Set();
    const safeItems = Array.isArray(items) ? items : [];

    return safeItems.filter((item, index) => {
      const titleText = getRawNotificationTitle(item);
      const messageText = getDisplayNotificationMessage(item);

      // Do not show empty notifications, and never show the fake
      // "No message" notification text.
      if (
        !isMeaningfulNotificationText(titleText) &&
        !isMeaningfulNotificationText(messageText)
      ) {
        return false;
      }

      const uniqueKey = item?.id
        ? `${item.id}-${item.timestamp || ''}`
        : `${titleText || 'notification'}-${messageText || ''}-${
            item?.timestamp || index
          }`;

      if (seen.has(uniqueKey)) {
        return false;
      }

      seen.add(uniqueKey);
      return true;
    });
  };

  const loadNotifications = useCallback(async () => {
    try {
      const saved = await getNotifications();
      const cleanNotifications = removeDuplicateNotifications(saved);

      setNotifications(cleanNotifications);

      if (onRefreshCount) {
        onRefreshCount();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [onRefreshCount]);

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, 3000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    resolveLoggedInUserAndRole();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async notificationId => {
    try {
      const updated = await markNotificationRead(notificationId);
      const cleanNotifications = removeDuplicateNotifications(updated);

      setNotifications(cleanNotifications);

      if (onRefreshCount) {
        onRefreshCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const updated = await markAllNotificationsRead();
      const cleanNotifications = removeDuplicateNotifications(updated);

      setNotifications(cleanNotifications);

      if (onRefreshCount) {
        onRefreshCount();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const normalizeArray = value => {
    if (Array.isArray(value)) {
      return value;
    }

    if (value && typeof value === 'object') {
      return [value];
    }

    return [];
  };

  const parseStorageValue = value => {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch (error) {
        return null;
      }
    }

    return typeof value === 'object' ? value : null;
  };

  const getFirstValue = (source, keys, defaultValue = '') => {
    if (!source || typeof source !== 'object') {
      return defaultValue;
    }

    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && String(value) !== '') {
        return value;
      }
    }

    return defaultValue;
  };

  const getNumberValue = (source, keys, defaultValue = 0) => {
    const value = getFirstValue(source, keys, defaultValue);
    const numberValue = Number(value);

    return Number.isFinite(numberValue) ? numberValue : defaultValue;
  };

  const findUserObjectDeep = value => {
    if (!value || typeof value !== 'object') {
      return null;
    }

    if (
      value.recId !== undefined ||
      value.userId !== undefined ||
      value.id !== undefined ||
      value.userName !== undefined ||
      value.email !== undefined
    ) {
      return value;
    }

    const possibleKeys = [
      'user',
      'currentUser',
      'loggedInUser',
      'loginUser',
      'profile',
      'userProfile',
      'data',
      'result',
      'authUser',
    ];

    for (const key of possibleKeys) {
      const found = findUserObjectDeep(value?.[key]);
      if (found) {
        return found;
      }
    }

    return null;
  };

  const getStoredLoggedInUser = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => {
        const lowerKey = String(key).toLowerCase();
        return (
          lowerKey.includes('user') ||
          lowerKey.includes('auth') ||
          lowerKey.includes('login') ||
          lowerKey.includes('profile') ||
          lowerKey.includes('token') ||
          lowerKey.includes('account')
        );
      });

      const selectedKeys = authKeys.length > 0 ? authKeys : keys;
      const keyValues = await AsyncStorage.multiGet(selectedKeys);

      for (const [, value] of keyValues) {
        const parsedValue = parseStorageValue(value);
        const userObject = findUserObjectDeep(parsedValue);

        if (userObject) {
          return userObject;
        }
      }
    } catch (error) {
      console.log('Unable to read logged-in user from storage:', error);
    }

    return null;
  };

  const fetchJson = async url => {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  };


  const fetchExistingFeedbacksByUserId = async userId => {
    if (!userId) {
      setExistingFeedbackList([]);
      return [];
    }

    try {
      const result = await fetchJson(FEEDBACK_LIST_API_URL(userId));
      const feedbackRows = normalizeArray(result?.data || result);
      setExistingFeedbackList(feedbackRows);
      return feedbackRows;
    } catch (error) {
      console.log('Unable to fetch existing feedback list:', error);
      setExistingFeedbackList([]);
      return [];
    }
  };

  const getRoleFromProfileOrApi = async profile => {
    const profileRoles = normalizeArray(profile?.roles);
    if (profileRoles.length > 0) {
      const firstProfileRole = profileRoles[0];
      return {
        roleRecId: Number(
          firstProfileRole?.roleRecId || firstProfileRole?.recId || 0,
        ),
        roleName: firstProfileRole?.roleName || firstProfileRole?.name || '',
      };
    }

    try {
      const allRoles = normalizeArray(await fetchJson(ROLE_API_URL));
      const roleFromNotificationName = getNotificationString(
        selectedNotification,
        ['roleName', 'role'],
        '',
      ).toLowerCase();
      const roleFromNotificationId = getNotificationNumber(
        selectedNotification,
        ['roleRecId', 'roleId', 'roleID'],
        0,
      );

      const matchedRole =
        allRoles.find(role =>
          roleFromNotificationId
            ? Number(role?.roleRecId || role?.recId || 0) ===
              Number(roleFromNotificationId)
            : false,
        ) ||
        allRoles.find(role =>
          roleFromNotificationName
            ? String(role?.roleName || role?.name || '').toLowerCase() ===
              roleFromNotificationName
            : false,
        ) ||
        allRoles[0];

      if (matchedRole) {
        return {
          roleRecId: Number(matchedRole?.roleRecId || matchedRole?.recId || 0),
          roleName: matchedRole?.roleName || matchedRole?.name || '',
        };
      }
    } catch (error) {
      console.log('Unable to fetch role list:', error);
    }

    return {
      roleRecId: getNotificationNumber(
        selectedNotification,
        ['roleRecId', 'roleId', 'roleID'],
        0,
      ),
      roleName: getNotificationString(selectedNotification, ['roleName', 'role']),
    };
  };

  const getDepartmentBuyerFromProfile = profile => {
    const profileDepartments = normalizeArray(profile?.departments);
    const profileBuyers = normalizeArray(profile?.buyers);

    const firstDepartment = profileDepartments[0] || {};
    const firstBuyer = profileBuyers[0] || {};

    return {
      // As per API profile:
      // departmentCode = departments.recId
      // departmentName = departments.departmentName
      // customerCode = buyers.buyerRecId
      // customerName = buyers.buyerName
      departmentCode: String(
        firstDepartment?.recId ||
          firstDepartment?.departmentCode ||
          firstDepartment?.departmentId ||
          '',
      ),
      departmentName: firstDepartment?.departmentName || '',
      customerCode: String(
        firstBuyer?.buyerRecId || firstBuyer?.recId || firstBuyer?.buyerCode || '',
      ),
      customerName: firstBuyer?.buyerName || firstBuyer?.customerName || '',
    };
  };

  const resolveLoggedInUserAndRole = async () => {
    let storageUser = await getStoredLoggedInUser(); 

    const notificationUserId = getNotificationNumber(
      selectedNotification,
      ['userId', 'userRecId', 'createdByUserId'],
      0,
    );
    const notificationUserName = getNotificationString(
      selectedNotification,
      ['userName', 'createdBy', 'employeeName'],
      '',
    );

    let userId =
      getNumberValue(storageUser, ['recId', 'userId', 'id'], 0) ||
      notificationUserId ||
      FALLBACK_LOGGED_IN_USER_ID;

    let userName =
      getFirstValue(storageUser, ['userName', 'name', 'email'], '') ||
      notificationUserName ||
      '';

    try {
      if (!userId && userName) {
        const users = normalizeArray(await fetchJson(USER_LIST_API_URL));
        const matchedUser = users.find(user => {
          const apiUserName = String(user?.userName || '').toLowerCase();
          const apiEmail = String(user?.email || '').toLowerCase();
          const searchName = String(userName || '').toLowerCase();
          return apiUserName === searchName || apiEmail === searchName;
        });

        if (matchedUser) {
          userId = Number(matchedUser?.recId || matchedUser?.userId || 0);
          userName = matchedUser?.userName || userName;
        }
      }
    } catch (error) {
      console.log('Unable to match user from user list:', error);
    }

    let profile = null;

    try {
      if (userId) {
        profile = await fetchJson(`${API_BASE_URL}/api/User/${userId}/profile`);
      }
    } catch (error) {
      console.log('Unable to fetch logged-in user profile:', error);
    }

    const resolvedUser = {
      userId: Number(profile?.recId || userId || 0),
      userName: profile?.userName || userName || '',
    };

    const resolvedRole = await getRoleFromProfileOrApi(profile);
    const resolvedOrg = getDepartmentBuyerFromProfile(profile);

    setLoggedInUserInfo(resolvedUser);
    setLoggedInRoleInfo(resolvedRole);
    setLoggedInOrgInfo(resolvedOrg);

    const feedbackRows = await fetchExistingFeedbacksByUserId(
      resolvedUser?.userId,
    );

    return {
      user: resolvedUser,
      role: resolvedRole,
      org: resolvedOrg,
      feedbacks: feedbackRows,
    };
  };

  const handleNotificationPress = async item => {
    await markAsRead(item.id);

    const context = await resolveLoggedInUserAndRole();
    const feedbackRows = context?.feedbacks || existingFeedbackList;
    const existingFeedback = findExistingFeedbackForNotification(
      item,
      feedbackRows,
      context?.org,
    );

    setSelectedNotification(item);
    setFeedbackText(existingFeedback?.feedback || '');
    setFeedbackMessage(
      existingFeedback
        ? 'Feedback already sent. You can edit and update it.'
        : '',
    );
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedNotification(null);
    setFeedbackText('');
    setFeedbackMessage('');
  };

  const normalizeDataSource = value => {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      try {
        const parsedValue = JSON.parse(value);
        return parsedValue && typeof parsedValue === 'object'
          ? parsedValue
          : null;
      } catch (error) {
        return null;
      }
    }

    if (typeof value === 'object') {
      return value;
    }

    return null;
  };

  const getNotificationDataSources = notification => {
    const sources = [];

    const addSource = value => {
      const normalized = normalizeDataSource(value);
      if (normalized) {
        sources.push(normalized);
      }
    };

    addSource(notification);
    addSource(notification?.data);
    addSource(notification?.notificationData);
    addSource(notification?.payload);
    addSource(notification?.rawData);
    addSource(notification?.extraData);
    addSource(notification?.remoteMessage);
    addSource(notification?.remoteMessage?.data);
    addSource(notification?.remoteMessage?.notification);

    return sources;
  };

  const getNotificationField = (notification, keys, defaultValue = '') => {
    const sources = getNotificationDataSources(notification);

    for (const source of sources) {
      for (const key of keys) {
        const value = source?.[key];

        if (value !== undefined && value !== null && String(value) !== '') {
          return value;
        }
      }
    }

    return defaultValue;
  };

  const getNotificationString = (notification, keys, defaultValue = '') => {
    const value = getNotificationField(notification, keys, defaultValue);

    if (value === undefined || value === null) {
      return defaultValue;
    }

    return String(value);
  };

const isMeaningfulNotificationText = value => {
    if (value === undefined || value === null) {
      return false;
    }

    const text = String(value).trim();

    if (!text) {
      return false;
    }

    const lowerText = text.toLowerCase();

    return ![
      'no message',
      'no title',
      'undefined',
      'null',
      '[object object]',
    ].includes(lowerText);
  };

  const getRawNotificationTitle = notification =>
    getNotificationString(notification, [
      'title',
      'notificationTitle',
      'notifyName',
      'notificationName',
      'subject',
      'heading',
    ]);

  const getDisplayNotificationMessage = notification => {
    const message = getNotificationString(notification, [
      'message',
      'body',
      'notificationMessage',
      'notificationBody',
      'description',
      'text',
      'content',
      'details',
    ]);

    return isMeaningfulNotificationText(message) ? message.trim() : '';
  };

  const getDisplayNotificationTitle = notification => {
    const title = getRawNotificationTitle(notification);
    const message = getDisplayNotificationMessage(notification);

    if (isMeaningfulNotificationText(title)) {
      return title.trim();
    }

    if (isMeaningfulNotificationText(message)) {
      return message.trim();
    }

    return 'Notification';
  };

  const getNotificationNumber = (notification, keys, defaultValue = 0) => {
    const value = getNotificationField(notification, keys, defaultValue);
    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? numericValue : defaultValue;
  };

  const normalizeMatchText = value =>
    String(value || '')
      .trim()
      .toLowerCase();

  const sameWhenAvailable = (leftValue, rightValue) => {
    const leftText = normalizeMatchText(leftValue);
    const rightText = normalizeMatchText(rightValue);

    if (!leftText || !rightText) {
      return true;
    }

    return leftText === rightText;
  };

  const extractQuotedDocumentText = value => {
    if (!isMeaningfulNotificationText(value)) {
      return '';
    }

    const text = String(value).trim();

    const quotePatterns = [
      /'([^']+)'/,
      /\"([^\"]+)\"/,
      /‘([^’]+)’/,
      /“([^”]+)”/,
    ];

    for (const pattern of quotePatterns) {
      const match = text.match(pattern);
      const matchedValue = match?.[1]?.trim();

      if (isMeaningfulNotificationText(matchedValue)) {
        return matchedValue;
      }
    }

    return '';
  };

  const getNotificationDocumentFallback = notification =>
    getNotificationString(notification, [
      'exportDocument',
      'expDocumentNo',
      'exportDocumentNo',
      'documentNo',
      'packagingListNo',
    ]);

  const getNotificationDocumentCandidates = notification => {
    const bodyText = getDisplayNotificationMessage(notification);
    const quotedDocument = extractQuotedDocumentText(bodyText);
    const fallbackDocument = getNotificationDocumentFallback(notification);

    return [quotedDocument, fallbackDocument, bodyText].filter(
      (value, index, values) =>
        isMeaningfulNotificationText(value) &&
        values.findIndex(
          item => normalizeMatchText(item) === normalizeMatchText(value),
        ) === index,
    );
  };

  const getNotificationExportDocumentValue = notification => {
    const candidates = getNotificationDocumentCandidates(notification);
    return candidates[0] || '';
  };

  const extractDepartmentCodeFromNotificationBody = value => {
    if (!isMeaningfulNotificationText(value)) {
      return '';
    }

    const text = String(value).trim();

    // Example notification body:
    // You have 'TTL-1209-0369-26' Under--HnM Child--Please complete BL Date.
    // This will return: HnM Child
    const doubleDashMatch = text.match(/--\s*(.*?)\s*--/);
    const matchedValue = doubleDashMatch?.[1]?.trim();

    return isMeaningfulNotificationText(matchedValue) ? matchedValue : '';
  };

  const getNotificationDepartmentCodeFromBody = notification => {
    const bodyText = getDisplayNotificationMessage(notification);
    return extractDepartmentCodeFromNotificationBody(bodyText);
  };

  const buildNotificationFeedbackIdentity = (notification, orgOverride = null) => {
    const org = orgOverride || loggedInOrgInfo || {};

    // Backend exportDocument field needs only the document name from the
    // notification body. Example: "You have 'ttl-sdasdas5555' please sent"
    // will save only: ttl-sdasdas5555. If no quoted value exists, it falls
    // back to existing document fields, then the full body as the final backup.
    const notificationExportDocument = getNotificationExportDocumentValue(notification);
    const notificationDepartmentCode = getNotificationDepartmentCodeFromBody(
      notification,
    );

    return {
      notifyName: getNotificationString(
        notification,
        ['notifyName', 'notificationName', 'title'],
        getDisplayNotificationTitle(notification),
      ),
      exportDocument: notificationExportDocument,
      departmentCode:
        notificationDepartmentCode ||
        getNotificationString(notification, [
          'departmentCode',
          'deptCode',
          'depCode',
        ]) ||
        org?.departmentCode,
      departmentName:
        org?.departmentName ||
        getNotificationString(notification, [
          'departmentName',
          'deptName',
          'depName',
        ]),
      customerCode:
        org?.customerCode ||
        getNotificationString(notification, ['customerCode', 'buyerCode']),
      customerName:
        org?.customerName ||
        getNotificationString(notification, ['customerName', 'buyerName']),
    };
  };

  const findExistingFeedbackForNotification = (
    notification,
    feedbackRows = existingFeedbackList,
    orgOverride = null,
  ) => {
    if (!notification) {
      return null;
    }

    const identity = buildNotificationFeedbackIdentity(notification, orgOverride);
    const notifyName = normalizeMatchText(identity.notifyName);

    if (!notifyName) {
      return null;
    }

    return normalizeArray(feedbackRows).find(feedbackItem => {
      const feedbackNotifyName = normalizeMatchText(feedbackItem?.notifyName);

      if (!feedbackNotifyName || feedbackNotifyName !== notifyName) {
        return false;
      }

      const feedbackExportDocument = normalizeMatchText(
        feedbackItem?.exportDocument,
      );
      const notificationDocumentCandidates = getNotificationDocumentCandidates(
        notification,
      ).map(item => normalizeMatchText(item));
      const hasDocumentMatch =
        feedbackExportDocument &&
        notificationDocumentCandidates.length > 0 &&
        notificationDocumentCandidates.includes(feedbackExportDocument);

      if (
        feedbackExportDocument &&
        notificationDocumentCandidates.length > 0 &&
        !hasDocumentMatch
      ) {
        return false;
      }

      // When exportDocument is matched, it is already the specific notification.
      // So do not block update because old feedback had a previous/profile
      // departmentCode while the new notification body has Under--Department--.
      if (!hasDocumentMatch) {
        if (!sameWhenAvailable(feedbackItem?.departmentCode, identity.departmentCode)) {
          return false;
        }

        if (!sameWhenAvailable(feedbackItem?.departmentName, identity.departmentName)) {
          return false;
        }

        if (!sameWhenAvailable(feedbackItem?.customerCode, identity.customerCode)) {
          return false;
        }

        if (!sameWhenAvailable(feedbackItem?.customerName, identity.customerName)) {
          return false;
        }
      }

      return true;
    }) || null;
  };

  const buildExportDocumentFeedbackPayload = async () => {
    const now = new Date().toISOString();
    const context = await resolveLoggedInUserAndRole();
    const resolvedUser = context?.user || loggedInUserInfo || {};
    const resolvedRole = context?.role || loggedInRoleInfo || {};
    const resolvedOrg = context?.org || loggedInOrgInfo || {};
    const feedbackRows = context?.feedbacks || existingFeedbackList;
    const existingFeedback = findExistingFeedbackForNotification(
      selectedNotification,
      feedbackRows,
      resolvedOrg,
    );
    const identity = buildNotificationFeedbackIdentity(
      selectedNotification,
      resolvedOrg,
    );

    return {
      // If feedback already exists for this same notification, send that feedback
      // recId so the backend updates it instead of inserting a new row.
      recId: Number(existingFeedback?.recId || 0),
      userId: Number(resolvedUser?.userId || 0),
      userName: resolvedUser?.userName || '',
      roleRecId: Number(resolvedRole?.roleRecId || 0),
      roleName: resolvedRole?.roleName || '',
      notifyName: identity.notifyName || 'Notification',
      exportDocument: identity.exportDocument || '',
      departmentCode: identity.departmentCode || '',
      departmentName: identity.departmentName || '',
      customerCode: identity.customerCode || '',
      customerName: identity.customerName || '',
      prevFeedback: existingFeedback?.feedback || '',
      feedback: feedbackText.trim(),
      createdDate: existingFeedback?.createdDate || now,
      updatedDate: now,
    };
  };

  const submitFeedback = async () => {
    if (!selectedNotification) {
      return;
    }

    if (!feedbackText.trim()) {
      setFeedbackMessage('Please write your feedback first.');
      return;
    }

    try {
      setFeedbackLoading(true);
      setFeedbackMessage('');

      const payload = await buildExportDocumentFeedbackPayload();

      console.log('Export document feedback payload:', payload);

      const response = await fetch(FEEDBACK_API_URL, {
        method: 'POST',
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.text();

      console.log('Feedback API Status:', response.status);
      console.log('Feedback API Response:', result);

      if (!response.ok) {
        throw new Error(result || 'Feedback submit failed');
      }

      await fetchExistingFeedbacksByUserId(payload.userId);

      setFeedbackMessage(
        payload.recId
          ? 'Feedback updated successfully.'
          : 'Feedback submitted successfully.',
      );
      setFeedbackText(payload.feedback);

      setTimeout(() => {
        closeDetailsModal();
      }, 800);
    } catch (error) {
      console.error('Feedback submit error:', error);
      setFeedbackMessage('Feedback submit failed. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const getTimeAgo = timestamp => {
    if (!timestamp) {
      return 'Just now';
    }

    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffSeconds = Math.floor((now - notifTime) / 1000);

    if (Number.isNaN(diffSeconds)) {
      return 'Just now';
    }

    if (diffSeconds < 60) {
      return 'Just now';
    }

    if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)} min ago`;
    }

    if (diffSeconds < 86400) {
      return `${Math.floor(diffSeconds / 3600)} hours ago`;
    }

    if (diffSeconds < 604800) {
      return `${Math.floor(diffSeconds / 86400)} days ago`;
    }

    return notifTime.toLocaleDateString();
  };

  const getIcon = type => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '📢';
    }
  };

  const getIconBackgroundColor = type => {
    switch (type) {
      case 'success':
        return '#10b98120';
      case 'warning':
        return '#f59e0b20';
      case 'error':
        return '#ef444420';
      default:
        return '#3b82f620';
    }
  };

  const renderNotification = ({item}) => {
    const notificationTitle = getDisplayNotificationTitle(item);
    const notificationMessage = getDisplayNotificationMessage(item);
    const existingFeedback = findExistingFeedbackForNotification(item);
    const hasFeedbackSent = Boolean(existingFeedback);
    const shouldShowMessage =
      !hasFeedbackSent &&
      isMeaningfulNotificationText(notificationMessage) &&
      notificationMessage !== notificationTitle;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.unread && styles.readItem,
          hasFeedbackSent && styles.feedbackDoneNotificationItem,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}>
        <View
          style={[
            styles.iconContainer,
            {backgroundColor: getIconBackgroundColor(item.type)},
          ]}>
          <Text style={styles.icon}>{getIcon(item.type)}</Text>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.title, !item.unread && styles.readText]}
              numberOfLines={2}>
              {notificationTitle}
            </Text>

            {item.unread && <View style={styles.unreadDot} />}
          </View>

          {hasFeedbackSent ? (
            <View style={styles.feedbackSentBox}>
              <Text style={styles.feedbackSentText}>Feedback sent</Text>
              {existingFeedback?.feedback ? (
                <Text style={styles.feedbackSentSubText} numberOfLines={2}>
                  {existingFeedback.feedback}
                </Text>
              ) : null}
            </View>
          ) : shouldShowMessage ? (
            <Text
              style={[styles.message, !item.unread && styles.readText]}
              numberOfLines={3}>
              {notificationMessage}
            </Text>
          ) : null}

          <Text style={styles.timestamp}>{getTimeAgo(item.timestamp)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(item => item.unread).length;
  const selectedExistingFeedback = findExistingFeedbackForNotification(
    selectedNotification,
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0c12" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeIcon}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notifications</Text>

        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={markAllAsRead}
            style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRightPlaceholder} />
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item, index) =>
          `${item?.id || 'notification'}-${item?.timestamp || index}-${index}`
        }
        contentContainerStyle={[
          styles.listContainer,
          notifications.length === 0 && styles.emptyListContainer,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f1f5f9"
            colors={['#10b981']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>You're all caught up!</Text>
          </View>
        }
      />

      <Modal
        visible={showDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={closeDetailsModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Notification Details</Text>

              <TouchableOpacity
                onPress={closeDetailsModal}
                style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalNotificationBox}>
              <View
                style={[
                  styles.modalIconContainer,
                  {
                    backgroundColor: getIconBackgroundColor(
                      selectedNotification?.type,
                    ),
                  },
                ]}>
                <Text style={styles.modalIcon}>
                  {getIcon(selectedNotification?.type)}
                </Text>
              </View>

              <View style={styles.modalNotificationTextBox}>
                <Text style={styles.modalNotificationTitle}>
                  {getDisplayNotificationTitle(selectedNotification)}
                </Text>

                {getDisplayNotificationMessage(selectedNotification) ? (
                  <Text style={styles.modalNotificationMessage}>
                    {getDisplayNotificationMessage(selectedNotification)}
                  </Text>
                ) : null}

                <Text style={styles.modalTimestamp}>
                  {getTimeAgo(selectedNotification?.timestamp)}
                </Text>
              </View>
            </View>

            <Text style={styles.feedbackLabel}>
              {selectedExistingFeedback ? 'Edit Feedback' : 'Feedback'}
            </Text>

            <TextInput
              style={styles.feedbackInput}
              placeholder="Write your feedback for this notification..."
              placeholderTextColor="#64748b"
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {feedbackMessage ? (
              <Text style={styles.feedbackMessage}>{feedbackMessage}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeDetailsModal}
                disabled={feedbackLoading}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitFeedback}
                disabled={feedbackLoading}>
                {feedbackLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {selectedExistingFeedback ? 'Update' : 'Submit'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c12',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#12141c',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
    width: 90,
  },
  closeIcon: {
    fontSize: 28,
    color: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  headerRightPlaceholder: {
    width: 90,
  },
  markAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    width: 90,
    alignItems: 'center',
  },
  markAllText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#12141c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  readItem: {
    backgroundColor: '#0f1119',
    opacity: 0.8,
  },
  feedbackDoneNotificationItem: {
    borderColor: 'rgba(16,185,129,0.35)',
    backgroundColor: '#0f1a18',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    flex: 1,
  },
  readText: {
    color: '#94a3b8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ec4899',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 8,
    lineHeight: 20,
  },
  feedbackSentBox: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.38)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  feedbackSentText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '900',
  },
  feedbackSentSubText: {
    color: '#a7f3d0',
    fontSize: 11,
    marginTop: 3,
    maxWidth: 230,
  },
  timestamp: {
    fontSize: 11,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#12141c',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#f1f5f9',
    fontSize: 24,
    lineHeight: 26,
  },
  modalNotificationBox: {
    flexDirection: 'row',
    backgroundColor: '#0f1119',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalIcon: {
    fontSize: 22,
  },
  modalNotificationTextBox: {
    flex: 1,
  },
  modalNotificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 6,
  },
  modalNotificationMessage: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
    marginBottom: 8,
  },
  modalTimestamp: {
    fontSize: 11,
    color: '#64748b',
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feedbackInput: {
    minHeight: 100,
    backgroundColor: '#0f1119',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    color: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackMessage: {
    color: '#10b981',
    fontSize: 12,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#1e293b',
  },
  cancelButtonText: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#10b981',
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default NotificationScreen;