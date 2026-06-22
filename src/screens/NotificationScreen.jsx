// File: src/screens/NotificationScreen.js
// Fixed: notification click opens modal + feedback box
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

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationStorage';

const FEEDBACK_API_URL =
  'http://192.168.9.45:7000/api/Notification/save-notification-feedback';

// Keep false if backend feedback API is not ready yet.
// If backend API is ready, change false to true.
const SEND_FEEDBACK_TO_API = false;

const NotificationScreen = ({onClose, onRefreshCount}) => {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const removeDuplicateNotifications = items => {
    const seen = new Set();

    return items.filter((item, index) => {
      const uniqueKey = item?.id
        ? `${item.id}-${item.timestamp || ''}`
        : `no-id-${index}`;

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

  const handleNotificationPress = async item => {
    await markAsRead(item.id);

    setSelectedNotification(item);
    setFeedbackText('');
    setFeedbackMessage('');
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedNotification(null);
    setFeedbackText('');
    setFeedbackMessage('');
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

      const payload = {
        notificationId: selectedNotification.id,
        title: selectedNotification.title || 'Notification',
        message:
          selectedNotification.message ||
          selectedNotification.body ||
          'No message',
        feedback: feedbackText.trim(),
        createdAt: new Date().toISOString(),
      };

      console.log('Notification feedback payload:', payload);

      if (SEND_FEEDBACK_TO_API) {
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
      }

      setFeedbackMessage('Feedback submitted successfully.');
      setFeedbackText('');

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

  const renderNotification = ({item}) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.unread && styles.readItem]}
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
            {item.title || 'Notification'}
          </Text>

          {item.unread && <View style={styles.unreadDot} />}
        </View>

        <Text
          style={[styles.message, !item.unread && styles.readText]}
          numberOfLines={3}>
          {item.message || item.body || 'No message'}
        </Text>

        <Text style={styles.timestamp}>{getTimeAgo(item.timestamp)}</Text>
      </View>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(item => item.unread).length;

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
                  {selectedNotification?.title || 'Notification'}
                </Text>

                <Text style={styles.modalNotificationMessage}>
                  {selectedNotification?.message ||
                    selectedNotification?.body ||
                    'No message'}
                </Text>

                <Text style={styles.modalTimestamp}>
                  {getTimeAgo(selectedNotification?.timestamp)}
                </Text>
              </View>
            </View>

            <Text style={styles.feedbackLabel}>Feedback</Text>

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
                  <Text style={styles.submitButtonText}>Submit</Text>
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
