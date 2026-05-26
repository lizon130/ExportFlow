import {FlatList, Text} from 'react-native';
import React from 'react';
import {userContactInfo} from './userContactInfo';
import ContactItem from '../../components/Practice/ContactItem';
import {styles} from './style';

const ContactListScreen = () => {
  const renderItem = ({item}) => {
    return <ContactItem name={item.name} email={item.email} />;
  };

  return (
    <FlatList
      data={userContactInfo}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={<Text style={styles.heading}>Contacts</Text>}
    />
  );
};

export default ContactListScreen;
