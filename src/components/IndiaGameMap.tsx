import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface IndiaGameMapProps {
  playerPos: { lat: number; lng: number };
  onMapClick: (lat: number, lng: number) => void;
  onEnter3D: () => void;
}

// Component to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvent('click', (e) => {
    onMapClick(e.latlng.lat, e.latlng.lng);
  });
  return null;
}

export const IndiaGameMap: React.FC<IndiaGameMapProps> = ({ playerPos, onMapClick, onEnter3D }) => {
  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[playerPos.lat || 0, playerPos.lng || 0]}
        zoom={16}
        className="w-full h-full"
        scrollWheelZoom={true}
        zoomControl={false}
      >
        {/* Dark base map */}
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapClickHandler onMapClick={onMapClick} />
        <Marker position={[playerPos.lat, playerPos.lng]} />
      </MapContainer>

      {/* Fixed button to enter 3D */}
      <button
        onClick={onEnter3D}
        className="absolute top-4 left-4 px-4 py-2 bg-cyan-800 text-cyan-200 rounded-md hover:bg-cyan-700 transition"
      >
        🚗 Enter 3D City
      </button>
    </div>
  );
};
