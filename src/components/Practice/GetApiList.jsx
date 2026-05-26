import axios from 'axios';
import React, {useEffect, useState} from 'react';
import {View, Text, FlatList} from 'react-native';

const GetApiList = () => {
  const [apiData, setApiData] = useState([]);

  useEffect(() => {
    axios
      .get('http://192.168.107.85:5000/users')
      .then(response => {
        setApiData(response.data);
      })
      .catch(error => {
        console.log(error);
      });
  }, []);

  const renderItem = ({item}) => (
    <View>
      <Text>{item.name}</Text>
    </View>
  );

  return (
    <View>
      <Text>Users</Text>

      <FlatList
        data={apiData}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
      />
    </View>
  );
};

export default GetApiList;
