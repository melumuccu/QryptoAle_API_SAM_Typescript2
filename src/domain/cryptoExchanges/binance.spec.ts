import { Account, TradingType } from 'binance-api-node';
import * as dotenv from 'dotenv';
import { CryptoExchangesConsts } from '../../consts/cryptoExchangesConsts';
import { MyBinance } from './binance';

dotenv.config();

describe('CalculateService', () => {
  let binance: MyBinance;

  beforeEach(() => {
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
    expect(binance).toBeTruthy();
  });

  test('#fetchBalances 正常に動作しているか', async () => {
    const target = await binance.fetchBalances();
    expect(target['USDT']).toEqual({
      free: expect.any(String),
      locked: expect.any(String),
    });
  });

  test('#fetchBalances 保有数量0のassetを除外できているか', async () => {
    const spy = jest.spyOn(binance.sdk, 'accountInfo').mockImplementation(() => {
      return new Promise(resolve => {
        resolve(account1);
      });
    });
    const target = await binance.fetchBalances();
    expect(target).toEqual({
      USDT: {
        free: '50',
        locked: '500',
      },
    });
  });

  test('#fetchNowSymbolPrice NowSymbolPriceが取得できているか', async () => {
    const target = await binance.fetchNowSymbolPrice('BTCUSDT');
    expect(target).toEqual(expect.any(Number));
  });

  test('#fetchSymbolTrades SymbolTradesが取得できているか', async () => {
    const target = await binance.fetchSymbolTrades('ETHUSDT', true);
    expect(target).toEqual(expect.any(Array));
  });
});

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
