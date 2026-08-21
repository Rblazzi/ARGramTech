import { BadGatewayException, Injectable } from '@nestjs/common';

// Proxy fino pro Nominatim (geocodificação do OpenStreetMap, gratuita e
// sem chave de API). Fica no backend, não é chamado direto do navegador,
// porque a política de uso do Nominatim exige um User-Agent identificando
// a aplicação — algo que o navegador não deixa um script sobrescrever.
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'ArgramTech/1.0 (contato: inteligencia2@gehfer.com.br)';

export interface GeocodingResult {
  displayName: string;
  latitude: number;
  longitude: number;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}

interface NominatimAddress {
  road?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  postcode?: string;
  'ISO3166-2-lvl4'?: string;
}

interface NominatimPlace {
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

// O Nominatim devolve o nome completo do estado (ex.: "São Paulo"), mas o
// resto do sistema guarda a sigla (ex.: "SP") — o jeito mais confiável de
// extrair isso é o campo ISO3166-2-lvl4 ("BR-SP"), que sempre vem com a
// sigla depois do hífen.
function extractStateCode(address?: NominatimAddress): string | null {
  const iso = address?.['ISO3166-2-lvl4'];
  if (iso?.startsWith('BR-')) return iso.slice(3);
  return address?.state ?? null;
}

function toResult(place: NominatimPlace): GeocodingResult {
  const address = place.address;
  return {
    displayName: place.display_name,
    latitude: Number(place.lat),
    longitude: Number(place.lon),
    street: address?.road ?? null,
    number: address?.house_number ?? null,
    neighborhood: address?.suburb ?? address?.neighbourhood ?? address?.city_district ?? null,
    city: address?.city ?? address?.town ?? address?.village ?? null,
    state: extractStateCode(address),
    zipCode: address?.postcode ?? null,
  };
}

@Injectable()
export class GeocodingService {
  async search(query: string): Promise<GeocodingResult[]> {
    const url = new URL(`${NOMINATIM_BASE_URL}/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', 'br');
    url.searchParams.set('limit', '5');

    const places = await this.fetchJson<NominatimPlace[]>(url);
    return places.map(toResult);
  }

  async reverse(latitude: number, longitude: number): Promise<GeocodingResult> {
    const url = new URL(`${NOMINATIM_BASE_URL}/reverse`);
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');

    const place = await this.fetchJson<NominatimPlace>(url);
    return toResult(place);
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!response.ok) {
      throw new BadGatewayException('Não foi possível consultar o serviço de mapas no momento');
    }
    return response.json() as Promise<T>;
  }
}
