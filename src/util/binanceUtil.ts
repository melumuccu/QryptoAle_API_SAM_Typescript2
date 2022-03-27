import BigNumber from 'bignumber.js';
import { Balance, Ticker } from '../interface/binance';
import { BigNumberUtil } from './bigNumberUtil';

const Binance = require('node-binance-api');
const BNUtil = new BigNumberUtil();

const baseFiat = 'USDT';

export class BinanceUtil {
  // 仮実装(API KEYなどをDB登録できるようになるまで)
  private binance = new Binance().options({
    APIKEY: process.env.APIKEY,
    APISECRET: process.env.APISECRET,
  });

  /**
   * 現在保有している通貨リストを取得
   *
   * ・ただし、少額(Fiat通貨に換算後、1Fiat以下)の通貨は省く
   *
   * @param includeOnOrder 注文中の数量を含むか
   * @returns 保有通貨リスト
   */
  async getHasCoinList(includeOnOrder: boolean): Promise<string[]> {
    let balanceList: string[] = [];
    const balanceOfHasCoins: any = await this.getAllBalances(includeOnOrder).catch(error =>
      console.error(error)
    );

    for (let balance in balanceOfHasCoins) {
      const symbol = balance + baseFiat;
      const symbolPrice: string | void = await this.getSymbolPrice(symbol).catch(error => {
        console.debug(symbol + ": can't get price ");
      });

      if (typeof symbolPrice !== 'undefined') {
        const symbolPriceB = BNUtil.BN(symbolPrice);

        const availableAmountB = BNUtil.BN(balanceOfHasCoins[balance]['available']);
        const onOrderB = BNUtil.BN(balanceOfHasCoins[balance]['onOrder']);
        const amountB = includeOnOrder ? availableAmountB.plus(onOrderB) : availableAmountB;

        // fiat換算
        const convartUsdt: BigNumber = amountB.times(symbolPriceB);

        // 少額通貨は省略
        if (convartUsdt.gt(1)) {
          // more than 1$
          balanceList.push(balance);
        }
      }
    }

    return balanceList;
  }

  //=========================================================
  // private
  //=========================================================
  /**
   * 指定ペアの現在価格を取得
   *
   * @param symbol 指定ペア
   * @param binance
   * @returns 指定ペアの現在価格
   */
  private getSymbolPrice(symbol: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.binance.prices(function (error: string, ticker: Ticker) {
        return ticker[symbol] != null ? resolve(ticker[symbol]) : reject(new Error(error));
      });
    });
  }

  /**
   * 保有している各通貨の現在保有額を取得
   *
   * @param includeOnOrder 注文中の数量を含むか
   * @returns 各通貨の現在保有額
   */
  private getAllBalances(includeOnOrder: boolean): Promise<Balance> {
    return new Promise((resolve, reject) => {
      this.binance.balance(function (error: string, balances: Balance) {
        let balanceOfHasCoins: Balance = {};

        // 保有している通貨のみに限定
        for (let balance in balances) {
          const availableB = BNUtil.BN(balances[balance].available);
          const onOrderB = BNUtil.BN(balances[balance].onOrder);

          const tmpBalanceB = includeOnOrder ? availableB.plus(onOrderB) : availableB;

          if (tmpBalanceB.toNumber() !== 0) {
            balanceOfHasCoins[balance] = balances[balance];
          }
        }

        return resolve(balanceOfHasCoins);
      });
    });
  }
}
