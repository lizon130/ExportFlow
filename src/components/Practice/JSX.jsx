import {Text, View} from 'react-native';
import React from 'react';

const JSX = () => {
  let name = 'Arman';
  const age = () => {
    return 25;
  };
  return (
    <View>
      <Text style={{fontSize: 20, fontWeight: 'bold'}}>
        This is a JSX component!
      </Text>
      <Text style={{fontSize: 16}}>Hello, {name}!</Text>
      <Text style={{fontSize: 16}}>You are {age()}</Text>
    </View>
  );
};

export default JSX;

// jsx = javascript syntax extension
