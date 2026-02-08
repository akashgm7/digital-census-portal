/**
 * Custom hook for geolocation.
 */
import { useState, useCallback } from 'react';

export const useGeolocation = () => {
    const [position, setPosition] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const getPosition = useCallback(() => {
        return new Promise((resolve, reject) => {
            setLoading(true);
            setError(null);

            if (!navigator.geolocation) {
                const err = 'Geolocation is not supported by your browser';
                setError(err);
                setLoading(false);
                reject(err);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords = {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                    };
                    setPosition(coords);
                    setLoading(false);
                    resolve(coords);
                },
                (err) => {
                    let errorMessage = 'Unable to retrieve location';
                    switch (err.code) {
                        case err.PERMISSION_DENIED:
                            errorMessage = 'Location permission denied. Please enable GPS.';
                            break;
                        case err.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable.';
                            break;
                        case err.TIMEOUT:
                            errorMessage = 'Location request timed out.';
                            break;
                    }
                    setError(errorMessage);
                    setLoading(false);
                    reject(errorMessage);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        });
    }, []);

    return { position, error, loading, getPosition };
};

export default useGeolocation;
