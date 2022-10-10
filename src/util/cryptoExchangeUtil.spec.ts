import * as dotenv from 'dotenv';
import { CryptoExchangesConsts } from '../consts/cryptoExchangesConsts';
import { MyBinance } from '../domain/cryptoExchanges/binance';
import { CryptoExchangeUtil } from './cryptoExchangeUtil';

dotenv.config();

describe('CryptoExchangeUtil', () => {
  let cryptoExchangeUtil: CryptoExchangeUtil;

  beforeEach(() => {
    cryptoExchangeUtil = new CryptoExchangeUtil();
  });

  test('should be created', () => {
    expect(cryptoExchangeUtil).toBeTruthy();
  });

  test('#makeCryptoExchangeInstances 正常にインスタンスが作成できているか(Binance)', async () => {
    const target = await cryptoExchangeUtil.makeCryptoExchangeInstances([
      CryptoExchangesConsts.name.BINANCE,
    ]);
    expect(target[0]).toEqual(expect.any(MyBinance));
  });
});
