import { APIGatewayProxyEvent } from 'aws-lambda';
import { Account, MyTrade, TradingType } from 'binance-api-node';
import * as dotenv from 'dotenv';
import { CryptoExchangesConsts } from '../../../consts/cryptoExchangesConsts';
import { MyBinance } from '../../../domain/cryptoExchanges/binance';
import { CryptoExchangeUtil } from '../../../util/cryptoExchangeUtil';
import { ProfitRatioBusiness } from './business';

dotenv.config();

describe('CryptoExchangeUtil', () => {
  let profitRatioBusiness: ProfitRatioBusiness;
  let binance: MyBinance;
  let cryptoExchangeUtil: CryptoExchangeUtil;

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

    cryptoExchangeUtil = new CryptoExchangeUtil();
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

  test('#getProfitRatio 期待通りののパラメータを返すか', async () => {
    const spy1 = jest
      .spyOn(cryptoExchangeUtil, 'makeCryptoExchangeInstances')
      .mockImplementation(() => {
        return [binance];
      });

    const spy2 = jest.spyOn(profitRatioBusiness, 'fetchBalances').mockImplementation(() => {
      return new Promise(resolve => {
        resolve(balancesPerExchange5);
      });
    });

    const spy3 = jest.spyOn(profitRatioBusiness, 'fetchAveBuyPrices').mockImplementation(() => {
      return new Promise(resolve => {
        resolve(aveBuyPricesAndBalancesPerExchange5);
      });
    });

    /**
     * 以下を確認するテストとなる
     * ・次の戻り値が期待結果となること
     *   ・ProfitRatioBusiness#fetchProfitRatio の戻り値がresultプロパティの値となっている
     */
    const spy4 = jest.spyOn(profitRatioBusiness, 'fetchProfitRatio').mockImplementation(() => {
      return new Promise(resolve => {
        resolve(profitRatioAndAveBuyPricesAndBalancesPerExchange1);
      });
    });

    const result = await profitRatioBusiness.getProfitRatio('USDT');
    expect(result).toStrictEqual({
      result: profitRatioAndAveBuyPricesAndBalancesPerExchange1,
    });
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

  test('#fetchAveBuyPrices 計算過程でSellの取引を除外して正しく計算しているか', async () => {
    const spy = jest.spyOn(binance.sdk, 'myTrades');

    /**
     * XRPの取引履歴のmock
     *
     * 以下を確認するテストとなる
     * ・isBuyer = false(Sell)の取引が無視される
     * ・isBuyer = trueの取引について
     *   ・次の取引がmockで定義されている
     *     ・取引価格1USDT, 取引数量100
     *     ・取引価格3USDT, 取引数量100
     *   ・上記取引から、平均購入価格は2となる
     */
    spy.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolve(myTrades1);
      });
    });

    /**
     * XRPのみを平均価格算出対象として渡す
     */
    const result = await profitRatioBusiness.fetchAveBuyPrices(
      [binance],
      balancesPerExchange1,
      'USDT'
    );

    expect(result).toStrictEqual({
      BINANCE: {
        XRP: {
          free: '200',
          locked: '0',
          aveBuyPrice: 2,
        },
      },
    });
  });

  test('#fetchAveBuyPrices 算出対象からbaseFiatを除外して正しく計算しているか', async () => {
    const spy = jest.spyOn(binance.sdk, 'myTrades');

    /**
     * XRPの取引履歴のmock
     */
    spy.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolve(myTrades2);
      });
    });

    /**
     * USDT, XRPを平均価格算出対象として渡す
     *
     * 以下を確認するテストとなる
     * ・USDTは今回baseFiatに指定されているので計算結果から除外する
     */
    const result = await profitRatioBusiness.fetchAveBuyPrices(
      [binance],
      balancesPerExchange2,
      'USDT'
    );

    expect(result).toStrictEqual({
      BINANCE: {
        XRP: {
          free: '200',
          locked: '0',
          aveBuyPrice: 2,
        },
      },
    });
  });

  test('#fetchAveBuyPrices 現在の保有数量を超える量のBuy取引があった場合に、最新の取引から順に計算対象として正しく計算しているか(ある取引の取引数量とそれまでの取引数量を加算してちょうど保有数量と一致するパターン)', async () => {
    const spy = jest.spyOn(binance.sdk, 'myTrades');

    /**
     * XRPの取引履歴のmock
     *
     * 以下を確認するテストとなる
     * ・3件のBuy取引がmockされている
     *   ・要素は古い取引から順に渡される(BinanceAPIの仕様)
     *   ・3 -> 2 -> 1の要素順に処理を行う
     *     ・3, 2の取引数量を加算するとちょうど保有数量と一致する
     *       ・そのため1の要素は計算対象ではないと判定される
     */
    spy.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolve(myTrades3);
      });
    });

    /**
     * XRPのみを平均価格算出対象として渡す
     */
    const result = await profitRatioBusiness.fetchAveBuyPrices(
      [binance],
      balancesPerExchange3,
      'USDT'
    );

    expect(result).toStrictEqual({
      BINANCE: {
        XRP: {
          free: '200',
          locked: '0',
          aveBuyPrice: 2,
        },
      },
    });
  });

  test('#fetchAveBuyPrices 現在の保有数量を超える量のBuy取引があった場合に、最新の取引から順に計算対象として正しく計算しているか(ある取引の取引数量の一部とそれまでの取引数量を加算して保有数量と一致するパターン)', async () => {
    const spy = jest.spyOn(binance.sdk, 'myTrades');

    /**
     * XRPの取引履歴のmock
     *
     * 以下を確認するテストとなる
     * ・3件のBuy取引がmockされている
     *   ・要素は古い取引から順に渡される(BinanceAPIの仕様)
     *   ・3 -> 2 -> 1の要素順に処理を行う
     *     ・3の取引数量と2の取引数量の一部を加算するとちょうど保有数量と一致する
     *       ・そのため1の要素は計算対象ではないと判定される
     *       ・3: 取引価格3USDT, 取引数量100
     *         2: 取引価格1USDT, 取引数量500
     *         現在保有しているXRP: 200
     *         → まず3から保有数量100相当分の処理、次に2を100の取引として扱い、残り保有数量100相当分の処理を行う
     */
    spy.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolve(myTrades4);
      });
    });

    /**
     * XRPのみを平均価格算出対象として渡す
     *
     * ・XRP保有量はfree, lockedの合計で200
     */
    const result = await profitRatioBusiness.fetchAveBuyPrices(
      [binance],
      balancesPerExchange4,
      'USDT'
    );

    expect(result).toStrictEqual({
      BINANCE: {
        XRP: {
          free: '200',
          locked: '0',
          aveBuyPrice: 2,
        },
      },
    });
  });

  test('#fetchProfitRatio シンプルな利益率の計算が正しいか', async () => {
    const spy = jest.spyOn(binance.sdk, 'prices');

    /**
     * XRPの現在価格のmock
     *
     * 以下を確認するテストとなる
     * ・現在のXRPUSDT価格は4であるとmockされている
     * ・保有するXRPの平均購入価格は2としている
     * ・つまり利益率は 4/2*100 = 200(%) と算出される
     */
    spy.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolve(symbolPrice1);
      });
    });

    /**
     * XRPのみを利益率算出対象として渡す
     *
     * ・平均購入価格は2
     */
    const result = await profitRatioBusiness.fetchProfitRatio(
      [binance],
      aveBuyPricesAndBalancesPerExchange1,
      'USDT'
    );

    expect(result).toStrictEqual({
      BINANCE: {
        XRP: {
          free: '200',
          locked: '0',
          aveBuyPrice: 2,
          nowSymbolPrice: 4,
          profitRatio: 200,
        },
      },
    });
  });

  test('#fetchProfitRatio 算出対象からbaseFiatを除外して正しく計算しているか', async () => {
    const spy = jest.spyOn(binance.sdk, 'prices');

    /**
     * XRPの現在価格のmock
     */
    spy.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolve(symbolPrice2);
      });
    });

    /**
     * USDT, XRPを利益率算出対象として渡す
     *
     * 以下を確認するテストとなる
     * ・USDTは今回baseFiatに指定されているので計算対象から除外する
     */
    const result = await profitRatioBusiness.fetchProfitRatio(
      [binance],
      aveBuyPricesAndBalancesPerExchange2,
      'USDT'
    );

    expect(result).toStrictEqual({
      BINANCE: {
        XRP: {
          free: '200',
          locked: '0',
          aveBuyPrice: 2,
          nowSymbolPrice: 4,
          profitRatio: 200,
        },
      },
    });
  });

  test('#fetchProfitRatio 利益率を小数第二位で四捨五入できているか(切り捨て)', async () => {
    const spy = jest.spyOn(binance.sdk, 'prices');

    /**
     * XRPの現在価格のmock
     *
     * 以下を確認するテストとなる
     * ・現在のXRPUSDT: 1.3333...32
     * ・XRPの平均購入価格: 3
     * ・利益率は44.44...4(%)
     *   ・小数第二位で四捨五入するので 44.4(%)
     */
    spy.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolve(symbolPrice3);
      });
    });

    /**
     * XRPを利益率算出対象として渡す
     */
    const result = await profitRatioBusiness.fetchProfitRatio(
      [binance],
      aveBuyPricesAndBalancesPerExchange3,
      'USDT'
    );

    expect(result).toStrictEqual({
      BINANCE: {
        XRP: {
          free: '200',
          locked: '0',
          aveBuyPrice: 3,
          nowSymbolPrice: 1.3333332,
          profitRatio: 44.4,
        },
      },
    });
  });

  test('#fetchProfitRatio 利益率を小数第二位で四捨五入できているか(切り上げ)', async () => {
    const spy = jest.spyOn(binance.sdk, 'prices');

    /**
     * XRPの現在価格のmock
     *
     * 以下を確認するテストとなる
     * ・現在のXRPUSDT: 1.111...1
     * ・XRPの平均購入価格: 2
     * ・利益率は55.55...5(%)
     *   ・小数第二位で四捨五入するので 55.6(%)
     */
    spy.mockImplementationOnce(() => {
      return new Promise(resolve => {
        resolve(symbolPrice4);
      });
    });

    /**
     * XRPを利益率算出対象として渡す
     */
    const result = await profitRatioBusiness.fetchProfitRatio(
      [binance],
      aveBuyPricesAndBalancesPerExchange4,
      'USDT'
    );

    expect(result).toStrictEqual({
      BINANCE: {
        XRP: {
          free: '200',
          locked: '0',
          aveBuyPrice: 2,
          nowSymbolPrice: 1.1111111,
          profitRatio: 55.6,
        },
      },
    });
  });
});

//========================================================テスト用定義

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

/**
 * Binance#myTrades の spy
 */
const myTrades1: MyTrade[] = [
  {
    symbol: 'XRPUSDT',
    id: 1,
    orderId: 1,
    orderListId: -1,
    price: '1',
    qty: '100',
    quoteQty: '9999999',
    commission: '0',
    commissionAsset: 'XRP',
    time: 1625387353662,
    isBuyer: true,
    isMaker: false,
    isBestMatch: true,
  },
  {
    symbol: 'XRPUSDT',
    id: 2,
    orderId: 2,
    orderListId: -1,
    price: '3',
    qty: '100',
    quoteQty: '9999999',
    commission: '0',
    commissionAsset: 'XRP',
    time: 1625387353662,
    isBuyer: true,
    isMaker: false,
    isBestMatch: true,
  },
  {
    symbol: 'XRPUSDT',
    id: 3,
    orderId: 3,
    orderListId: -1,
    price: '9999999',
    qty: '9999999',
    quoteQty: '9999999',
    commission: '0',
    commissionAsset: 'USDT',
    time: 1614521279555,
    isBuyer: false,
    isMaker: false,
    isBestMatch: true,
  },
];

/**
 * Binance#myTrades の spy
 */
const myTrades2: MyTrade[] = [
  {
    symbol: 'XRPUSDT',
    id: 1,
    orderId: 1,
    orderListId: -1,
    price: '1',
    qty: '100',
    quoteQty: '9999999',
    commission: '0',
    commissionAsset: 'XRP',
    time: 1625387353662,
    isBuyer: true,
    isMaker: false,
    isBestMatch: true,
  },
  {
    symbol: 'XRPUSDT',
    id: 2,
    orderId: 2,
    orderListId: -1,
    price: '3',
    qty: '100',
    quoteQty: '9999999',
    commission: '0',
    commissionAsset: 'XRP',
    time: 1625387353662,
    isBuyer: true,
    isMaker: false,
    isBestMatch: true,
  },
];

/**
 * Binance#myTrades の spy
 */
const myTrades3: MyTrade[] = [
  {
    symbol: 'XRPUSDT',
    id: 1,
    orderId: 1,
    orderListId: -1,
    price: '9999999',
    qty: '9999999',
    quoteQty: '9999999',
    commission: '0',
    commissionAsset: 'XRP',
    time: 1234567890001,
    isBuyer: true,
    isMaker: false,
    isBestMatch: true,
  },
  {
    symbol: 'XRPUSDT',
    id: 2,
    orderId: 2,
    orderListId: -1,
    price: '1',
    qty: '100',
    quoteQty: '9999999',
    commission: '0',
    commissionAsset: 'XRP',
    time: 1234567890002,
    isBuyer: true,
    isMaker: false,
    isBestMatch: true,
  },
  {
    symbol: 'XRPUSDT',
    id: 3,
    orderId: 3,
    orderListId: -1,
    price: '3',
    qty: '100',
    quoteQty: '9999999',
    commission: '0',
    commissionAsset: 'XRP',
    time: 1234567890003,
    isBuyer: true,
    isMaker: false,
    isBestMatch: true,
  },
];

/**
 * Binance#myTrades の spy
 */
const myTrades4: MyTrade[] = [
  {
    symbol: 'XRPUSDT',
    id: 1,
    orderId: 1,
    orderListId: -1,
    price: '9999999',
    qty: '9999999',
    quoteQty: '9999999',
    commission: '0',
    commissionAsset: 'XRP',
    time: 1234567890001,
    isBuyer: true,
    isMaker: false,
    isBestMatch: true,
  },
  {
    symbol: 'XRPUSDT',
    id: 2,
    orderId: 2,
    orderListId: -1,
    price: '1',
    qty: '500',
    quoteQty: '9999999',
    commission: '0',
    commissionAsset: 'XRP',
    time: 1234567890002,
    isBuyer: true,
    isMaker: false,
    isBestMatch: true,
  },
  {
    symbol: 'XRPUSDT',
    id: 3,
    orderId: 3,
    orderListId: -1,
    price: '3',
    qty: '100',
    quoteQty: '9999999',
    commission: '0',
    commissionAsset: 'XRP',
    time: 1234567890003,
    isBuyer: true,
    isMaker: false,
    isBestMatch: true,
  },
];

/**
 * Binance#prices の spy
 */
const symbolPrice1 = {
  XRPUSDT: '4',
};

/**
 * Binance#prices の spy
 */
const symbolPrice2 = {
  XRPUSDT: '4',
};

/**
 * Binance#prices の spy
 */
const symbolPrice3 = {
  XRPUSDT: '1.3333332',
};

/**
 * Binance#prices の spy
 */
const symbolPrice4 = {
  XRPUSDT: '1.1111111',
};

/**
 * BalancesPerExchange
 */
const balancesPerExchange1 = {
  BINANCE: {
    XRP: {
      free: '200',
      locked: '0',
    },
  },
};

/**
 * BalancesPerExchange
 */
const balancesPerExchange2 = {
  BINANCE: {
    USDT: {
      free: '50',
      locked: '500',
    },
    XRP: {
      free: '200',
      locked: '0',
    },
  },
};

/**
 * BalancesPerExchange
 */
const balancesPerExchange3 = {
  BINANCE: {
    XRP: {
      free: '200',
      locked: '0',
    },
  },
};

/**
 * BalancesPerExchange
 */
const balancesPerExchange4 = {
  BINANCE: {
    XRP: {
      free: '200',
      locked: '0',
    },
  },
};

/**
 * BalancesPerExchange
 */
const balancesPerExchange5 = {
  BINANCE: {
    XRP: {
      free: '200',
      locked: '0',
    },
  },
};

/**
 * AveBuyPricesPerExchange & BalancesPerExchange
 */
const aveBuyPricesAndBalancesPerExchange1 = {
  BINANCE: {
    XRP: {
      free: '200',
      locked: '0',
      aveBuyPrice: 2,
    },
  },
};

/**
 * AveBuyPricesPerExchange & BalancesPerExchange
 */
const aveBuyPricesAndBalancesPerExchange2 = {
  BINANCE: {
    USDT: {
      free: '99999',
      locked: '99999',
      aveBuyPrice: 99999999,
    },
    XRP: {
      free: '200',
      locked: '0',
      aveBuyPrice: 2,
    },
  },
};

/**
 * AveBuyPricesPerExchange & BalancesPerExchange
 */
const aveBuyPricesAndBalancesPerExchange3 = {
  BINANCE: {
    XRP: {
      free: '200',
      locked: '0',
      aveBuyPrice: 3,
    },
  },
};

/**
 * AveBuyPricesPerExchange & BalancesPerExchange
 */
const aveBuyPricesAndBalancesPerExchange4 = {
  BINANCE: {
    XRP: {
      free: '200',
      locked: '0',
      aveBuyPrice: 2,
    },
  },
};

/**
 * AveBuyPricesPerExchange & BalancesPerExchange
 */
const aveBuyPricesAndBalancesPerExchange5 = {
  BINANCE: {
    XRP: {
      free: '200',
      locked: '0',
      aveBuyPrice: 2,
    },
  },
};

/**
 * ProfitRatioPerExchange & AveBuyPricesPerExchange & BalancesPerExchange
 */
const profitRatioAndAveBuyPricesAndBalancesPerExchange1 = {
  BINANCE: {
    XRP: {
      free: '200',
      locked: '0',
      aveBuyPrice: 2,
      nowSymbolPrice: 4,
      profitRatio: 200,
    },
  },
};
