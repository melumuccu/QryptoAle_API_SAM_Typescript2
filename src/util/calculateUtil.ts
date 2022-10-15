import BigNumber from 'bignumber.js';
import { Trade } from '../domain/domain';

export class CalculateUtil {
  /**
   * 渡された数値を全て加算する
   *
   * @param targets 加算したい数値
   * @returns 計算結果
   */
  static sum(targets: (string | number)[]): number {
    const targetsB = targets.map(x => new BigNumber(Number(x)));
    const sumB = targetsB.reduce((total, current) => {
      return total.plus(current);
    });
    return parseFloat(sumB.toString());
  }

  /**
   * 渡された数値を全て減算する
   *
   * @param targets 減算したい数値
   * @returns 計算結果
   */
  static minus(targets: (string | number)[]): number {
    const targetsB = targets.map(x => new BigNumber(Number(x)));
    const sumB = targetsB.reduce((total, current, i) => {
      return i === 0 ? current : total.minus(current);
    });
    return parseFloat(sumB.toString());
  }

  /**
   * 渡された数値を全て乗算する
   *
   * @param targets 乗算したい数値
   * @returns 計算結果
   */
  static multiply(targets: (string | number)[]): number {
    const targetsB = targets.map(x => new BigNumber(Number(x)));
    const resultB = targetsB.reduce((total, current, i) => {
      return i === 0 ? current : total.multipliedBy(current);
    });
    return parseFloat(resultB.toString());
  }

  /**
   * 渡した購入履歴から平均価格を算出
   *
   * A = (price1 * qty1) + (price2 * qty1) + ... + (priceN * qtyN)
   * B = qty1 + qty2 + ... + qtyN
   * return A / B
   *
   * @param trades 売買履歴
   * @returns 平均価格
   */
  static aveBuyPrice(trades: Trade[]): number {
    const tradesB = trades.map(t => {
      return {
        priceB: new BigNumber(t.price),
        qtyB: new BigNumber(t.qty),
      };
    });

    // A
    // prettier-ignore
    const sumOfTotalAmounts = tradesB
      .map(t => t.priceB.multipliedBy(t.qtyB))
      .reduce((totalAmount, currentVal) => totalAmount.plus(currentVal));

    // B
    // prettier-ignore
    const sumOfQty = tradesB
      .map(t => t.qtyB)
      .reduce((qty, currentVal) => qty.plus(currentVal));

    return sumOfTotalAmounts.dividedBy(sumOfQty).toNumber();
  }
}
