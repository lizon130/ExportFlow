import axios from 'axios';
import React, {useState} from 'react';
import {View, Text, TextInput, Button, Alert, StyleSheet} from 'react-native';

const PutApi = () => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
  });

  const handleInputChange = (field, value) => {
    setFormData({...formData, [field]: value});
  };

  const handleUpdate = async () => {
    // 🔥 validation
    if (!formData.id) {
      Alert.alert('Error', 'Please enter ID');
      return;
    }

    try {
      const response = await axios.patch(
        `http://192.168.107.85:5000/users/${formData.id}`,
        {
          name: formData.name,
          email: formData.email,
        },
      );

      Alert.alert('Success', 'Data updated successfully!');
      console.log(response.data);

      // reset form
      setFormData({
        id: '',
        name: '',
        email: '',
      });
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to update data.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Put API</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your Id"
        value={formData.id}
        onChangeText={value => handleInputChange('id', value)}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Enter your Name"
        value={formData.name}
        onChangeText={value => handleInputChange('name', value)}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter your Email"
        value={formData.email}
        onChangeText={value => handleInputChange('email', value)}
        keyboardType="email-address"
      />

      <Button title="Update" onPress={handleUpdate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
});

export default PutApi;
