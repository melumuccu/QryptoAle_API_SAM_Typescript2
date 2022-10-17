import { APIGatewayProxyEvent } from 'aws-lambda';
import * as dotenv from 'dotenv';
import { ProfitRatioBusiness } from './business';

dotenv.config();

describe('CryptoExchangeUtil', () => {
  let profitRatioBusiness: ProfitRatioBusiness;

  beforeEach(() => {
    profitRatioBusiness = new ProfitRatioBusiness();
  });

  test('should be created', () => {
    expect(profitRatioBusiness).toBeTruthy();
  });

  test('#validateRequest クエリパラメータのバリデーション処理(正常なペイロード)', () => {
    const result = profitRatioBusiness.validateRequest(eventValid1);
    expect(result).toHaveProperty('queryStringParameters.baseFiat', 'USDT');
  });

  test('#validateRequest クエリパラメータのバリデーション処理(異常なペイロード: クエリパラメータが未定義)', () => {
    const result = profitRatioBusiness.validateRequest(eventInvalid1);
    expect(result).toHaveProperty('error.messages', ['No query parameters.']);
  });

  test('#validateRequest クエリパラメータのバリデーション処理(異常なペイロード: baseFiatが未定義)', () => {
    const result = profitRatioBusiness.validateRequest(eventInvalid2);
    expect(result).toHaveProperty('error.messages', ["Query parameter 'baseFiat' is required."]);
  });

  test('#validateRequest クエリパラメータのバリデーション処理(異常なペイロード: baseFiatが定義リストに無い値で渡された)', () => {
    const result = profitRatioBusiness.validateRequest(eventInvalid3);
    expect(result).toHaveProperty('error.messages', [
      "Query parameter 'baseFiat' must be included by listed values. passed baseFiat: XXXX",
    ]);
  });
});

/**
 * テスト用
 */
const objSample: any = { sample: 'xxx' };

/**
 * テスト用
 */
const otherEventParams = {
  // 以下はテスト対象外
  body: null,
  headers: {
    xxx: 'xxx',
  },
  multiValueHeaders: {
    xxx: ['xxx'],
  },
  httpMethod: '',
  isBase64Encoded: false,
  path: '',
  pathParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: objSample,
  resource: '',
};

/**
 * 正常ペイロード
 */
const eventValid1: APIGatewayProxyEvent = Object.assign(
  {
    queryStringParameters: {
      baseFiat: 'USDT',
    },
  },
  otherEventParams
);

/**
 * 異常ペイロード
 * クエリパラメータの必須エラー
 */
const eventInvalid1: APIGatewayProxyEvent = Object.assign(
  {
    queryStringParameters: null,
  },
  otherEventParams
);

/**
 * 異常ペイロード
 * baseFiatの必須エラー
 */
const eventInvalid2: APIGatewayProxyEvent = Object.assign(
  {
    queryStringParameters: {
      baseFiat: undefined,
    },
  },
  otherEventParams
);

/**
 * 異常ペイロード
 * baseFiatとして渡された値が定義されたリストに無いためエラー
 */
const eventInvalid3: APIGatewayProxyEvent = Object.assign(
  {
    queryStringParameters: {
      baseFiat: 'XXXX',
    },
  },
  otherEventParams
);
