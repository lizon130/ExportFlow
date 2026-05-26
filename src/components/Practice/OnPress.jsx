import {Button, Text, View} from 'react-native';
import React from 'react';

const OnPress = () => {
  let name = 'Arman';
  const getName = () => {
    name = 'Lizon';
    console.log('Name: ', name);
  };
  return (
    <View>
      <Text style={{fontSize: 30}}>{name}</Text>

      <Button title="Click Me" onPress={getName} />

      {/* <Button title="Click Me" onPress={() => getName('Arman')} /> //paraerer passing */}
    </View>
  );
};

export default OnPress;
