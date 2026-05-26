// src/components/StatusBadge.js
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const StatusBadge = ({status, color}) => (
  <View style={[styles.badge, {backgroundColor: color + '20'}]}>
    <Text style={[styles.text, {color}]}>{status}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {fontSize: 10, fontWeight: '500'},
});

export default StatusBadge;
