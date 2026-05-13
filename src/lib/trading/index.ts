import { DemoTradingService } from "./demo";
import { LiveTradingService } from "./live";
import type { ITradingService } from "./interface";

export const tradingService: ITradingService =
  process.env.TRADING_MODE === "live"
    ? new LiveTradingService()
    : new DemoTradingService();

export type { ITradingService };
export * from "./types";
