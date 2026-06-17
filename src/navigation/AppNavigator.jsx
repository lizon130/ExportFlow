// AppNavigator.js - With Back Navigation and Swipe Gestures (No Animation)
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

// Import all screens
import DashboardScreen from '../components/DashboardScreen';
import ExportDocsScreen from '../screens/ExportDocsScreen';
import BLScreen from '../screens/BLScreen';
import ShippingScreen from '../screens/ShippingScreen';
import BankSubmitScreen from '../screens/BankSubmitScreen';
import RealizationScreen from '../screens/RealizationScreen';
import NotificationScreen from '../screens/NotificationScreen'; // Add this

import {registerFCMToken} from '../services/NotificationService';
import messaging from '@react-native-firebase/messaging';

// Import notifications data
import {notifications} from '../data/mockData';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const AppNavigator = ({onLogout, userData}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationScreen, setShowNotificationScreen] = useState(false); // Add this
  const [loading, setLoading] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState(['dashboard']);

  const isNavigating = useRef(false);

  useEffect(() => {
  if (userData) {
    registerFCMToken(userData);
  }
}, [userData]);

useEffect(() => {
  const unsubscribe = messaging().onMessage(async remoteMessage => {
    console.log('FCM FOREGROUND RECEIVED:', JSON.stringify(remoteMessage));

    Alert.alert(
      remoteMessage?.notification?.title ||
        remoteMessage?.data?.title ||
        'Notification',
      remoteMessage?.notification?.body ||
        remoteMessage?.data?.body ||
        'No message',
    );
  });

  return unsubscribe;
}, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Handle notification open
  const handleOpenNotifications = () => {
    setShowNotifications(false); // Close modal if open
    setShowNotificationScreen(true); // Open full screen notification page
  };

  // Handle close notification screen
  const handleCloseNotifications = () => {
    setShowNotificationScreen(false);
  };

  // Handle notification press
  const handleNotificationPress = notification => {
    console.log('Notification pressed:', notification);
    // Future: Navigate to specific screen based on notification type
    setShowNotificationScreen(false);
  };

  // PanResponder for swipe gestures - No animation, just navigation
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gestureState) => {
        // Don't allow swipe when notification screen is open
        if (showNotificationScreen) {
          return false;
        }

        // Only allow swipe from left edge when we can go back
        const canGoBack =
          navigationHistory.length > 1 || activeTab !== 'dashboard';
        const isFromLeftEdge = gestureState.moveX < 30;
        return canGoBack && isFromLeftEdge && !isNavigating.current;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger on horizontal swipe (not vertical)
        return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        // Navigate back if swiped more than 50px to the right
        if (gestureState.dx > 50) {
          goBack();
        }
      },
    }),
  ).current;

  // Go back to previous tab
  const goBack = useCallback(() => {
    if (isNavigating.current) {
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
  }, [navigationHistory, activeTab, goBackToDashboard]);

  // Go back to dashboard
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

  // Handle hardware back button (Android)
  useEffect(() => {
    const backAction = () => {
      // Close sidebar if open
      if (showSidebar) {
        setShowSidebar(false);
        return true;
      }

      // Close notification screen if open
      if (showNotificationScreen) {
        setShowNotificationScreen(false);
        return true;
      } 

      // Close notifications modal if open
      if (showNotifications) {
        setShowNotifications(false);
        return true;
      }

      // Go back to previous tab if exists
      if (navigationHistory.length > 1) {
        goBack();
        return true;
      }

      // Exit app if on main dashboard
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

      // Go back to dashboard
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
  ]);

  // Handle navigation with history
  const handleTabChange = tabName => {
    if (tabName === activeTab || isNavigating.current) {
      return;
    }

    setLoading(true);

    // Add to navigation history
    setNavigationHistory(prev => [...prev, tabName]);

    setTimeout(() => {
      setActiveTab(tabName);
      setLoading(false);
    }, 300);
  };

  // Handle navigation from cards
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

  // Handle sidebar navigation
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
    // Show notification screen first if open
    if (showNotificationScreen) {
      return (
        <NotificationScreen
          onClose={handleCloseNotifications}
          onNotificationPress={handleNotificationPress}
        />
      );
    }

    // Otherwise show regular screens
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
        onBackPress={navigationHistory.length > 1 ? goBack : null}
        showBackButton={
          navigationHistory.length > 1 || activeTab !== 'dashboard'
        }
      />

      <View style={styles.content}>
        <View {...panResponder.panHandlers} style={styles.swipeContainer}>
          {loading ? <SkeletonLoader /> : renderScreen()}
        </View>
      </View>

      {/* Hide bottom tab bar when notification screen is open */}
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
