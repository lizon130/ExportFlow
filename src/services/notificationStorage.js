import AsyncStorage from '@react-native-async-storage/async-storage';

export const NOTIFICATION_KEY = 'app_notifications';

export const getNotifications = async () => {
  const saved = await AsyncStorage.getItem(NOTIFICATION_KEY);
  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
};

export const saveNotification = async notification => {
  const oldNotifications = await getNotifications();

  const newNotification = {
    id: notification.id
  ? `${notification.id}-${Date.now()}`
  : `${Date.now()}-${Math.random()}`,
    title: notification.title || 'Notification',
    message: notification.message || notification.body || '',
    type: notification.type || 'info',
    timestamp: notification.timestamp || new Date().toISOString(),
    unread: true,
  };

  const updated = [newNotification, ...oldNotifications];

  await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(updated));

  return updated;
};

export const markNotificationRead = async id => {
  const notifications = await getNotifications();

  const updated = notifications.map(item =>
    item.id === id ? {...item, unread: false} : item,
  );

  await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(updated));

  return updated;
};

export const markAllNotificationsRead = async () => {
  const notifications = await getNotifications();

  const updated = notifications.map(item => ({
    ...item,
    unread: false,
  }));

  await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(updated));

  return updated;
};