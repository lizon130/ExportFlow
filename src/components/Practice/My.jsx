import {StyleSheet, Text, View} from 'react-native';
import React from 'react';

const My = () => {
  return (
    <View>
      <Text style={styles.Text}>My Component</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  Text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'blue',
  },
});

export default My;
