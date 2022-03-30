import BigNumber from 'bignumber.js';
import Binance, { AssetBalance, MyTrade } from 'binance-api-node';
import { BigNumberUtil } from './bigNumberUtil';

const BNUtil = new BigNumberUtil();

const baseFiat = 'USDT';
const trade = {
  buy: true,
  sell: false,
};

export type AveBuyPrice = { balance: AssetBalance; aveBuyPrice: number };

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

  /**
   * 「売却数分差し引いた購入履歴」から平均購入価額を算出する
   * @param assetBalances
   */
  async calAvePriceHaveNow(assetBalances: AssetBalance[]): Promise<AveBuyPrice[]> {
    let aveBuyPrice: AveBuyPrice[];

    // 平均購入価額を算出
    // 非同期ループ処理
    const tasks = assetBalances.map(assetBalance => this.funcCalAvePriceHaveNow(assetBalance));
    aveBuyPrice = await Promise.all(tasks);

    return aveBuyPrice;
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

  /**
   * 関数calAvePriceHaveNowの処理部分
   *
   * @param assetBalance
   * @returns balanceと平均購入価額
   */
  private async funcCalAvePriceHaveNow(assetBalance: AssetBalance): Promise<AveBuyPrice> {
    // 現在持っている数量分の購入履歴を取得
    const buyTradesHaveNow = await this.buyTradesOfNowAmount(assetBalance);

    // 購入履歴から平均価格を算出
    const avePriceHaveNow = this.calAvePrice(buyTradesHaveNow);

    const aveBuyPrice: AveBuyPrice = { balance: assetBalance, aveBuyPrice: avePriceHaveNow };

    return aveBuyPrice;
  }

  /**
   * 現在持っている数量分の購入履歴を返す
   * @param assetBalance ex. XYM
   * @returns 購入履歴
   */
  private async buyTradesOfNowAmount(assetBalance: AssetBalance): Promise<MyTrade[]> {
    const symbol = assetBalance.asset + baseFiat;
    let coinBalanceB = BNUtil.BN(assetBalance.free).plus(BNUtil.BN(assetBalance.locked));

    // シンボルの購入履歴を取得
    // MEMO トレード履歴の取得順は古いものから並び、最新の取引からMAX500件まで取得できる
    // TODO 500件超えてた場合で、平均購入価額の算出処理が完了しなかった場合、最後の取引DIを指定して次の500剣を取得し繰り返す必要がある
    const symbolBuyTrades = await this.getSymbolTradesBuyOrSell(trade.buy, symbol);

    // 現在の保有数量にあたる購入履歴を最新のものから抜き出し(配列の末尾要素から処理を進める)
    const tmpTrades: MyTrade[] = [];
    for (let i = symbolBuyTrades.length - 1; i >= 0; i--) {
      // 取引量
      const qtyB: BigNumber = new BigNumber(symbolBuyTrades[i].qty);

      // 現在保有数量-購入取引量
      coinBalanceB = coinBalanceB.minus(qtyB);

      if (coinBalanceB.lt(0)) {
        // マイナスになった(=現在保有数量をここまでの購入取引量が上回った)場合
        // 差の絶対値を購入履歴にセット
        symbolBuyTrades[i].qty = coinBalanceB.abs().toString();

        // 配列をプッシュ
        tmpTrades.push(symbolBuyTrades[i]);
        break;
      } else {
        // 配列をプッシュ
        tmpTrades.push(symbolBuyTrades[i]);
        continue;
      }
    }

    // リターンの配列(配列内が新しいものから順に並んでいるので逆順に)
    const returnTrades = tmpTrades.reverse();
    return returnTrades;
  }

  /**
   * 渡した売買履歴から平均価格を算出
   * @param trades 売買履歴
   * @returns 平均価格
   */
  private calAvePrice(trades: MyTrade[]): number {
    let sumPriceB = new BigNumber(0);
    let divisionNum = 0;
    // 各取引履歴の取引時の値段を全て足す
    for (let trade of trades) {
      const priceB = new BigNumber(parseFloat(trade.price));
      sumPriceB = sumPriceB.plus(priceB);
      divisionNum++;
    }
    // 取引数で割る
    let avePriceB = sumPriceB.dividedBy(divisionNum);
    return avePriceB.toNumber();
  }

  /**
   * 指定ペアの取引履歴(売り買い指定)を取得
   * @param isBuy buy=true, sell=false
   * @param symbol 指定ペア
   * @returns 取引履歴(売り買い指定)
   */
  private async getSymbolTradesBuyOrSell(isBuy: boolean, symbol: string): Promise<MyTrade[]> {
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
