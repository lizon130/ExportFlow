import {SectionList, Text, View} from 'react-native';
import React from 'react';

const listItems = [
  {
    title: 'Fruits',
    data: [
      {id: 1, name: 'Apple'},
      {id: 2, name: 'Banana'},
      {id: 3, name: 'Orange'},
    ],
  },

  {
    title: 'Vegetables',
    data: [
      {id: 1, name: 'Carrot'},
      {id: 2, name: 'Broccoli'},
      {id: 3, name: 'Spinach'},
    ],
  },
];

const SectionListScreen = () => {
  const renderItem = ({item}) => (
    <View style={{backgroundColor: '#fff', padding: 20, marginVertical: 10}}>
      <Text style={{justifyContent: 'center'}}>{item.name}</Text>
    </View>
  );

  const renderSectionHeader = ({section}) => (
    <View style={{backgroundColor: '#eee', padding: 10}}>
      <Text style={{fontWeight: 'bold'}}>{section.title}</Text>
    </View>
  );

  return (
    <View>
      <SectionList
        sections={listItems}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={item => item.id}
      />
    </View>
  );
};

export default SectionListScreen;
