import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';

/**
 * LiveBusMap Component - Zero-npm Leaflet + OpenStreetMap Map Viewer
 * Clearly delineates between "DEMO / SIMULATION" and "REAL HARDWARE GPS"
 */
const LiveBusMap = ({
  busId,
  initialBusNumber = '',
  showControls = false,
  height = '540px',
  onClose = null,
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const historyPolylineRef = useRef(null);
  const waypointMarkersRef = useRef([]);
  const hasInitialCenteredRef = useRef(false);

  const [trackingData, setTrackingData] = useState(null);
  const [busDetails, setBusDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // User context from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Reset initial centering when busId changes
  useEffect(() => {
    hasInitialCenteredRef.current = false;
  }, [busId]);

  // Invalidate map size on modal display
  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [busId]);

  // Fetch live tracking telemetry for this bus
  const fetchLiveTracking = useCallback(async () => {
    if (!busId) {
      setError('Bus identifier not provided.');
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`http://localhost:5000/api/bus/tracking/live/${busId}`, {
        headers: {
          'x-user-id': currentUser._id || '',
        },
      });

      if (res.data?.success && res.data.bus) {
        setBusDetails(res.data.bus);
        setTrackingData(res.data.bus.tracking);
        setSimulating(res.data.bus.tracking?.status === 'simulating');
        setError('');
      }
    } catch (err) {
      console.warn('Error fetching live tracking:', err.response?.data?.message || err.message);
      const statusCode = err.response?.status;
      if (statusCode === 403) {
        setError(err.response?.data?.message || 'Access restricted: You are not authorized to track this bus.');
      } else if (statusCode === 401) {
        setError('Authentication session expired. Please sign in to view live tracking.');
      } else if (statusCode === 404) {
        setError('The requested bus or route tracking record was not found.');
      } else if (!err.response) {
        setError('Unable to reach the live tracking server. Please check your network connection.');
      } else {
        setError(err.response?.data?.message || 'Live tracking feed is temporarily unavailable.');
      }
    } finally {
      setLoading(false);
    }
  }, [busId, currentUser._id]);

  // Initial fetch and 3.5-second polling loop
  useEffect(() => {
    fetchLiveTracking();
    const interval = setInterval(fetchLiveTracking, 3500);
    return () => clearInterval(interval);
  }, [fetchLiveTracking]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;

    const currentLoc = trackingData?.currentLocation;
    const defaultLat = currentLoc?.latitude || 11.2742;
    const defaultLng = currentLoc?.longitude || 77.6070;

    // 1. Create Map Instance if not created
    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: true,
        touchZoom: true,
        dragging: true,
      });

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // 2. Draw Route Waypoints Polyline
    const waypoints = trackingData?.routeWaypoints || [];
    if (waypoints.length > 0) {
      const routeCoords = waypoints.map((w) => [w.latitude, w.longitude]);

      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(routeCoords);
      } else {
        routePolylineRef.current = window.L.polyline(routeCoords, {
          color: '#1E3A8A',
          weight: 4,
          opacity: 0.6,
          dashArray: '8, 8',
        }).addTo(map);
      }

      // Add small circle markers for waypoints if not added
      if (waypointMarkersRef.current.length === 0) {
        waypoints.forEach((wp, idx) => {
          const wpMarker = window.L.circleMarker([wp.latitude, wp.longitude], {
            radius: 5,
            color: '#1E3A8A',
            fillColor: idx === waypoints.length - 1 ? '#10B981' : '#FFFFFF',
            fillOpacity: 1,
            weight: 2,
          })
            .bindTooltip(`Stop ${idx + 1}: ${wp.name}`, { permanent: false, direction: 'top' })
            .addTo(map);
          waypointMarkersRef.current.push(wpMarker);
        });
      }
    }

    // 3. Draw Path History Trail
    const pathHistory = trackingData?.pathHistory || [];
    if (pathHistory.length > 0) {
      const histCoords = pathHistory.map((p) => [p.latitude, p.longitude]);
      if (historyPolylineRef.current) {
        historyPolylineRef.current.setLatLngs(histCoords);
      } else {
        historyPolylineRef.current = window.L.polyline(histCoords, {
          color: '#3B82F6',
          weight: 4,
          opacity: 0.85,
        }).addTo(map);
      }
    }

    // 4. Create or Move Bus Marker (Without forcing viewport resets)
    if (currentLoc?.latitude && currentLoc?.longitude) {
      const isHardware = trackingData?.source === 'hardware';
      const busNum = busDetails?.busNumber || initialBusNumber;

      const markerHtml = `
        <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: ${isHardware ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'};
            animation: cbtsPulse 2s infinite;
          "></div>
          <div style="
            position: relative;
            background: ${isHardware ? '#10B981' : '#D97706'};
            color: #ffffff;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 2px solid #ffffff;
            font-size: 1.25rem;
          ">
            🚌
          </div>
          <div style="
            position: absolute;
            bottom: -18px;
            background: #0B3D91;
            color: #ffffff;
            font-size: 0.7rem;
            font-weight: 800;
            padding: 1px 6px;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">
            Bus ${busNum}
          </div>
        </div>
      `;

      const customIcon = window.L.divIcon({
        className: 'cbts-live-bus-icon',
        html: markerHtml,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      if (!markerRef.current) {
        markerRef.current = window.L.marker([currentLoc.latitude, currentLoc.longitude], {
          icon: customIcon,
        })
          .bindPopup(`<b>Bus ${busNum}</b><br>Speed: ${currentLoc.speed || 0} km/h<br>Source: ${isHardware ? 'Real GPS Hardware' : 'Simulation Demo'}`)
          .addTo(map);
      } else {
        markerRef.current.setLatLng([currentLoc.latitude, currentLoc.longitude]);
        markerRef.current.setIcon(customIcon);
      }

      // Center map on initial load ONLY. Do NOT auto-pan on subsequent GPS polling ticks!
      if (!hasInitialCenteredRef.current) {
        map.setView([currentLoc.latitude, currentLoc.longitude], 14);
        hasInitialCenteredRef.current = true;
      }
    }
  }, [trackingData, busDetails, initialBusNumber]);

  // Recenter map on currently tracked bus
  const handleRecenter = () => {
    if (!mapInstanceRef.current || !trackingData?.currentLocation) return;
    const { latitude, longitude } = trackingData.currentLocation;
    mapInstanceRef.current.panTo([latitude, longitude], { animate: true, duration: 0.6 });
  };

  // View full route waypoints
  const handleFitRoute = () => {
    if (!mapInstanceRef.current) return;
    const waypoints = trackingData?.routeWaypoints || [];
    if (waypoints.length > 0 && window.L) {
      const bounds = window.L.latLngBounds(waypoints.map((w) => [w.latitude, w.longitude]));
      if (trackingData?.currentLocation?.latitude && trackingData?.currentLocation?.longitude) {
        bounds.extend([trackingData.currentLocation.latitude, trackingData.currentLocation.longitude]);
      }
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (trackingData?.currentLocation?.latitude) {
      mapInstanceRef.current.setView([trackingData.currentLocation.latitude, trackingData.currentLocation.longitude], 14);
    }
  };

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Admin Control: Trigger Next Simulation Step
  const handleSimulateStep = async () => {
    try {
      setActionLoading(true);
      await axios.post('http://localhost:5000/api/bus/tracking/simulate-step', { busId });
      await fetchLiveTracking();
    } catch (err) {
      console.error('Error stepping simulation:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Control: Toggle Automated Simulation Loop
  const handleToggleSimulation = async () => {
    try {
      setActionLoading(true);
      const nextState = !simulating;
      await axios.post('http://localhost:5000/api/bus/tracking/toggle-simulation', {
        busId,
        enable: nextState,
        intervalSeconds: 4,
      });
      setSimulating(nextState);
      await fetchLiveTracking();
    } catch (err) {
      console.error('Error toggling simulation:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Format timestamp helper
  const formatTime = (ts) => {
    if (!ts) return 'Waiting for signal...';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 'Recently' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const isHardware = trackingData?.source === 'hardware';
  const currentLoc = trackingData?.currentLocation;

  return (
    <div className="cbts-live-tracking-card" style={{ background: '#ffffff', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(11, 61, 145, 0.12)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
      {/* Top Banner & Status Header */}
      <div style={{ padding: '1rem 1.4rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🛰️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
              Live Bus Tracking – Bus {busDetails?.busNumber || initialBusNumber}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dark-muted)' }}>
              Route: {busDetails?.route || 'Campus Route'} • Driver: {busDetails?.driverName || 'Assigned'} ({busDetails?.driverPhone || ''})
            </p>
          </div>
        </div>

        {/* Source Badge (CRITICAL: REAL VS DEMO CLEAR DIFFERENTIATION) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {isHardware ? (
            <span
              style={{
                background: '#ECFDF5',
                color: '#065F46',
                border: '1px solid #10B981',
                padding: '4px 10px',
                borderRadius: '50px',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
              REAL HARDWARE GPS
            </span>
          ) : (
            <span
              style={{
                background: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #F59E0B',
                padding: '4px 10px',
                borderRadius: '50px',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Physical GPS hardware (ESP32) is not yet connected. Displaying simulated development route coordinates."
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706', display: 'inline-block' }}></span>
              DEMO / SIMULATED
            </span>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                color: 'var(--text-dark-muted)',
                padding: '2px 6px',
              }}
              title="Close Map"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error Notice if any */}
      {error && (
        <div style={{ padding: '0.6rem 1rem', background: '#FEF2F2', color: '#991B1B', fontSize: '0.85rem', borderBottom: '1px solid #FCA5A5' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Demo Notice Disclaimer (Transparent communication required by user) */}
      {!isHardware && (
        <div style={{ padding: '0.45rem 1.4rem', background: 'rgba(245, 158, 11, 0.08)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.78rem', color: '#B45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>ℹ️</span>
          <span>
            <strong>Software Preparation Mode:</strong> Hardware components (ESP32 + NEO-6M GPS) are not yet connected. Coordinates are moving along predefined route waypoints for testing.
          </span>
        </div>
      )}

      {/* Interactive Map Container with Floating Quick Action Controls */}
      <div
        style={{
          width: '100%',
          height: height,
          background: '#E2E8F0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            inset: 0,
            zIndex: 1,
          }}
        />

        {/* Floating Quick Action Controls (Recenter + Route View) */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 500,
            display: 'flex',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            padding: '6px 8px',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            border: '1px solid rgba(11, 61, 145, 0.15)',
          }}
        >
          <button
            type="button"
            onClick={handleRecenter}
            title="Center map on live bus location"
            style={{
              background: '#0B3D91',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(11, 61, 145, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📍</span>
            <span>Recenter Bus</span>
          </button>

          <button
            type="button"
            onClick={handleFitRoute}
            title="Fit view to show full route waypoints"
            style={{
              background: '#ffffff',
              color: 'var(--primary-navy)',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🛣️</span>
            <span>View Full Route</span>
          </button>
        </div>

        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <span style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>Loading live coordinates...</span>
          </div>
        )}
      </div>

      {/* Telemetry HUD Bar (7 Real-Time Telemetry Parameters) */}
      <div style={{ padding: '0.9rem 1.4rem', background: '#ffffff', borderTop: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>🚌 Bus Number</span>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
            Bus {busDetails?.busNumber || initialBusNumber || '–'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>📍 Current Location</span>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-dark-primary)' }}>
            {currentLoc?.latitude ? `${currentLoc.latitude.toFixed(4)}, ${currentLoc.longitude.toFixed(4)}` : 'N/A'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>🚦 Tracking Status</span>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: trackingData?.status === 'online' ? '#059669' : (simulating || trackingData?.status === 'simulating') ? '#D97706' : '#9CA3AF' }}>
            {trackingData?.status === 'online' ? 'Online' : (simulating || trackingData?.status === 'simulating') ? 'Simulating' : 'Offline / Idle'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>⏱ Last Updated</span>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
            {formatTime(trackingData?.lastUpdated || currentLoc?.timestamp)}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>🚗 Speed</span>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
            {currentLoc?.speed !== undefined ? `${currentLoc.speed} km/h` : '0 km/h'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>🧭 Heading</span>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
            {currentLoc?.heading !== undefined ? `${currentLoc.heading}°` : '0°'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dark-muted)', fontWeight: 700, textTransform: 'uppercase' }}>🎯 GPS Accuracy</span>
          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isHardware ? '#059669' : '#D97706' }}>
            ±{currentLoc?.accuracy ? currentLoc.accuracy.toFixed(1) : (isHardware ? '2.5' : '4.0')} m
          </div>
        </div>
      </div>

      {/* Optional Admin Simulation Controls (Shown on Admin Tracking Page) */}
      {showControls && (
        <div style={{ padding: '0.8rem 1.4rem', background: '#F1F5F9', borderTop: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
              🛠️ Demo Testing Controls:
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dark-muted)' }}>
              (Advances bus along route to test map response)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={handleSimulateStep}
              disabled={actionLoading}
              style={{
                background: '#ffffff',
                border: '1px solid #CBD5E1',
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: 'var(--primary-navy)',
              }}
            >
              ↺ Step Next Waypoint
            </button>

            <button
              type="button"
              onClick={handleToggleSimulation}
              disabled={actionLoading}
              style={{
                background: simulating ? '#EF4444' : '#10B981',
                border: 'none',
                color: '#ffffff',
                padding: '0.4rem 1rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {simulating ? '⏸ Pause Simulation' : '▶ Start Live Simulation'}
            </button>
          </div>
        </div>
      )}

      {/* CSS Pulse Animation */}
      <style>{`
        @keyframes cbtsPulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LiveBusMap;
