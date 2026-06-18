// File: src/navigation/AppNavigator.js
// AppNavigator.js - With Back Navigation, Swipe Gestures, FCM Notification Save + Badge Count

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  BackHandler,
  Alert,
  PanResponder,
  Dimensions,
} from 'react-native';

import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import BottomTabBar from '../components/layout/BottomTabBar';
import SkeletonLoader from '../components/skeleton/SkeletonLoader';

import DashboardScreen from '../components/DashboardScreen';
import ExportDocsScreen from '../screens/ExportDocsScreen';
import BLScreen from '../screens/BLScreen';
import ShippingScreen from '../screens/ShippingScreen';
import BankSubmitScreen from '../screens/BankSubmitScreen';
import RealizationScreen from '../screens/RealizationScreen';
import NotificationScreen from '../screens/NotificationScreen';

import messaging from '@react-native-firebase/messaging';
import {registerFCMToken} from '../services/NotificationService';

import {
  getNotifications,
  saveNotification,
} from '../services/notificationStorage';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const AppNavigator = ({onLogout, userData}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationScreen, setShowNotificationScreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState(['dashboard']);
  const [unreadCount, setUnreadCount] = useState(0);

  const isNavigating = useRef(false);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const savedNotifications = await getNotifications();
      const count = savedNotifications.filter(item => item.unread).length;
      setUnreadCount(count);
    } catch (error) {
      console.log('Refresh unread count error:', error);
    }
  }, []);

  useEffect(() => {
    if (userData) {
      registerFCMToken(userData);
    }

    refreshUnreadCount();
  }, [userData, refreshUnreadCount]);

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('FCM FOREGROUND RECEIVED:', JSON.stringify(remoteMessage));

      const title =
        remoteMessage?.notification?.title ||
        remoteMessage?.data?.title ||
        'Notification';

      const body =
        remoteMessage?.notification?.body ||
        remoteMessage?.data?.body ||
        remoteMessage?.data?.message ||
        'No message';

      await saveNotification({
        id: remoteMessage?.messageId || `${Date.now()}`,
        title: title,
        message: body,
        type: remoteMessage?.data?.type || 'info',
        timestamp: new Date().toISOString(),
      });

      await refreshUnreadCount();

      Alert.alert(title, body);
    });

    return unsubscribe;
  }, [refreshUnreadCount]);

  useEffect(() => {
    const unsubscribeOpened = messaging().onNotificationOpenedApp(
      async remoteMessage => {
        console.log(
          'FCM OPENED FROM BACKGROUND:',
          JSON.stringify(remoteMessage),
        );

        if (!remoteMessage) {
          return;
        }

        const title =
          remoteMessage?.notification?.title ||
          remoteMessage?.data?.title ||
          'Notification';

        const body =
          remoteMessage?.notification?.body ||
          remoteMessage?.data?.body ||
          remoteMessage?.data?.message ||
          'No message';

        await saveNotification({
          id: remoteMessage?.messageId || `${Date.now()}`,
          title: title,
          message: body,
          type: remoteMessage?.data?.type || 'info',
          timestamp: new Date().toISOString(),
        });

        await refreshUnreadCount();
        setShowNotificationScreen(true);
      },
    );

    messaging()
      .getInitialNotification()
      .then(async remoteMessage => {
        console.log('FCM INITIAL NOTIFICATION:', JSON.stringify(remoteMessage));

        if (!remoteMessage) {
          return;
        }

        const title =
          remoteMessage?.notification?.title ||
          remoteMessage?.data?.title ||
          'Notification';

        const body =
          remoteMessage?.notification?.body ||
          remoteMessage?.data?.body ||
          remoteMessage?.data?.message ||
          'No message';

        await saveNotification({
          id: remoteMessage?.messageId || `${Date.now()}`,
          title: title,
          message: body,
          type: remoteMessage?.data?.type || 'info',
          timestamp: new Date().toISOString(),
        });

        await refreshUnreadCount();
        setShowNotificationScreen(true);
      });

    return unsubscribeOpened;
  }, [refreshUnreadCount]);

  const handleOpenNotifications = async () => {
    setShowNotifications(false);
    setShowNotificationScreen(true);
    await refreshUnreadCount();
  };

  const handleCloseNotifications = async () => {
    setShowNotificationScreen(false);
    await refreshUnreadCount();
  };

  const handleNotificationPress = async notification => {
    console.log('Notification pressed:', notification);
    setShowNotificationScreen(false);
    await refreshUnreadCount();
  };

  const goBackToDashboard = useCallback(() => {
    if (isNavigating.current) {
      return;
    }

    isNavigating.current = true;
    setLoading(true);
    setActiveTab('dashboard');
    setNavigationHistory(['dashboard']);

    setTimeout(() => {
      setLoading(false);
      isNavigating.current = false;
    }, 300);
  }, []);

  const goBack = useCallback(() => {
    if (isNavigating.current) {
      return;
    }

    if (showNotificationScreen) {
      setShowNotificationScreen(false);
      refreshUnreadCount();
      return;
    }

    if (navigationHistory.length > 1) {
      isNavigating.current = true;

      const newHistory = [...navigationHistory];
      newHistory.pop();

      const previousTab = newHistory[newHistory.length - 1];

      setLoading(true);
      setActiveTab(previousTab);
      setNavigationHistory(newHistory);

      setTimeout(() => {
        setLoading(false);
        isNavigating.current = false;
      }, 300);
    } else if (activeTab !== 'dashboard') {
      goBackToDashboard();
    }
  }, [
    activeTab,
    navigationHistory,
    goBackToDashboard,
    showNotificationScreen,
    refreshUnreadCount,
  ]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gestureState) => {
        if (showNotificationScreen) {
          return false;
        }

        const canGoBack =
          navigationHistory.length > 1 || activeTab !== 'dashboard';

        const isFromLeftEdge = gestureState.moveX < 30;

        return canGoBack && isFromLeftEdge && !isNavigating.current;
      },

      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 30;
      },

      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          goBack();
        }
      },
    }),
  ).current;

  useEffect(() => {
    const backAction = () => {
      if (showSidebar) {
        setShowSidebar(false);
        return true;
      }

      if (showNotificationScreen) {
        setShowNotificationScreen(false);
        refreshUnreadCount();
        return true;
      }

      if (showNotifications) {
        setShowNotifications(false);
        return true;
      }

      if (navigationHistory.length > 1) {
        goBack();
        return true;
      }

      if (activeTab === 'dashboard') {
        Alert.alert(
          'Exit App',
          'Do you want to exit?',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Exit', onPress: () => BackHandler.exitApp()},
          ],
          {cancelable: true},
        );

        return true;
      }

      goBackToDashboard();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [
    showSidebar,
    showNotifications,
    showNotificationScreen,
    navigationHistory,
    activeTab,
    goBack,
    goBackToDashboard,
    refreshUnreadCount,
  ]);

  const handleTabChange = tabName => {
    if (tabName === activeTab || isNavigating.current) {
      return;
    }

    setLoading(true);
    setNavigationHistory(prev => [...prev, tabName]);

    setTimeout(() => {
      setActiveTab(tabName);
      setLoading(false);
    }, 300);
  };

  const handleCardNavigate = screenName => {
    const tabMap = {
      exportDoc: 'exportDoc',
      blDates: 'blDates',
      shipping: 'shipping',
      bankSubmit: 'bankSubmit',
      realization: 'realization',
    };

    const tabName = tabMap[screenName];

    if (tabName) {
      handleTabChange(tabName);
    }
  };

  const handleSidebarSelect = tabName => {
    if (tabName === activeTab) {
      setShowSidebar(false);
      return;
    }

    setLoading(true);
    setNavigationHistory(prev => [...prev, tabName]);

    setTimeout(() => {
      setActiveTab(tabName);
      setLoading(false);
      setShowSidebar(false);
    }, 300);
  };

  const renderScreen = () => {
    if (showNotificationScreen) {
      return (
        <NotificationScreen
          onClose={handleCloseNotifications}
          onNotificationPress={handleNotificationPress}
          onRefreshCount={refreshUnreadCount}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardScreen
            onNavigate={handleCardNavigate}
            userData={userData}
          />
        );

      case 'exportDoc':
        return (
          <ExportDocsScreen onLoadingChange={setLoading} userData={userData} />
        );

      case 'blDates':
        return <BLScreen onLoadingChange={setLoading} userData={userData} />;

      case 'shipping':
        return (
          <ShippingScreen onLoadingChange={setLoading} userData={userData} />
        );

      case 'bankSubmit':
        return (
          <BankSubmitScreen onLoadingChange={setLoading} userData={userData} />
        );

      case 'realization':
        return (
          <RealizationScreen onLoadingChange={setLoading} userData={userData} />
        );

      default:
        return (
          <DashboardScreen
            onNavigate={handleCardNavigate}
            userData={userData}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <Header
        onMenuPress={() => setShowSidebar(true)}
        onNotificationPress={handleOpenNotifications}
        unreadCount={unreadCount}
        onLogout={onLogout}
        userData={userData}
      />

      <View style={styles.content}>
        <View {...panResponder.panHandlers} style={styles.swipeContainer}>
          {loading ? <SkeletonLoader /> : renderScreen()}
        </View>
      </View>

      {!showNotificationScreen && (
        <BottomTabBar activeTab={activeTab} onTabPress={handleTabChange} />
      )}

      <Sidebar
        visible={showSidebar}
        onClose={() => setShowSidebar(false)}
        activeTab={activeTab}
        onTabSelect={handleSidebarSelect}
        userData={userData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c12',
  },
  content: {
    flex: 1,
  },
  swipeContainer: {
    flex: 1,
  },
});

export default AppNavigator;