import BigNumber from 'bignumber.js';
import { Trade } from '../domain/domain';

export class CalculateUtil {
  /**
   * 渡された数値を全て合計する
   *
   * @param targets 足し合わせたい数値
   * @returns 合計
   */
  static sum(targets: (string | number)[]): number {
    const targetsB = targets.map(x => new BigNumber(Number(x)));
    const sumB = targetsB.reduce((total, current) => {
      return total.plus(current);
    });
    return parseFloat(sumB.toString());
  }
}
