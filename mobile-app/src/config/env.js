import Constants from 'expo-constants';

const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const fromConfig = Constants.expoConfig?.extra?.apiUrl;

export const API_URL = fromEnv || fromConfig || 'http://10.0.2.2:5000/api';
