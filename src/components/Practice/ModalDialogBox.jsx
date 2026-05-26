import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import React, {useState} from 'react';

const ModalDialogBox = () => {
  const [modalVisible, setModalVisible] = useState(false);

  // 🔥 Alert function
  const showAlert = () => {
    Alert.alert('Confirmation', 'Do you want to open the modal?', [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => console.log('Cancelled'),
      },
      {
        text: 'Yes',
        onPress: () => setModalVisible(true),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* 🔹 ALERT BUTTON */}
      <TouchableOpacity
        style={[
          styles.Opnbutton,
          {backgroundColor: 'orange', marginBottom: 10},
        ]}
        onPress={showAlert}>
        <Text style={{color: '#fff'}}>Show Alert</Text>
      </TouchableOpacity>

      {/* 🔹 MODAL BUTTON */}
      <TouchableOpacity
        style={styles.Opnbutton}
        onPress={() => setModalVisible(true)}>
        <Text style={{color: '#fff'}}>Show Modal Direct</Text>
      </TouchableOpacity>

      {/* 🔹 MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Title Box</Text>

            <Text style={styles.modalText}>
              This is Box 2.........................................
            </Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}>
              <Text style={{color: '#fff'}}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  Opnbutton: {
    padding: 12,
    backgroundColor: '#007bff',
    borderRadius: 5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    width: 300,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  modalText: {
    marginBottom: 20,
    textAlign: 'center',
  },

  closeButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 5,
  },
});

export default ModalDialogBox;
