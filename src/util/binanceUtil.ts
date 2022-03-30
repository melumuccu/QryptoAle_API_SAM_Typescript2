import BigNumber from 'bignumber.js';
import Binance, { AssetBalance, MyTrade } from 'binance-api-node';
import { BigNumberUtil } from './bigNumberUtil';

const BNUtil = new BigNumberUtil();

const baseFiat = 'USDT';
const trade = {
  buy: true,
  sell: false,
};

export type BalanceWithAveBuyPrice = { balance: AssetBalance; aveBuyPrice: number };
export type BalanceWithProfitRatio = { balance: AssetBalance; profitRatio: number };

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
  async fetchBalances(includeOnOrder: boolean): Promise<AssetBalance[]> {
    let balanceList: AssetBalance[] = [];
    const balanceOfHasCoins = await this.fetchBalancesFromBinance(includeOnOrder);

    for (let balance of balanceOfHasCoins) {
      const symbol = balance.asset + baseFiat;
      const symbolPrice = await this.fetchSymbolPrice(symbol).catch(error => {
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

  /**
   * Balance情報からbaseFiatに対しての平均購入価額を算出する
   *
   * @param assetBalances
   */
  async calAvePriceByBalance(assetBalances: AssetBalance[]): Promise<BalanceWithAveBuyPrice[]> {
    let aveBuyPrice: BalanceWithAveBuyPrice[];

    // 各シンボル毎に平均購入価額を算出
    // 非同期ループ処理
    const tasks = assetBalances.map(assetBalance => this.funcCalAvePriceByBalance(assetBalance));
    aveBuyPrice = await Promise.all(tasks);

    return aveBuyPrice;
  }

  /**
   * 現在価格から利益率を算出する
   *
   * @param balanceWithAveBuyPrice
   */
  calProfitRatio(balanceWithAveBuyPrice: BalanceWithAveBuyPrice[]): BalanceWithProfitRatio {
    throw new Error('Method not implemented.');
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
  private fetchSymbolPrice(symbol: string): Promise<{ [index: string]: string }> {
    return this.binance.prices({ symbol });
  }

  /**
   * 保有している各通貨の現在保有額を取得
   *
   * @param includeLocked 注文中の数量を含むか
   * @returns 各通貨の現在保有額
   */
  private async fetchBalancesFromBinance(includeLocked: boolean): Promise<AssetBalance[]> {
    const balances = (await this.binance.accountInfo()).balances;

    /** 最小数量を超えた仮想通貨名を抽出(ex. [BTC, ETH, ...]) */
    const orMoreMinQuantity = (balance: AssetBalance) => {
      const freeB = new BigNumber(parseFloat(balance.free));
      const lockedB = new BigNumber(parseFloat(balance.locked));
      return (includeLocked ? freeB.plus(lockedB).toNumber() : freeB.toNumber()) > 0;
    };

    return balances.filter(orMoreMinQuantity);
  }

  /**
   * 関数calAvePriceByBalanceの処理部分
   *
   * @param assetBalance
   * @returns balanceと平均購入価額
   */
  private async funcCalAvePriceByBalance(
    assetBalance: AssetBalance
  ): Promise<BalanceWithAveBuyPrice> {
    // 現在持っている数量分の購入履歴を取得
    const buyTradesHaveNow = await this.buyTradesOfNowAmount(assetBalance);

    // 購入履歴から平均価格を算出
    const avePriceHaveNow = this.calAvePrice(buyTradesHaveNow);

    return { balance: assetBalance, aveBuyPrice: avePriceHaveNow };
  }

  /**
   * 現在持っている数量分の購入履歴を返す
   * @param assetBalance ex. XYM
   * @returns 購入履歴
   */
  private async buyTradesOfNowAmount(assetBalance: AssetBalance): Promise<MyTrade[]> {
    const symbol = assetBalance.asset + baseFiat;

    // シンボルの購入履歴を取得
    // MEMO トレード履歴の取得順は古いものから並び、最新の取引からMAX500件まで取得できる
    // TODO 500件超えてた場合で、平均購入価額の算出処理が完了しなかった場合、最後の取引DIを指定して次の500件を取得し繰り返す必要がある
    const symbolBuyTrades = await this.fetchSymbolTradesBuyOrSell(trade.buy, symbol);

    let sumAmountB = BNUtil.BN(assetBalance.free).plus(BNUtil.BN(assetBalance.locked)); // 合計数量(ここから減算していく)
    let hadEnd = false; // true: フィルター処理の終了
    const result = symbolBuyTrades.reverse().filter(trade => {
      if (hadEnd) return false;
      const qtyB: BigNumber = BNUtil.BN(trade.qty); // 購入取引量
      sumAmountB = sumAmountB.minus(qtyB); // 合計数量-購入取引量
      if (sumAmountB.lt(0)) {
        // マイナスになった(=現在保有数量をここまでの購入取引量が上回った)場合、最後の購入履歴を作成する
        trade.qty = qtyB.plus(sumAmountB).toString(); // 合計数量を元に戻し、購入履歴にセット
        hadEnd = true; // 後続のfilter処理は行わない
      }
      return trade;
    });

    return result;
  }

  /**
   * 渡した売買履歴から平均価格を算出
   *
   * { (price1 * qty1) + (price2 * qty1) + ... + (priceN * qtyN) } / { qty1 + qty2 + ... + qtyN }
   *
   * @param trades 売買履歴
   * @returns 平均価格
   */
  private calAvePrice(trades: MyTrade[]): number {
    const sumOfTotalAmounts = trades
      .map(trade => BNUtil.BN(trade.price).multipliedBy(BNUtil.BN(trade.qty)))
      .reduce((totalAmount, currentVal) => totalAmount.plus(currentVal), new BigNumber(0));

    const sumOfQty = trades
      .map(trade => BNUtil.BN(trade.qty))
      .reduce((qty, currentVal) => qty.plus(currentVal), new BigNumber(0));

    return sumOfTotalAmounts.dividedBy(sumOfQty).toNumber();
  }

  /**
   * 指定ペアの取引履歴(売り買い指定)を取得
   * @param isBuy buy=true, sell=false
   * @param symbol 指定ペア
   * @returns 取引履歴(売り買い指定)
   */
  private async fetchSymbolTradesBuyOrSell(isBuy: boolean, symbol: string): Promise<MyTrade[]> {
    const allTrades = await this.fetchSymbolTrades(symbol).catch(error => {
      console.error(error);
    });

    if (allTrades == null) {
      throw new Error('getSymbolTradesBuyOrSell: ' + 'allTrades == null');
    }

    const buyTrades = allTrades.filter(trade => {
      return trade.isBuyer === isBuy;
    });

    return buyTrades;
  }

  /**
   * 指定ペアの取引履歴(売買両方)を取得
   * (全ペア分取得するメソッドは提供されていない)
   * @param symbol 指定ペア
   * @returns 取引履歴(売買両方)
   */
  private fetchSymbolTrades(symbol: string): Promise<MyTrade[]> {
    return this.binance.myTrades({ symbol: symbol });
  }
}
