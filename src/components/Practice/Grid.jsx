import {ScrollView, StyleSheet, Text, View} from 'react-native';
import React from 'react';

const data = [
  {id: 1, name: 'Item 1'},
  {id: 2, name: 'Item 2'},
  {id: 3, name: 'Item 3'},
  {id: 4, name: 'Item 4'},
  {id: 5, name: 'Item 5'},
  {id: 6, name: 'Item 6'},
  {id: 7, name: 'Item 7'},
  {id: 8, name: 'Item 8'},
  {id: 9, name: 'Item 9'},
  {id: 10, name: 'Item 10'},
  {id: 11, name: 'Item 11'},
  {id: 12, name: 'Item 12'},
  {id: 13, name: 'Item 13'},
  {id: 14, name: 'Item 14'},
  {id: 15, name: 'Item 15'},
];

const Grid = () => {
  return (
    <View style={styles.mainContainer}>
      <Text style={styles.heading}>Grid</Text>
      <ScrollView contentContainerStyle={styles.container}>
        {data.map(item => (
          <View key={item.id} style={styles.gridItem}>
            <Text style={styles.itemText}>{item.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#ffdede',
  },

  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    marginVertical: 20,
    color: '#000000',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    flexWrap: 'wrap',
  },
  gridItem: {
    backgroundColor: '#ff6803',
    width: '48%',
    height: 100,
    padding: 10,
    marginBottom: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default Grid;
