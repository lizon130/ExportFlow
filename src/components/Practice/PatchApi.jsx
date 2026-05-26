import axios from 'axios';
import React, {useState} from 'react';
import {Text, View, TextInput, Button, Alert, StyleSheet} from 'react-native';

const PatchApi = () => {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handlePatch = async () => {
    if (!id) {
      Alert.alert('Error', 'Please enter user ID');
      return;
    }

    // 🔥 build dynamic payload
    const updateData = {};

    if (name.trim() !== '') {
      updateData.name = name;
    }

    if (email.trim() !== '') {
      updateData.email = email;
    }

    try {
      const response = await axios.patch(
        `http://192.168.107.85:5000/users/${id}`,
        updateData,
      );

      Alert.alert('Success', 'User updated successfully!');
      console.log(response.data);

      setId('');
      setName('');
      setEmail('');
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Update failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Patch API</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter User ID"
        value={id}
        onChangeText={setId}
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        placeholder="Enter Name (optional)"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter Email (optional)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <Button title="Update (PATCH)" onPress={handlePatch} />
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

export default PatchApi;
