import {Button, Text, View} from 'react-native';
import React, {useState} from 'react';

const UseStateHook = () => {
  const [name, setName] = useState('John Doe');
  const [count, setCount] = useState(0);
  const updateName = () => {
    setName('Alice Johnson');
  };

  return (
    <View>
      <Text style={{fontSize: 20, fontWeight: 'bold'}}>Name: {name}</Text>

      <Button title="Increment Count" onPress={() => setCount(count + 1)} />
      <Text>{count} </Text>

      {/* <Button
                title="Change Name"
                onPress={() => setName("Jane Smith")}
            /> */}

      <Button title="Change Name" onPress={updateName} />
    </View>
  );
};

export default UseStateHook;
