import React from 'react';
import {View, Pressable, Text, StyleSheet} from 'react-native';

const PressableComponent = () => {
  const handdlePressIn = () => {
    alert('Press In');
  };

  const handdlePressOut = () => {
    alert('Press Out');
  };

  const handdleLongPress = () => {
    alert('Long Pressed');
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.pressable}
        onLongPress={handdleLongPress}
        delayLongPress={3000}>
        <Text style={styles.text}>Press Me</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  pressable: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
  },

  text: {
    color: 'white',
    fontSize: 16,
  },
});

export default PressableComponent;
