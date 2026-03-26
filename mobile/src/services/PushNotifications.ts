import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

/**
 * Configure how notifications appear when the app is in the foreground.
 */
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Register for Expo push notifications. 
 * Returns the ExponentPushToken or null if registration fails.
 */
export async function registerForPushNotifications(): Promise<string | null> {
    try {
        // Push notifications only work on physical devices
        if (!Device.isDevice) {
            console.log('[PushNotifications] Must use physical device for push notifications.');
            return null;
        }

        // Check existing permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // Ask for permission if not already granted
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('[PushNotifications] Permission not granted.');
            return null;
        }

        // Get the Expo push token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: projectId,
        });

        const token = tokenData.data;
        console.log('[PushNotifications] Token:', token);

        // Android: set notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#00D4FF',
                sound: 'default',
            });
        }

        return token;
    } catch (e) {
        console.error('[PushNotifications] Registration failed:', e);
        return null;
    }
}
