import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

const BottomTabBar = ({activeTab, onTabPress}) => {
  const leftTabs = [
    {id: 'exportDoc', icon: '📄', label: 'Exports'},
    {id: 'blDates', icon: '🚢', label: 'B/L Date'},
  ];

  const rightTabs = [
    {id: 'shipping', icon: '🚚', label: 'Shipping'},
    {id: 'bankSubmit', icon: '🏦', label: 'Bank'},
  ];

  return (
    <View style={styles.bottomTabBar}>
      {/* Left Tabs */}
      <View style={styles.sideTabs}>
        {leftTabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabItem,
              activeTab === tab.id && styles.tabItemActive,
            ]}
            onPress={() => onTabPress(tab.id)}>
            <Text
              style={[
                styles.tabIcon,
                activeTab === tab.id && styles.tabIconActive,
              ]}>
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive,
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Home Button */}
      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => onTabPress('dashboard')}>
        <View
          style={[
            styles.homeIconContainer,
            activeTab === 'dashboard' && styles.homeIconContainerActive,
          ]}>
          <Text
            style={[
              styles.homeIcon,
              activeTab === 'dashboard' && styles.homeIconActive,
            ]}>
            🏠
          </Text>
        </View>
        <Text
          style={[
            styles.homeLabel,
            activeTab === 'dashboard' && styles.homeLabelActive,
          ]}>
          Home
        </Text>
      </TouchableOpacity>

      {/* Right Tabs */}
      <View style={styles.sideTabs}>
        {rightTabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabItem,
              activeTab === tab.id && styles.tabItemActive,
            ]}
            onPress={() => onTabPress(tab.id)}>
            <Text
              style={[
                styles.tabIcon,
                activeTab === tab.id && styles.tabIconActive,
              ]}>
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive,
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#12141c',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  sideTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  tabItemActive: {
    backgroundColor: '#1e293b',
  },
  tabIcon: {
    fontSize: 18,
    color: '#5b6b8c',
  },
  tabIconActive: {
    color: '#3b82f6',
  },
  tabLabel: {
    fontSize: 9,
    color: '#5b6b8c',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#3b82f6',
  },
  homeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  homeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  homeIconContainerActive: {
    backgroundColor: '#3b82f6',
  },
  homeIcon: {
    fontSize: 24,
    color: '#3b82f6',
  },
  homeIconActive: {
    color: 'white',
  },
  homeLabel: {
    fontSize: 9,
    color: '#5b6b8c',
    marginTop: 2,
  },
  homeLabelActive: {
    color: '#3b82f6',
  },
});

export default BottomTabBar;
