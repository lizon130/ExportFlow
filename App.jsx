import {Button, Pressable, Text, View} from 'react-native';
import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JSX from './src/components/Practice/JSX';
import OnPress from './src/components/Practice/OnPress';
import UseStateHook from './src/components/Practice/UseStateHook';
import FlastListScreen from './src/components/Practice/FlatListScreen';
import SectionListScreen from './src/components/Practice/SectionListScreen';
import LoginForm from './src/components/Practice/LoginForm';
import ContactListScreen from './src/screens/Contact/ContactListScreen';
import Grid from './src/components/Practice/Grid';
import UseEffectHook from './src/components/Practice/UseEffectHook';
import LoginScreen from './src/components/LoginScreen';
import DashboardScreen from './src/components/DashboardScreen';
import AppNavigator from './src/navigation/AppNavigator';
import UseRefHook from './src/components/Practice/UseRefHook';
import PutApi from './src/components/Practice/PutApi';
import PatchApi from './src/components/Practice/PatchApi';
import DeleteApi from './src/components/Practice/DeleteApi';
import GetApiList from './src/components/Practice/GetApiList';
// import PostApi from './src/components/Practice/PostApi';
// import GetApi from './src/components/Practice/GetApi';
// import StatusBarExample from './src/components/Practice/StatusBarExample';
// import Loader from './src/components/Loader';
// import HideShowToggle from './src/components/HideShowToggle';
// import PressableComponent from './src/components/Practice/PressableComponent';
// import ModalDialogBox from './src/components/Practice/ModalDialogBox';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      setIsLoggedIn(false);
      setUserData(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleLoginSuccess = async userInfo => {
    console.log('Login Success - User Info:', userInfo);
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userInfo));
      setUserData(userInfo);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error saving user data:', error);
      setUserData(userInfo);
      setIsLoggedIn(true);
    }
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0a0c12',
        }}>
        <Text style={{color: '#fff'}}>Loading...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <View style={{flex: 1}}>
      {/*
        <JSX/>
        <OnPress/> */}
      {/* <UseStateHook/> */}
      {/* <FlastListScreen/> */}
      {/* <SectionListScreen/> */}
      {/* <LoginForm/> */}
      {/* <ContactListScreen/> */}
      {/* <Grid/> */}

      {/* <LoginScreen/> */}
      {/* <DashboardScreen/> */}
      <AppNavigator onLogout={handleLogout} userData={userData} />
      {/* <UseEffectHook/> */}

      {/* <HideShowToggle/> */}
      {/* <Loader/> */}
      {/* <PressableComponent/> */}

      {/* <StatusBarExample/> */}
      {/* <UseRefHook/> */}
      {/* <ModalDialogBox/>  */}
      {/* <GetApi /> */}
      {/* <PostApi /> */}
      {/* <PutApi /> */}
      {/* <PatchApi /> */}
      {/* <DeleteApi /> */}
      {/* <GetApiList /> */}
    </View>
  );
};

export default App;
