import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import "source-map-support/register";
import { BinanceUtil } from "../util/binanceUtil";
const Binance = require("node-binance-api");

const binance = new Binance().options({
  APIKEY: process.env.APIKEY,
  APISECRET: process.env.APISECRET,
});
const binanceUtil = new BinanceUtil();

/**
 * お試しのハンドラ(getCoinBalanceを参考にした)
 */
export const testHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(`process.env.APIKEY: ${process.env.APIKEY}`);

  const res = await binanceUtil.getCoinBalance(binance);

  return {
    statusCode: 200,
    body: res,
  };
};
