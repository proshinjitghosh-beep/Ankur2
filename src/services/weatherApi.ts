import type {
  HistoricalWeatherPayload,
  LiveWeatherForecastPayload,
} from '../types/agri';

export async function fetchForecastByCoordinates(params: {
  latitude: number;
  longitude: number;
  days?: number;
  signal?: AbortSignal;
}): Promise<LiveWeatherForecastPayload> {
  const query = new URLSearchParams({
    lat: String(params.latitude),
    lon: String(params.longitude),
    days: String(params.days ?? 14),
  });

  const response = await fetch(`/api/weather/forecast?${query.toString()}`, {
    signal: params.signal,
    headers: { Accept: 'application/json' },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : `Forecast request failed (${response.status})`
    );
  }

  return body as LiveWeatherForecastPayload;
}

export async function fetchHistoricalByCoordinates(params: {
  latitude: number;
  longitude: number;
  startDate?: string;
  endDate?: string;
  signal?: AbortSignal;
}): Promise<HistoricalWeatherPayload> {
  const query = new URLSearchParams({
    lat: String(params.latitude),
    lon: String(params.longitude),
  });
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);

  const response = await fetch(`/api/weather/historical?${query.toString()}`, {
    signal: params.signal,
    headers: { Accept: 'application/json' },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : `Historical weather request failed (${response.status})`
    );
  }

  return body as HistoricalWeatherPayload;
}
