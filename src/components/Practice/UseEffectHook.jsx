import {Button, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';

const UseEffectHook = () => {
  const [count, setCount] = useState(1);

  useEffect(() => {
    console.log('Use Effect Hook');
  }, []);

  return (
    <View style={{padding: 20}}>
      <Text style={{fontSize: 20}}>Use Effect Hook</Text>
      <Text style={{marginVertical: 10}}>Count: {count}</Text>

      <Button title="Increase" onPress={() => setCount(count + 1)} />
    </View>
  );
};

export default UseEffectHook;
