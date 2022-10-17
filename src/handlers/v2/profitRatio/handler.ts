import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import 'source-map-support/register';


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

  return {
    statusCode: 200,
    headers,
    body: 'xxxxxxxxxxx',
  };
};
