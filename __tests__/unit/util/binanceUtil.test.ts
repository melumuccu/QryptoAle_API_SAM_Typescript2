import { Account, MyTrade, TradingType, TradingType_LT } from 'binance-api-node';
import {
  BalanceWithAveBuyPrice,
  BalanceWithProfitRatio,
  BinanceUtil,
} from '../../../src/util/binanceUtil';

const util = new BinanceUtil();

describe('binanceUtil', () => {
  it('fetchBalances(true)', async () => {
    const spyBinanceAccountInfo = jest
      .spyOn(util.binance, 'accountInfo')
      .mockImplementation(() => new Promise(resolve => resolve(binanceAccountInfo)));

    const spyBinancePrices = jest
      .spyOn(util.binance, 'prices')
      .mockImplementationOnce(() => new Promise(resolve => resolve({ BTCUSDT: '50000' })))
      .mockImplementationOnce(() => new Promise(resolve => resolve({ SANDUSDT: '20' })))
      .mockImplementationOnce(() => new Promise(resolve => resolve({ ADAUSDT: '1' })))
      .mockImplementationOnce(() => new Promise((resolve, reject) => reject(undefined))); // symbol => USDTUSDT

    const result = await util.fetchBalances(true);
    const expectedResult = binanceAccountInfo.balances.slice(0, 2); // BTC, SANDがpass

    expect(spyBinanceAccountInfo).toHaveBeenCalledTimes(1);
    expect(spyBinancePrices).toHaveBeenCalledTimes(4);
    expect(result).toEqual(expectedResult);
  });
  it('calAvePriceByBalance(AssetBalance[])', async () => {
    const spyBinanceMyTrades = jest
      .spyOn(util.binance, 'myTrades')
      .mockImplementationOnce(() => new Promise(resolve => resolve(binanceMyTradesBTC)))
      .mockImplementationOnce(() => new Promise(resolve => resolve(binanceMyTradesSAND)));

    const result = await util.calAvePriceByBalance(binanceAccountInfo.balances.slice(0, 2)); // 'util.getHasCoinList(true)'のテストの期待値が渡される想定
    const expectedResult: BalanceWithAveBuyPrice[] = [
      { balance: binanceAccountInfo.balances[0], aveBuyPrice: 50000 }, // BTC
      { balance: binanceAccountInfo.balances[1], aveBuyPrice: 10 }, // SAND
    ];

    expect(spyBinanceMyTrades).toHaveBeenCalledTimes(2);
    expect(result).toEqual(expectedResult);
  });
  it('calProfitRatio(BalanceWithAveBuyPrice[])', async () => {
    const spyBinancePrices = jest
      .spyOn(util.binance, 'prices')
      .mockImplementationOnce(() => new Promise(resolve => resolve({ BTCUSDT: '48598.5' })))
      .mockImplementationOnce(() => new Promise(resolve => resolve({ SANDUSDT: '20' })));

    const result = await util.calProfitRatio([
      // 'calAvePriceByBalance(AssetBalance[])'のテスト期待値が渡される想定
      { balance: binanceAccountInfo.balances[0], aveBuyPrice: 50000 }, // BTC
      { balance: binanceAccountInfo.balances[1], aveBuyPrice: 10 }, // SAND
    ]);

    const expectedResult: PromiseSettledResult<BalanceWithProfitRatio>[] = [
      {
        // BTC
        status: 'fulfilled',
        value: {
          balance: binanceAccountInfo.balances[0],
          nowSymbolPrice: 48598.5,
          profitRatio: 97.2,
        },
      },
      {
        // SAND
        status: 'fulfilled',
        value: {
          balance: binanceAccountInfo.balances[1],
          nowSymbolPrice: 20,
          profitRatio: 200,
        },
      },
    ];

    expect(spyBinancePrices).toHaveBeenCalledTimes(2);
    expect(result).toEqual(expectedResult);
  });
});

//=========================================================
// テストデータ
//=========================================================

/**
 * 戻り値: BinanceUtil.binance.accountInfo()
 */
const binanceAccountInfo: Account = {
  accountType: 'SPOT' as TradingType,
  balances: [
    {
      asset: 'BTC', // [通常の通貨, amount: あり, 例1] => amount: OK, baseFiat換算後: OK
      free: '0.01',
      locked: '0.00000000',
    },
    {
      asset: 'SAND', // [通常の通貨, amount: あり, 例2] => amount: OK, baseFiat換算後: OK
      free: '50.00000000',
      locked: '150.00000000',
    },
    {
      asset: 'ADA', // [通常の通貨, amount: あり, 例3] => amount: OK, baseFiat換算後: NG
      free: '0.10000000',
      locked: '0.00000000',
    },
    {
      asset: 'USDT', // [基軸通貨, amount: あり] => amount: OK, baseFiat換算後: NG
      free: '499.50000000',
      locked: '0.50000000',
    },
    {
      asset: 'XRP', // [通常の通貨, amount: なし] => amount: NG
      free: '0.00000000',
      locked: '0.00000000',
    },
  ],
  buyerCommission: 0,
  canDeposit: true,
  canTrade: true,
  canWithdraw: true,
  makerCommission: 10,
  permissions: ['SPOT'] as TradingType_LT[],
  sellerCommission: 0,
  takerCommission: 10,
  updateTime: 1648465688412,
};

/**
 * 戻り値: BinanceUtil.binance.myTrades({ symbol: 'BTCUSDT' })
 *
 * ・expect: [sumQty: 0.01, aveBuyPrice: 50000]
 * ・始めに近い要素ほど古い取引履歴
 */
const binanceMyTradesBTC: MyTrade[] = [
  {
    symbol: 'BTCUSDT',
    commissionAsset: 'BTC',
    time: 1634101247987, // より新しい取引で想定Qty分の取引は完結するのでこの取引は無視される想定
    isBuyer: true,
    price: '99999.00000000',
    qty: '100.00000000',
    id: 10000001,
    orderId: 10000001,
    orderListId: -1,
    quoteQty: '1.00000000',
    commission: '0.00010000',
    isMaker: true,
    isBestMatch: true,
  },
  {
    symbol: 'BTCUSDT',
    commissionAsset: 'BTC',
    time: 1634101247987,
    isBuyer: true,
    price: '45000.00000000',
    qty: '0.00500000',
    id: 10000001,
    orderId: 10000001,
    orderListId: -1,
    quoteQty: '1.00000000',
    commission: '0.00010000',
    isMaker: true,
    isBestMatch: true,
  },
  {
    symbol: 'BTCUSDT',
    commissionAsset: 'BTC',
    time: 1634101247987,
    isBuyer: true,
    price: '55000.00000000',
    qty: '0.00500000',
    id: 10000001,
    orderId: 10000001,
    orderListId: -1,
    quoteQty: '1.00000000',
    commission: '0.00010000',
    isMaker: true,
    isBestMatch: true,
  },
];

/**
 * 戻り値: BinanceUtil.binance.myTrades({ symbol: 'SANDUSDT' })
 *
 * ・expect: [sumQty: 200, aveBuyPrice: 10]
 * ・始めに近い要素ほど古い取引履歴
 */
const binanceMyTradesSAND: MyTrade[] = [
  {
    symbol: 'SANDUSDT',
    commissionAsset: 'SAND',
    time: 1634101247987,
    isBuyer: true,
    price: '12.00000000',
    qty: '500.00000000', // この取引履歴では100だけ計算に利用され、想定sumQtyである200に到達する
    id: 10000001,
    orderId: 10000001,
    orderListId: -1,
    quoteQty: '1.00000000',
    commission: '0.00010000',
    isMaker: true,
    isBestMatch: true,
  },
  {
    symbol: 'SANDUSDT',
    commissionAsset: 'SAND',
    time: 1634101247987,
    isBuyer: true,
    price: '9.50000000',
    qty: '50.00000000',
    id: 10000001,
    orderId: 10000001,
    orderListId: -1,
    quoteQty: '1.00000000',
    commission: '0.00010000',
    isMaker: true,
    isBestMatch: true,
  },
  {
    symbol: 'SANDUSDT',
    commissionAsset: 'SAND',
    time: 1634101247987,
    isBuyer: true,
    price: '6.50000000',
    qty: '50.00000000',
    id: 10000001,
    orderId: 10000001,
    orderListId: -1,
    quoteQty: '1.00000000',
    commission: '0.00010000',
    isMaker: true,
    isBestMatch: true,
  },
  {
    symbol: 'SANDUSDT',
    commissionAsset: 'SAND',
    time: 1634101247987,
    isBuyer: false, // 売りなので除外
    price: '9999.00000000',
    qty: '10000.00000000',
    id: 10000001,
    orderId: 10000001,
    orderListId: -1,
    quoteQty: '1.00000000',
    commission: '0.00010000',
    isMaker: true,
    isBestMatch: true,
  },
];
