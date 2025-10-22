import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    // Request notification permissions
    registerForPushNotificationsAsync();
  }, []);

  async function registerForPushNotificationsAsync() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Push notification permissions not granted');
    }
  }

  const handleLogin = () => {
    // {{AUTH_PROVIDER}} login placeholder
    setUser('demo@{{APP_NAME_LOWER}}.com');
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{{APP_NAME}}</Text>
      <Text style={styles.subtitle}>{{DESCRIPTION}}</Text>

      {user ? (
        <View style={styles.userSection}>
          <Text style={styles.welcomeText}>Welcome, {user}!</Text>
          {{#HAS_MONETIZATION}}
          <Text style={styles.subscriptionText}>
            {{MONETIZATION_TYPE}} - ${{PRICE_USD}}/month
          </Text>
          {{/HAS_MONETIZATION}}
          <Button title="Logout" onPress={handleLogout} />
        </View>
      ) : (
        <Button title="Login ({{AUTH_PROVIDER}})" onPress={handleLogin} />
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  userSection: {
    alignItems: 'center',
    gap: 10,
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 10,
  },
  subscriptionText: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 20,
  },
});
