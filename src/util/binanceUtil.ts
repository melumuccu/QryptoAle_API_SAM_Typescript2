import BigNumber from 'bignumber.js';
import Binance, { AssetBalance } from 'binance-api-node';
import { BigNumberUtil } from './bigNumberUtil';

const BNUtil = new BigNumberUtil();

const baseFiat = 'USDT';

export class BinanceUtil {
  // 仮実装(API KEYなどをDB登録できるようになるまで)
  binance = Binance({
    apiKey: process.env.APIKEY,
    apiSecret: process.env.APISECRET,
  });

  /**
   * 現在保有している通貨リストを取得
   *
   * ・ただし、少額(Fiat通貨に換算後、1Fiat以下)の通貨は省く
   *
   * @param includeOnOrder 注文中の数量を含むか
   * @returns 保有通貨リスト
   */
  async getHasCoinList(includeOnOrder: boolean): Promise<AssetBalance[]> {
    let balanceList: AssetBalance[] = [];
    const balanceOfHasCoins = await this.getAllBalances(includeOnOrder);

    for (let balance of balanceOfHasCoins) {
      const symbol = balance.asset + baseFiat;
      const symbolPrice: { [index: string]: string } | void = await this.getSymbolPrice(
        symbol
      ).catch(error => {
        console.debug(symbol + ": can't get price ");
      });

      if (symbolPrice != null) {
        const symbolPriceB = BNUtil.BN(symbolPrice[symbol]);

        const freeB = BNUtil.BN(balance.free);
        const lockedB = BNUtil.BN(balance.locked);
        const amountB = includeOnOrder ? freeB.plus(lockedB) : freeB;

        // baseFiat換算
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
   * @returns 指定ペアの現在価格
   */
  private getSymbolPrice(symbol: string): Promise<{ [index: string]: string }> {
    return this.binance.prices({ symbol });
  }

  /**
   * 保有している各通貨の現在保有額を取得
   *
   * @param includeLocked 注文中の数量を含むか
   * @returns 各通貨の現在保有額
   */
  private async getAllBalances(includeLocked: boolean): Promise<AssetBalance[]> {
    const balances = (await this.binance.accountInfo()).balances;

    /** 最小数量を超えた仮想通貨名を抽出(ex. [BTC, ETH, ...]) */
    const orMoreMinQuantity = (balance: AssetBalance) => {
      const freeB = new BigNumber(parseFloat(balance.free));
      const lockedB = new BigNumber(parseFloat(balance.locked));
      // 対象とする数量
      return includeLocked ? freeB.plus(lockedB).toNumber() : freeB.toNumber();
    };

    return balances.filter(orMoreMinQuantity);
  }
}
