import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import 'source-map-support/register';
import { ProfitRatioBusiness } from './business';

const business = new ProfitRatioBusiness();

/**
 * 所有する全シンボルの「利益率」を返す。
 */
export const getProfitRatioHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, timeout',
  };

  // リクエストパラメータのチェック
  const validated = business.validateRequest(event);
  if ('error' in validated) {
    // バリデーションエラーの場合
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(validated),
    };
  } else {
    const result = await business.getProfitRatio(validated.queryStringParameters.baseFiat);
    if ('error' in result) {
      // 実行時エラーの場合
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify(result),
      };
    }
    // 正常終了
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  }
};
