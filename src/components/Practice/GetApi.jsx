import React, {useEffect, useState} from 'react';
import {View, Text} from 'react-native';
import axios from 'axios';

const GetApi = () => {
  const [myData, setMyData] = useState([]);

  useEffect(() => {
    axios
      .get('http://10.0.2.2:5000/users')
      .then(result => {
        setMyData(result.data);
        console.log(result.data);
      })
      .catch(error => {
        console.log('Error:', error);
      });
  }, []);

  return (
    <View style={{padding: 20}}>
      <Text style={{fontSize: 20, fontWeight: 'bold'}}>Users List</Text>

      {myData.map(item => (
        <View key={item.id} style={{marginTop: 10}}>
          <Text>Name: {item.name}</Text>
          <Text>Email: {item.email}</Text>
        </View>
      ))}
    </View>
  );
};

export default GetApi;
