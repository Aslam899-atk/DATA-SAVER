import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default marker icons for Vite/webpack
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface IndiaGameMapProps {
  playerPos: { lat: number; lng: number };
  onMapClick: (lat: number, lng: number) => void;
  onEnter3D: () => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvent('click', (e) => {
    onMapClick(e.latlng.lat, e.latlng.lng);
  });
  return null;
}

export const IndiaGameMap: React.FC<IndiaGameMapProps> = ({ playerPos, onMapClick, onEnter3D }) => {
  return (
    <div className="relative w-full h-full" style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={[playerPos.lat || 0, playerPos.lng || 0]}
        zoom={16}
        className="w-full h-full"
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <style>
          {`
            .leaflet-layer,
            .leaflet-control-zoom-in,
            .leaflet-control-zoom-out,
            .leaflet-control-attribution {
              filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
            }
          `}
        </style>
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution="&copy; OpenStreetMap contributors"
        />
        <MapClickHandler onMapClick={onMapClick} />
        <Marker position={[playerPos.lat, playerPos.lng]} />
      </MapContainer>

      <button
        onClick={onEnter3D}
        className="absolute top-4 left-4 px-4 py-2 bg-cyan-800 text-cyan-200 rounded-md hover:bg-cyan-700 transition"
      >
        🚗 Enter 3D City
      </button>
    </div>
  );
};
