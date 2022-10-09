import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import 'source-map-support/register';
import { CryptoExchangesConsts } from '../../src/consts/cryptoExchangesConsts';
import { MyBinance } from '../../src/domain/cryptoExchanges/binance';

/**
 * A simple example includes a HTTP get method.
 */
export const exampleHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const api_key = process.env.BINANCE_API_KEY;
  const api_secret = process.env.BINANCE_API_SECRET;

  const balance = await (async () => {
    if (process.env.BINANCE_API_KEY === undefined || process.env.BINANCE_API_SECRET === undefined) {
      console.error('(BINANCE_API_KEY || BINANCE_API_SECRET) === undefined');
      return null;
    }
    const binance = new MyBinance(
      CryptoExchangesConsts.name.BINANCE,
      process.env.BINANCE_API_KEY,
      process.env.BINANCE_API_SECRET
    );
    return await binance.fetchBalances();
  })();

  console.log({ balance });

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, timeout',
    },
    body: JSON.stringify({ balance }),
  };
};
