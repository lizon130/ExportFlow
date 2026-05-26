import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';

const data = [
  {id: 1, name: 'John'},
  {id: 2, name: 'Bane'},
  {id: 3, name: 'Doe'},
  {id: 4, name: 'Smith'},
  {id: 5, name: 'Jane'},
  {id: 6, name: 'Doe'},
];

const FlastListScreen = () => {
  const renderItem = ({item}) => {
    return (
      <View style={styleeee.item}>
        <Text>{item.name}</Text>
      </View>
    );
  };
  return (
    <View style={styleeee.container}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styleeee.list}
      />
    </View>
  );
};

const styleeee = StyleSheet.create({
  container: {
    backgroundColor: '#b92f2f',
    padding: 15,
  },
  list: {
    paddingHorizontal: 20,
  },
  item: {
    backgroundColor: '#fff',
    borderWidth: 5,
    borderColor: '#000',
    padding: 20,
    marginVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default FlastListScreen;
