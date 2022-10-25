import { APIGatewayProxyEvent } from 'aws-lambda';
import { Account, TradingType } from 'binance-api-node';
import * as dotenv from 'dotenv';
import { CryptoExchangesConsts } from '../../../consts/cryptoExchangesConsts';
import { MyBinance } from '../../../domain/cryptoExchanges/binance';
import { ProfitRatioBusiness } from './business';

dotenv.config();

describe('CryptoExchangeUtil', () => {
  let profitRatioBusiness: ProfitRatioBusiness;
  let binance: MyBinance;

  beforeEach(() => {
    profitRatioBusiness = new ProfitRatioBusiness();

    if (process.env.BINANCE_API_KEY === undefined) {
      console.error('API_KEY === undefined');
      return;
    }
    if (process.env.BINANCE_API_SECRET === undefined) {
      console.error('API_SECRET === undefined');
      return;
    }

    binance = new MyBinance(
      CryptoExchangesConsts.name.BINANCE,
      process.env.BINANCE_API_KEY,
      process.env.BINANCE_API_SECRET
    );
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

  test('#fetchBalances "保有数量 > 0"の全assetのBalanceを取得できているか', async () => {
    const spy = jest.spyOn(binance.sdk, 'accountInfo').mockImplementation(() => {
      return new Promise(resolve => {
        resolve(account1);
      });
    });

    const result = await profitRatioBusiness.fetchBalances([binance]);
    expect(result).toStrictEqual({
      BINANCE: {
        USDT: {
          free: '50',
          locked: '500',
        },
        XRP: {
          free: '0.0001',
          locked: '0.0001',
        },
      },
    });
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

/**
 * Binance#accountInfo の spy
 */
const account1: Account = {
  balances: [
    {
      asset: 'USDT',
      free: '50',
      locked: '500',
    },
    {
      asset: 'BTC',
      free: '0.0000000000',
      locked: '0',
    },
    {
      asset: 'XRP',
      free: '0.0001',
      locked: '0.0001',
    },
  ],
  accountType: TradingType.MARGIN,
  buyerCommission: 0,
  canDeposit: false,
  canTrade: false,
  canWithdraw: false,
  makerCommission: 0,
  permissions: [],
  sellerCommission: 0,
  takerCommission: 0,
  updateTime: 0,
};
