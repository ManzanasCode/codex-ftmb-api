import { RequestHandler } from 'express';
import { appInfoService } from '../services/app-info.service';
import { AppInfoResponse } from '../types/app';

export const appInfoController: RequestHandler<unknown, AppInfoResponse> = (_req, res) => {
  const info = appInfoService.getInfo();
  res.status(200).json(info);
};
