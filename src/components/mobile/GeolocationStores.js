// file: /src/components/mobile/GeolocationStores.js - Find nearby stores using GPS
'use client';

import { useState, useEffect, useCallback } from 'react';
import { TouchEnhancedButton } from './TouchEnhancedButton';
import { usePWA } from '@/hooks/usePWA';

export function GeolocationStores({ onStoreSelected, selectedStore }) {
    const [location, setLocation] = useState(null);
    const [nearbyStores, setNearbyStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [permissionStatus, setPermissionStatus] = useState('prompt');
    const { vibrateDevice } = usePWA();

    // Check geolocation support and permission
    useEffect(() => {
        const checkGeolocationSupport = async () => {
            if ('geolocation' in navigator) {
                // Check permission status if available
                if ('permissions' in navigator) {
                    navigator.permissions.query({name: 'geolocation'}).then((result) => {
                        setPermissionStatus(result.state);
                    });
                }
            } else {
                const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Geolocation Not Supported',
                    message: 'Geolocation is not supported by this browser'
                });
            }
        };

        checkGeolocationSupport();
    }, []);

    // Get user's current location
    const getCurrentLocation = useCallback(async () => {
        if (!('geolocation' in navigator)) {
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Geolocation Not Available',
                message: 'Geolocation is not supported'
            });
            return;
        }

        setLoading(true);

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const {latitude, longitude} = position.coords;
                setLocation({lat: latitude, lng: longitude});
                setLoading(false);
                vibrateDevice([50]); // Success feedback
                findNearbyStores(latitude, longitude);
            },
            async (error) => {
                setLoading(false);
                let errorMessage = 'Failed to get location';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied. Please enable location services.';
                        setPermissionStatus('denied');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out. Please try again.';
                        break;
                    default:
                        errorMessage = 'Unknown location error occurred.';
                }

                const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Geolocation Error',
                    message: errorMessage
                });
                console.error('Geolocation error:', error);
            },
            options
        );
    }, [vibrateDevice]);

    // Find nearby stores (mock implementation - replace with real API)
    const findNearbyStores = useCallback(async (lat, lng) => {
        try {
            setLoading(true);

            // Mock nearby stores - in real implementation, call your API
            // const response = await fetch(`/api/stores/nearby?lat=${lat}&lng=${lng}&radius=10`);

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            const mockStores = [
                {
                    id: 'walmart-nearby-1',
                    name: 'Walmart Supercenter',
                    chain: 'Walmart',
                    address: '1234 Main St, Your City, ST 12345',
                    distance: 0.8,
                    coordinates: { lat: lat + 0.01, lng: lng + 0.01 },
                    isOpen: true,
                    hours: 'Open 24 hours',
                    phone: '(555) 123-4567'
                },
                {
                    id: 'target-nearby-1',
                    name: 'Target',
                    chain: 'Target',
                    address: '5678 Shopping Blvd, Your City, ST 12345',
                    distance: 1.2,
                    coordinates: { lat: lat - 0.01, lng: lng + 0.01 },
                    isOpen: true,
                    hours: 'Open until 10 PM',
                    phone: '(555) 987-6543'
                },
                {
                    id: 'kroger-nearby-1',
                    name: 'Kroger',
                    chain: 'Kroger',
                    address: '9012 Grocery Ave, Your City, ST 12345',
                    distance: 2.1,
                    coordinates: { lat: lat + 0.02, lng: lng - 0.01 },
                    isOpen: false,
                    hours: 'Closed - Opens at 6 AM',
                    phone: '(555) 456-7890'
                },
                {
                    id: 'costco-nearby-1',
                    name: 'Costco Wholesale',
                    chain: 'Costco',
                    address: '3456 Warehouse Way, Your City, ST 12345',
                    distance: 3.5,
                    coordinates: { lat: lat - 0.02, lng: lng - 0.02 },
                    isOpen: true,
                    hours: 'Open until 9:30 PM',
                    phone: '(555) 234-5678'
                }
            ];

            setNearbyStores(mockStores);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch nearby stores:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Store Search Failed',
                message: 'Failed to find nearby stores'
            });
            setLoading(false);
        }
    }, []);

    // Open store in maps app
    const openInMaps = useCallback((store) => {
        const { lat, lng } = store.coordinates;
        const query = encodeURIComponent(store.address);

        // Detect platform and open appropriate maps app
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);

        let mapsUrl;
        if (isIOS) {
            mapsUrl = `maps://maps.google.com/maps?q=${lat},${lng}`;
        } else if (isAndroid) {
            mapsUrl = `geo:${lat},${lng}?q=${query}`;
        } else {
            mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        }

        window.open(mapsUrl, '_blank');
    }, []);

    // Get directions to store
    const getDirections = useCallback((store) => {
        if (!location) {
            getCurrentLocation();
            return;
        }

        const { lat: destLat, lng: destLng } = store.coordinates;
        const { lat: srcLat, lng: srcLng } = location;

        const directionsUrl = `https://www.google.com/maps/dir/${srcLat},${srcLng}/${destLat},${destLng}`;
        window.open(directionsUrl, '_blank');
    }, [location, getCurrentLocation]);

    if (permissionStatus === 'denied') {
        return (
            <div style={{
                padding: '1rem',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                textAlign: 'center'
            }}>
                <div style={{
                    fontSize: '2rem',
                    marginBottom: '0.5rem'
                }}>
                    📍
                </div>
                <h3 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#dc2626'
                }}>
                    Location Access Denied
                </h3>
                <p style={{
                    margin: '0 0 1rem 0',
                    fontSize: '0.875rem',
                    color: '#7f1d1d'
                }}>
                    To find nearby stores, please enable location services in your browser settings.
                </p>
                <TouchEnhancedButton
                    onClick={() => window.location.reload()}
                    style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                    }}
                >
                    Refresh Page
                </TouchEnhancedButton>
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '1rem',
                backgroundColor: '#e2e8f0',
                borderBottom: '1px solid #cbd5e1'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#374151'
                    }}>
                        📍 Nearby Stores
                    </h3>

                    <TouchEnhancedButton
                        onClick={getCurrentLocation}
                        disabled={loading}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.75rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}
                    >
                        {loading ? '⏳' : '🔄'} Find Stores
                    </TouchEnhancedButton>
                </div>

                {location && (
                    <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.75rem',
                        color: '#6b7280'
                    }}>
                        📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '0.875rem',
                    borderBottom: '1px solid #fecaca'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6b7280'
                }}>
                    <div style={{
                        fontSize: '2rem',
                        marginBottom: '0.5rem',
                        animation: 'spin 1s linear infinite'
                    }}>
                        🔄
                    </div>
                    <div>Finding nearby stores...</div>
                </div>
            )}

            {/* Stores List */}
            {nearbyStores.length > 0 && (
                <div style={{
                    maxHeight: '400px',
                    overflow: 'auto'
                }}>
                    {nearbyStores.map((store) => (
                        <div
                            key={store.id}
                            style={{
                                padding: '1rem',
                                borderBottom: '1px solid #e5e7eb',
                                backgroundColor: selectedStore === store.name ? '#f0f9ff' : 'white'
                            }}
                        >
                            {/* Store Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '0.5rem'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{
                                        margin: '0 0 0.25rem 0',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: '#111827'
                                    }}>
                                        {store.name}
                                    </h4>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#6b7280',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {store.chain} • {store.distance} miles away
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '500',
                                        color: store.isOpen ? '#059669' : '#dc2626'
                                    }}>
                                        {store.isOpen ? '🟢 Open' : '🔴 Closed'}
                                    </div>
                                </div>
                            </div>

                            {/* Store Details */}
                            <div style={{
                                fontSize: '0.8rem',
                                color: '#6b7280',
                                marginBottom: '0.75rem'
                            }}>
                                <div>{store.address}</div>
                                <div>{store.hours}</div>
                                <div>{store.phone}</div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{
                                display: 'flex',
                                gap: '0.5rem',
                                flexWrap: 'wrap'
                            }}>
                                <TouchEnhancedButton
                                    onClick={() => onStoreSelected(store.name)}
                                    style={{
                                        backgroundColor: selectedStore === store.name ? '#059669' : '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '0.5rem 0.75rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    {selectedStore === store.name ? '✅ Selected' : '🏪 Select Store'}
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                    onClick={() => getDirections(store)}
                                    style={{
                                        backgroundColor: 'white',
                                        color: '#3b82f6',
                                        border: '1px solid #3b82f6',
                                        borderRadius: '6px',
                                        padding: '0.5rem 0.75rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🧭 Directions
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                    onClick={() => openInMaps(store)}
                                    style={{
                                        backgroundColor: 'white',
                                        color: '#6b7280',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        padding: '0.5rem 0.75rem',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📍 Open Maps
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && nearbyStores.length === 0 && location && (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6b7280'
                }}>
                    <div style={{
                        fontSize: '2rem',
                        marginBottom: '0.5rem'
                    }}>
                        🏪
                    </div>
                    <div>No nearby stores found</div>
                    <TouchEnhancedButton
                        onClick={() => findNearbyStores(location.lat, location.lng)}
                        style={{
                            marginTop: '1rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                        }}
                    >
                        Search Again
                    </TouchEnhancedButton>
                </div>
            )}

            <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}