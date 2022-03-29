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
      const symbolPrice = await this.getSymbolPrice(symbol).catch(error => {
        console.debug(symbol + ": can't get price ");
      });

      if (symbolPrice == null) continue; // 通貨ペアの価格が取得できなかった場合スキップ
      const symbolPriceB = BNUtil.BN(symbolPrice[symbol]);
      const freeB = BNUtil.BN(balance.free);
      const lockedB = BNUtil.BN(balance.locked);
      const amountB = includeOnOrder ? freeB.plus(lockedB) : freeB;
      const convartBaseFiat: BigNumber = amountB.times(symbolPriceB); // 基準通貨に換算
      if (convartBaseFiat.isLessThan(1)) continue; // 少額すぎる(1baseFiat未満)場合はスキップ
      balanceList.push(balance);
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
      return (includeLocked ? freeB.plus(lockedB).toNumber() : freeB.toNumber()) > 0;
    };

    return balances.filter(orMoreMinQuantity);
  }
}
