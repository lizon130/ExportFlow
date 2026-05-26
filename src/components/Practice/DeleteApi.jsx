import {Alert, Button, Text, TextInput, View} from 'react-native';
import React from 'react';
import axios from 'axios';

const DeleteApi = () => {
  const [id, setId] = React.useState('');
  const handleDelete = async () => {
    try {
      const response = await axios.delete(
        `http://192.168.107.85:5000/users/${id}`,
      );
      Alert.alert('Success', 'Data deleted successfully');
      setId('');
      console.log('Response:', response.data);
    } catch (error) {
      console.error('Error deleting data:', error);
      Alert.alert('Error', 'Failed to delete data');
    }
  };

  return (
    <View>
      <Text style={{fontSize: 20, fontWeight: 'bold'}}>Delete API</Text>
      <TextInput
        placeholder="Enter ID to delete"
        value={id}
        onChangeText={value => setId(value)}
      />

      <Button title="Delete" onPress={handleDelete} />
    </View>
  );
};

export default DeleteApi;
