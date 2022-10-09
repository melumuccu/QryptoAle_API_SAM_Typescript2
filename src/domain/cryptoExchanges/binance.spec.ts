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

  test('#fetchBalances Balancesが取得できているか', async () => {
    const target = await binance.fetchBalances();
    expect(target['USDT']).toEqual({
      free: expect.any(String),
      locked: expect.any(String),
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
