import { Account, TradingType, TradingType_LT } from 'binance-api-node';
import { BinanceUtil } from '../../../src/util/binanceUtil';

const util = new BinanceUtil();

describe('binanceUtil#getSymbolPrice', () => {
  it('util.getHasCoinList(true)', async () => {
    const spyBinanceAccountInfo = jest
      .spyOn(util.binance, 'accountInfo')
      .mockImplementation(() => new Promise(resolve => resolve(binanceAccountInfo)));

    const spyBinancePrices = jest
      .spyOn(util.binance, 'prices')
      .mockImplementationOnce(() => new Promise(resolve => resolve({ BTCUSDT: '50000' })))
      .mockImplementationOnce(() => new Promise(resolve => resolve({ SANDUSDT: '20' })))
      .mockImplementationOnce(() => new Promise(resolve => resolve({ ADAUSDT: '1' })))
      .mockImplementationOnce(() => new Promise((resolve, reject) => reject(undefined))); // symbol => USDTUSDT

    const result = await util.getHasCoinList(true);
    const expectedResult = binanceAccountInfo.balances.slice(0, 2); // BTC, SANDがpass

    expect(result).toEqual(expectedResult);
    expect(spyBinanceAccountInfo).toHaveBeenCalledTimes(1);
    expect(spyBinancePrices).toHaveBeenCalledTimes(4);
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
