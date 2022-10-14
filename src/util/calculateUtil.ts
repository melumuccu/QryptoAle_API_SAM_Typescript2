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

  /**
   * 渡した購入履歴から平均価格を算出
   *
   * @param trades 売買履歴
   * @returns 平均価格
   */
  static aveBuyPrice(trades: Trade[]): number {
    return 0;
  }
}
