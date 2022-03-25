import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import "source-map-support/register";
import { BinanceUtil } from "../util/binanceUtil";
const Binance = require("node-binance-api");

const binance = new Binance().options({
  APIKEY: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  APISECRET: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
});
const binanceUtil = new BinanceUtil();

/**
 * お試しのハンドラ(getCoinBalanceを参考にした)
 */
export const testHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const res = await binanceUtil.getCoinBalance(binance);

  return {
    statusCode: 200,
    body: res,
  };
};
