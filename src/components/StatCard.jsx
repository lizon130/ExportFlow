// src/components/StatCard.js
import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

const StatCard = ({title, icon, value, badge, trend, color, onPress}) => (
  <TouchableOpacity
    style={[styles.card, {backgroundColor: color}]}
    onPress={onPress}
    activeOpacity={0.8}>
    <View style={styles.header}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    </View>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.title}>{title}</Text>
    <View style={styles.footer}>
      <Text style={styles.trend}>{trend}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {flex: 1, minWidth: '47%', borderRadius: 16, padding: 14},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {fontSize: 16},
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {fontSize: 10, color: 'white'},
  value: {fontSize: 22, fontWeight: '800', color: 'white', marginBottom: 4},
  title: {fontSize: 11, color: 'rgba(255,255,255,0.9)'},
  footer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  trend: {fontSize: 9, color: 'rgba(255,255,255,0.8)'},
});

export default StatCard;
