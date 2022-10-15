import BigNumber from 'bignumber.js';
import * as dotenv from 'dotenv';
import { Trade } from '../domain/domain';
import { CalculateUtil as calculateUtil } from './calculateUtil';

dotenv.config();

describe('CalculateUtil', () => {
  beforeEach(() => {});

  test('should be created', () => {
    expect(calculateUtil).toBeTruthy();
  });

  test('#sum 正常に少数の加算ができているか', async () => {
    const target = calculateUtil.sum(['0.001', 0.0002, '0.00003', 0.000004]);
    expect(target).toEqual(0.001234);
  });

  test('#minus 正常に少数の減算ができているか', async () => {
    const target = calculateUtil.minus(['0.1', 0.05, '0.005', 0.0005]);
    expect(target).toEqual(0.0445);
  });

  test('#multiply 正常に少数の乗算ができているか', async () => {
    const target = calculateUtil.multiply(['0.001', 10, '0.05', 0.2]);
    expect(target).toEqual(0.0001);
  });

  test('#divide 正常に少数の除算ができているか', async () => {
    const target = calculateUtil.divide(['100', 0.005, '0.2', 5000]);
    expect(target).toEqual(20);
  });

  test('#dp 正常に丸め処理ができているか(切り捨て)_1', async () => {
    const target = calculateUtil.dp(100.5, 0, BigNumber.ROUND_DOWN);
    expect(target).toEqual(100);
  });

  test('#dp 正常に丸め処理ができているか(切り捨て)_2', async () => {
    const target = calculateUtil.dp('100.9999', 3, BigNumber.ROUND_DOWN);
    expect(target).toEqual(100.999);
  });

  test('#dp 正常に丸め処理ができているか(切り上げ)_1', async () => {
    const target = calculateUtil.dp(100.5, 0, BigNumber.ROUND_UP);
    expect(target).toEqual(101);
  });

  test('#dp 正常に丸め処理ができているか(切り上げ)_2', async () => {
    const target = calculateUtil.dp('100.9991', 3, BigNumber.ROUND_UP);
    expect(target).toEqual(101);
  });

  test('#dp 正常に丸め処理ができているか(四捨五入)_1', async () => {
    const target = calculateUtil.dp(100.5, 0, BigNumber.ROUND_HALF_UP);
    expect(target).toEqual(101);
  });

  test('#dp 正常に丸め処理ができているか(切り捨て)_2', async () => {
    const target = calculateUtil.dp('100.9994', 3, BigNumber.ROUND_HALF_UP);
    expect(target).toEqual(100.999);
  });

  test('#aveBuyPrice 正常にTrade[]から平均購入価格が算出できているか_1', async () => {
    const trades: Trade[] = [
      {
        symbol: 'test1',
        price: '100',
        qty: '1',
        commission: '',
        commissionAsset: '',
        time: 0,
        isBuy: true,
      },
      {
        symbol: 'test1',
        price: '200',
        qty: '1',
        commission: '',
        commissionAsset: '',
        time: 0,
        isBuy: true,
      },
    ];
    const target = calculateUtil.aveBuyPrice(trades);
    expect(target).toEqual(150);
  });

  test('#aveBuyPrice 正常にTrade[]から平均購入価格が算出できているか_2', async () => {
    const trades: Trade[] = [
      {
        symbol: 'test1',
        price: '0.005',
        qty: '0.01',
        commission: '',
        commissionAsset: '',
        time: 0,
        isBuy: true,
      },
      {
        symbol: 'test1',
        price: '0.01',
        qty: '0.01',
        commission: '',
        commissionAsset: '',
        time: 0,
        isBuy: true,
      },
    ];
    const target = calculateUtil.aveBuyPrice(trades);
    expect(target).toEqual(0.0075);
  });
});
