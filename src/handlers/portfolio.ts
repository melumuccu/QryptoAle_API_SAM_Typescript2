import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import "source-map-support/register";

/**
 * 所有する全シンボルの「利益率」を返す。
 */
export const getProfitRatioHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // 現在保有している通貨リストを取得

  // 各通貨の平均購入価額を算出する

  // 現在価格から利益率を算出する

  return {
    statusCode: 200,
    body: JSON.stringify({
      symbol: { aveBuyPrice: 111, nowSymbolPrice: 222, profitRatio: 1.3 },
    }),
  };
};
