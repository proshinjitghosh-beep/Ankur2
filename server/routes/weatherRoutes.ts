import { Router, type Request, type Response } from 'express';
import {
  fetchOpenMeteoForecast,
  fetchOpenMeteoHistorical,
  OpenMeteoServiceError,
  validateCoordinates,
  validateForecastDays,
  validateHistoricalRange,
} from '../services/openMeteoService.ts';

export const weatherRouter = Router();

function handleRouteError(res: Response, err: unknown) {
  if (err instanceof OpenMeteoServiceError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Unexpected weather service error';
  res.status(500).json({ error: message });
}

weatherRouter.get('/forecast', async (req: Request, res: Response) => {
  try {
    const rawLat = req.query.lat ?? req.query.latitude;
    const rawLon = req.query.lon ?? req.query.longitude;
    const { latitude, longitude } = validateCoordinates(rawLat, rawLon);
    const forecastDays = validateForecastDays(req.query.days);
    const timezone =
      typeof req.query.timezone === 'string' && req.query.timezone.trim()
        ? req.query.timezone.trim()
        : undefined;

    const forecast = await fetchOpenMeteoForecast({
      latitude,
      longitude,
      forecastDays,
      timezone,
    });

    res.json(forecast);
  } catch (err) {
    handleRouteError(res, err);
  }
});

weatherRouter.get('/historical', async (req: Request, res: Response) => {
  try {
    const rawLat = req.query.lat ?? req.query.latitude;
    const rawLon = req.query.lon ?? req.query.longitude;
    const { latitude, longitude } = validateCoordinates(rawLat, rawLon);
    const { startDate, endDate } = validateHistoricalRange(
      req.query.startDate,
      req.query.endDate
    );
    const timezone =
      typeof req.query.timezone === 'string' && req.query.timezone.trim()
        ? req.query.timezone.trim()
        : undefined;

    const historical = await fetchOpenMeteoHistorical({
      latitude,
      longitude,
      startDate,
      endDate,
      timezone,
    });

    res.json(historical);
  } catch (err) {
    handleRouteError(res, err);
  }
});
