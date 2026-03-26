import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_LOCATION_TASK = 'CIVICSENTINEL_BACKGROUND_LOCATION';
const CONVEX_URL_KEY = 'CONVEX_URL';
const USER_ID_KEY = 'BACKGROUND_USER_ID';

/**
 * Background task handler — runs when the user moves 100m+, even if app is closed.
 * It reads the stored Convex URL and user ID, then calls the geospatial proximity action
 * via a direct HTTP request to the Convex deployment.
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) {
        console.error('[BackgroundLocation] Error:', error);
        return;
    }
    if (!data) return;

    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const latestLocation = locations[locations.length - 1];
    const { latitude, longitude } = latestLocation.coords;

    try {
        const convexUrl = await AsyncStorage.getItem(CONVEX_URL_KEY);
        const userId = await AsyncStorage.getItem(USER_ID_KEY);

        if (!convexUrl || !userId) {
            console.log('[BackgroundLocation] No convex URL or user ID stored, skipping.');
            return;
        }

        // Call Convex action via HTTP API
        const actionUrl = convexUrl.replace('.cloud', '.site') 
            ? `${convexUrl}/api/action` 
            : `${convexUrl}/api/action`;

        // Use the Convex HTTP action endpoint  
        const response = await fetch(`${convexUrl.replace('.cloud', '.convex.cloud')}/api/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: 'geospatial:calculateProximity',
                args: {
                    citizenId: userId,
                    citizenLat: latitude,
                    citizenLng: longitude,
                    speed: latestLocation.coords.speed,
                },
            }),
        });

        if (response.ok) {
            console.log(`[BackgroundLocation] Geofence check triggered at ${latitude}, ${longitude}`);
        } else {
            console.warn('[BackgroundLocation] Convex action failed:', response.status);
        }
    } catch (e) {
        console.error('[BackgroundLocation] Failed to trigger geofence check:', e);
    }
});

/**
 * Start background location tracking. 
 * Call this after login when we have user context.
 */
export async function startBackgroundLocationTracking(userId: string, convexUrl: string) {
    try {
        // Store credentials for the background task to use
        await AsyncStorage.setItem(USER_ID_KEY, userId);
        await AsyncStorage.setItem(CONVEX_URL_KEY, convexUrl);

        // Request background location permission
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
            console.warn('[BackgroundLocation] Foreground location permission denied.');
            return false;
        }

        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
            console.warn('[BackgroundLocation] Background location permission denied.');
            return false;
        }

        // Check if already running
        const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        if (isRunning) {
            console.log('[BackgroundLocation] Already running.');
            return true;
        }

        // Start background tracking — fires every 100 metres of movement
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 100,       // Only trigger after 100m of movement
            deferredUpdatesInterval: 60000, // Batch updates every 60 seconds minimum
            showsBackgroundLocationIndicator: true, // iOS: shows blue location bar
            foregroundService: {
                notificationTitle: 'JanSang AI Active',
                notificationBody: 'Monitoring nearby government projects',
                notificationColor: '#00d4ff',
            },
        });

        console.log('[BackgroundLocation] Started successfully.');
        return true;
    } catch (e) {
        console.error('[BackgroundLocation] Failed to start:', e);
        return false;
    }
}

/**
 * Stop background location tracking (e.g. on logout).
 */
export async function stopBackgroundLocationTracking() {
    try {
        const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        if (isRunning) {
            await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
            console.log('[BackgroundLocation] Stopped.');
        }
        await AsyncStorage.removeItem(USER_ID_KEY);
    } catch (e) {
        console.error('[BackgroundLocation] Failed to stop:', e);
    }
}
