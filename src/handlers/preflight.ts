import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import 'source-map-support/register';

/**
 * OPTION(preflight)用
 */
export const preflightHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.debug('event', event);
  console.debug('process', process);

  const originWhiteList = process.env.ORIGINWHITELIST;
  const origin = event.headers['origin'];

  const responseHeaders = {
    'Access-Control-Allow-Origin': '',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  };

  if (!originWhiteList) {
    // Origin環境変数の取得失敗の場合
    console.error('Cannot get env[ORIGINWHITELIST]');
    console.error('event.headers: ', event.headers);
    return {
      headers: responseHeaders,
      statusCode: 403,
      body: JSON.stringify({
        message: 'Missing white list of origin!',
      }),
    };
  }

  if (!origin) {
    // リクエストヘッダーにoriginが含まれていない場合
    console.error('headers.origin has not passed.');
    console.error('event.headers: ', event.headers);
    return {
      headers: responseHeaders,
      statusCode: 403,
      body: JSON.stringify({
        message: 'Missing passed origin!',
      }),
    };
  }

  if (!originWhiteList.split(',').includes(origin)) {
    // ホワイトリストに渡されたoriginが含まれていない場合
    console.error('Origin whitelist not include passed origin.');
    console.error('originWhiteList.split(', '): ', originWhiteList.split(','));
    console.error('origin: ', origin);
    return {
      headers: responseHeaders,
      statusCode: 403,
      body: JSON.stringify({
        message: 'Not allowed origin!',
      }),
    };
  }

  // 全チェックをパスした場合
  responseHeaders['Access-Control-Allow-Origin'] = origin;
  console.debug('Origin check is passed!');
  console.debug('responseHeaders:', responseHeaders);
  return {
    headers: responseHeaders,
    statusCode: 200,
    body: JSON.stringify({
      message: 'OK',
    }),
  };
};
