import {View, Text, TextInput, Button, Alert} from 'react-native';
import React, {useState} from 'react';
import axios from 'axios';
const PostApi = () => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
  });

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleInputSubmit = async () => {
    try {
      const response = await axios.post(
        'http://192.168.107.85:5000/users',
        formData,
      );

      Alert.alert('Success', 'Form data submitted successfully!');
      console.log('Response:', response.data);
      setFormData({
        id: '',
        name: '',
        email: '',
      });
    } catch (error) {
      console.error('Error submitting form data:', error);
      Alert.alert('Error', 'Failed to submit form data.');
    }
  };

  return (
    <View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: 20,
        }}>
        Post API Component
      </Text>
      <TextInput
        placeholder="Enter your Id"
        value={formData.id}
        onChangeText={value => handleInputChange('id', value)}
      />
      <TextInput
        placeholder="Enter your Name"
        value={formData.name}
        onChangeText={value => handleInputChange('name', value)}
      />
      <TextInput
        placeholder="Enter your Email"
        value={formData.email}
        onChangeText={value => handleInputChange('email', value)}
      />

      <Button title="Submit" onPress={handleInputSubmit} />
    </View>
  );
};

export default PostApi;
