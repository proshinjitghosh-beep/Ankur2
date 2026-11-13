import { Router, type Request, type Response } from 'express';
import type { AnyCropInputId } from '../../src/types/agri.ts';
import { OpenMeteoServiceError } from '../services/openMeteoService.ts';
import { listAllCropProfiles } from '../services/risk/cropProfiles.ts';
import {
  runCropRiskAssessment,
  runCropRiskForecast,
  runDistrictMultiCropRisk,
} from '../services/risk/recommendationService.ts';

export const riskRouter = Router();

function handleRiskRouteError(res: Response, err: unknown) {
  if (err instanceof OpenMeteoServiceError) {
    const code =
      err.statusCode === 400
        ? 'VALIDATION_ERROR'
        : err.statusCode === 504
        ? 'UPSTREAM_TIMEOUT'
        : 'UPSTREAM_WEATHER_ERROR';
    res.status(err.statusCode).json({
      error: err.message,
      code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Unexpected risk engine error';
  res.status(500).json({
    error: message,
    code: 'RISK_ENGINE_INTERNAL_ERROR',
  });
}

riskRouter.get('/crops', (_req: Request, res: Response) => {
  const crops = listAllCropProfiles().map((c) => ({
    id: c.id,
    name: c.name,
    localName: c.localName,
    phenologyTrack: c.phenologyTrack,
    typicalCycleDays: c.typicalCycleDays,
    optimalTempRangeC: c.optimalTempRangeC,
    defaultPlantingWindowLabel: c.defaultPlantingWindowLabel,
    varieties: c.varieties,
    vegetableSubtypes: c.vegetableSubtypes ?? null,
    unspecifiedStageWeights: c.unspecifiedStageWeights,
    growthStages: c.growthStages.map((s) => ({
      id: s.id,
      label: s.label,
      minDay: s.minDay,
      maxDay: s.maxDay,
      weights: s.weights,
    })),
  }));

  res.json({
    count: crops.length,
    crops,
  });
});

riskRouter.get('/assess', async (req: Request, res: Response) => {
  try {
    const cropId = req.query.cropId ?? req.query.crop;
    if (!req.query.districtId && (req.query.lat ?? req.query.latitude) === undefined) {
      res.status(400).json({
        error: 'Provide either districtId or lat and lon query parameters.',
        code: 'MISSING_LOCATION',
      });
      return;
    }

    const { assessment } = await runCropRiskAssessment({
      districtId: req.query.districtId,
      lat: req.query.lat ?? req.query.latitude,
      lon: req.query.lon ?? req.query.longitude,
      cropId,
      varietyId: req.query.varietyId ?? req.query.variety,
      vegetableSubtype: req.query.vegetableSubtype,
      plantingDate: req.query.plantingDate,
      daysAfterPlanting: req.query.daysAfterPlanting,
      growthStageId: req.query.growthStageId,
      window: req.query.window,
      includeHistorical: req.query.includeHistorical,
    });

    res.json(assessment);
  } catch (err) {
    handleRiskRouteError(res, err);
  }
});

riskRouter.get('/forecast', async (req: Request, res: Response) => {
  try {
    const cropId = req.query.cropId ?? req.query.crop;
    if (!req.query.districtId && (req.query.lat ?? req.query.latitude) === undefined) {
      res.status(400).json({
        error: 'Provide either districtId or lat and lon query parameters.',
        code: 'MISSING_LOCATION',
      });
      return;
    }

    const forecast = await runCropRiskForecast({
      districtId: req.query.districtId,
      lat: req.query.lat ?? req.query.latitude,
      lon: req.query.lon ?? req.query.longitude,
      cropId,
      varietyId: req.query.varietyId ?? req.query.variety,
      vegetableSubtype: req.query.vegetableSubtype,
      plantingDate: req.query.plantingDate,
      daysAfterPlanting: req.query.daysAfterPlanting,
      growthStageId: req.query.growthStageId,
      window: req.query.window,
      days: req.query.days,
      includeHistorical: req.query.includeHistorical,
    });

    res.json(forecast);
  } catch (err) {
    handleRiskRouteError(res, err);
  }
});

riskRouter.get('/district/:districtId', async (req: Request, res: Response) => {
  try {
    const districtId = Array.isArray(req.params.districtId)
      ? req.params.districtId[0]
      : req.params.districtId;

    let cropIds: AnyCropInputId[] | undefined;
    if (typeof req.query.cropIds === 'string' && req.query.cropIds.trim()) {
      cropIds = req.query.cropIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as AnyCropInputId[];
    }

    const payload = await runDistrictMultiCropRisk({
      districtId,
      cropIds,
      window: req.query.window,
      includeHistorical: req.query.includeHistorical,
    });

    res.json(payload);
  } catch (err) {
    handleRiskRouteError(res, err);
  }
});
