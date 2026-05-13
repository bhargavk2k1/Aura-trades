import type { ITradingService } from "./interface";

let _service: ITradingService | null = null;

export function getTradingService(): ITradingService {
  if (!_service) {
    const { DemoTradingService } = require("./demo");
    const { LiveTradingService } = require("./live");
    _service = process.env.TRADING_MODE === "live"
      ? new LiveTradingService()
      : new DemoTradingService();
  }
  return _service;
}

export type { ITradingService };
export * from "./types";
