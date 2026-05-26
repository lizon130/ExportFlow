import React from 'react';
import {View, Text, StatusBar, StyleSheet} from 'react-native';

const StatusBarExample = () => {
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={'light-content'}
        // backgroundColor={'#6a51ae'}
        backgroundColor={'#504179'}
        hidden={false}
        translucent={true}
      />
      <Text style={styles.text}>Status Bar!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6a51ae',
  },
  text: {
    color: '#fff',
    fontSize: 20,
  },
});

export default StatusBarExample;
