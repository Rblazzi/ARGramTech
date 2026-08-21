import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ícone via divIcon (CSS puro) em vez do ícone padrão do Leaflet — evita
// o problema clássico de bundler onde os PNGs padrão do Leaflet não são
// resolvidos certo pelo Vite, sem precisar importar/copiar nenhum asset.
const pinIcon = divIcon({
  className: '',
  html: '<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:var(--brand, #ff7a00);border:2px solid white;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

interface LocationMapProps {
  latitude: number;
  longitude: number;
  interactive?: boolean;
  onChange?: (lat: number, lng: number) => void;
  height?: number;
}

function ClickHandler({ onChange }: { onChange?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Mapa OpenStreetMap reutilizável. Em modo interativo (endereço do
// cliente), clicar no mapa ou arrastar o pino ajusta a posição exata —
// em modo não-interativo (visão do entregador), é só uma prévia fixa.
export function LocationMap({ latitude, longitude, interactive = false, onChange, height = 200 }: LocationMapProps) {
  return (
    <div style={{ height }} className="overflow-hidden rounded-lg border border-[var(--border)]">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        dragging={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        zoomControl={interactive}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker
          position={[latitude, longitude]}
          icon={pinIcon}
          draggable={interactive}
          eventHandlers={
            interactive
              ? {
                  dragend: (e) => {
                    const marker = e.target;
                    const { lat, lng } = marker.getLatLng();
                    onChange?.(lat, lng);
                  },
                }
              : undefined
          }
        />
        {interactive && <ClickHandler onChange={onChange} />}
      </MapContainer>
    </div>
  );
}
