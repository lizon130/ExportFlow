import {StyleSheet, Text, View, Button} from 'react-native';
import React, {useState} from 'react';
import My from './My';

const HideShowToggle = () => {
  const [status, setStatus] = useState(true);

  return (
    <View>
      <Text style={styles.Text}>HideShowToggle</Text>
      {status ? <My /> : null}

      <Button title="Hide" onPress={() => setStatus(false)} />
      <Button title="Show" onPress={() => setStatus(true)} />
      <Button title="Toggle" onPress={() => setStatus(!status)} />
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

export default HideShowToggle;
