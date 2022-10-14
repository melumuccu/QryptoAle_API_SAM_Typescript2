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
});
