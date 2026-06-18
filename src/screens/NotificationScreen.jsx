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
} from 'react-native';

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationStorage';

const NotificationScreen = ({onClose, onNotificationPress, onRefreshCount}) => {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

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

    if (onNotificationPress) {
      onNotificationPress(item);
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
});

export default NotificationScreen;