import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import 'source-map-support/register';
import { AssertUtil } from '../util/assertUtil';
import { BinanceUtil } from '../util/binanceUtil';

const binance = new BinanceUtil();
const assert = new AssertUtil();

/**
 * 所有する全シンボルの「利益率」を返す。
 */
export const getProfitRatioHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // 現在保有している通貨リストを取得
  const balnces = await binance.fetchBalances(true);

  // 各通貨の平均購入価額を算出する
  const balanceWithAveBuyPrice = await binance.calAvePriceByBalance(balnces);

  // 現在価格から利益率を算出する
  const balancesWithProfitRatio = await binance.calProfitRatio(balanceWithAveBuyPrice);
  balancesWithProfitRatio.filter(assert.filterRejected).forEach(y => {
    console.debug(`rejected reason: ${y.reason}`); // 一部通貨でErrorがthrowされた場合はここで吸収する(他の通貨の処理に影響を与えないようにするため)
  });

  // 結果をまとめる
  const result = balancesWithProfitRatio.filter(assert.filterFullfilled).map(x => {
    const asset = x.value.balance.asset;
    return {
      balance: x.value.balance,
      aveBuyPrice: balanceWithAveBuyPrice.find(y => y.balance.asset === asset)?.aveBuyPrice,
      nowSymbolPrice: x.value.nowSymbolPrice,
      profitRatio: x.value.profitRatio,
    };
  });

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
