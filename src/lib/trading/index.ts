import { DemoTradingService } from "./demo";
import { LiveTradingService } from "./live";
import type { ITradingService } from "./interface";

let _service: ITradingService | null = null;

export function getTradingService(): ITradingService {
  if (!_service) {
    _service = process.env.TRADING_MODE === "live"
      ? new LiveTradingService()
      : new DemoTradingService();
  }
  return _service;
}

export type { ITradingService };
export * from "./types";
