import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useState} from 'react';

const Loader = () => {
  const [loading, setLoading] = useState(false);

  return (
    <View style={styles.container}>
      {/* <ActivityIndicator size={60} color="green" /> */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText} onPress={() => setLoading(!loading)}>
          {loading ? 'Hide loading' : 'Show Loader'}
        </Text>
      </TouchableOpacity>
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="green" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

export default Loader;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'green',
    borderRadius: 5,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  loaderContainer: {
    width: 100,
    height: 100,
    backgroundColor: 'lightgray',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'black',
  },
});
