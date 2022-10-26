import { APIGatewayProxyEvent } from 'aws-lambda';
import BigNumber from 'bignumber.js';
import { BaseFiatConsts } from '../../../consts/baseFiatConsts';
import { CryptoExchangesConsts } from '../../../consts/cryptoExchangesConsts';
import { CryptoExchange } from '../../../domain/abstract/cryptoExchange';
import { AveBuyPrice, Balance, ProfitRatio, Trade } from '../../../domain/domain';
import { AssertUtil } from '../../../util/assertUtil';
import { CalculateUtil as calc } from '../../../util/calculateUtil';
import { CryptoExchangeUtil } from '../../../util/cryptoExchangeUtil';

const assert = new AssertUtil();
const exchange = new CryptoExchangeUtil();

export class ProfitRatioBusiness {
  /** コンストラクタ */
  constructor() {}

  /**
   * リクエストペイロードのバリデーション
   *
   * @param event リクエストペイロード
   * @returns 全てのチェックを通貨したペイロード | エラー内容を含むレスポンスbody
   */
  validateRequest(event: APIGatewayProxyEvent): passedRequest | hasValidationErrorBody {
    const errorMessages: string[] = [];

    const queryParams = event.queryStringParameters;
    const baseFiat = queryParams?.baseFiat;

    // queryStringParameters の必須チェック
    if (queryParams == null) {
      errorMessages.push('No query parameters.');
    } else {
      // baseFiat 関連チェック
      if (baseFiat == null) {
        errorMessages.push("Query parameter 'baseFiat' is required.");
      } else {
        const baseFiatArray = Object.entries(BaseFiatConsts.name).map(x => x[1]);
        if (!baseFiatArray.some(x => x === baseFiat)) {
          errorMessages.push(
            `Query parameter 'baseFiat' must be included by listed values. passed baseFiat: ${baseFiat}`
          );
        }
      }
    }

    if (errorMessages.length > 0) {
      return {
        error: {
          messages: errorMessages,
        },
      };
    }

    return {
      queryStringParameters: {
        baseFiat: baseFiat as string,
      },
    };
  }

  /**
   * 利益率を取得するメイン処理
   *
   * @param baseFiat 基軸通貨
   * @returns 利益率とそれの算出に用いた要素 | エラー内容を含むレスポンスbody
   */
  async getProfitRatio(
    baseFiat: string
  ): Promise<
    | { result: ProfitRatioPerExchange & AveBuyPricesPerExchange & BalancesPerExchange }
    | { error: unknown }
  > {
    try {
      // 全仮想通貨取引所のインスタンスを取得
      // TODO ログイン機能実装後、ユーザに紐づく仮想通貨取引所のインスタンスを動的に取得する形にする
      const targetExchanges: CryptoExchangesConsts.Name[] = [CryptoExchangesConsts.name.BINANCE];
      const exchanges = exchange.makeCryptoExchangeInstances(targetExchanges);

      // 現在保有している通貨リストを取得
      const balances = await this.fetchBalances(exchanges).catch(reason => {
        throw reason;
      });

      // 各通貨の平均購入価額を算出する
      const aveBuyPricesWithBal = await this.fetchAveBuyPrices(exchanges, balances, baseFiat).catch(
        reason => {
          throw reason;
        }
      );

      // 現在価格から利益率を算出する
      const ProfitRatioWithAbpAndBal = await this.fetchProfitRatio(
        exchanges,
        aveBuyPricesWithBal,
        baseFiat
      ).catch(reason => {
        throw reason;
      });

      return {
        result: ProfitRatioWithAbpAndBal,
      };
    } catch (error) {
      return {
        error: error,
      };
    }
  }

  /**
   * 渡された各取引所の各assetについてBalanceを取得する
   *
   * @param exchanges 取引所インスタンスのリスト
   * @returns 渡された全ての取引所インスタンスについてのBalance
   */
  async fetchBalances(exchanges: CryptoExchange[]): Promise<BalancesPerExchange> {
    // 取引所単位で処理していくタスク
    const task = exchanges.map(async e => {
      // 固有処理
      const x = await e.fetchBalances();
      // 取引所名をkeyとする
      const perExchange: BalancesPerExchange = {
        [e.name]: x,
      };
      return perExchange;
    });
    // 全タスクの処理
    const allSettledTask = await Promise.allSettled(task);
    // 全タスクの成功したタスクに絞る
    const fulfilled = assert.promiseSettledResultFilter(allSettledTask);

    /** 配列をオブジェクトに加工 */
    const processingToObject = (previous: any, current: any) => {
      return Object.assign(current, previous);
    };

    return fulfilled.reduce(processingToObject);
  }

  /**
   * 渡された各取引所の各assetについて平均購入価格を取得する
   *
   * ※ Balanceも併せて返す形にしている
   *
   *   【理由】
   *
   *   最後に全てをmergeするコストの重い計算処理をしないようにするため。
   *   今回目的としている平均購入価格を算出するためにはBalanceが必要で、引数として渡されるためそれなら最初からmergeして返すのが処理コスト削減になるという考え。
   *
   *   【メリット】
   *
   *   取引所・取引している通貨が多岐に渡るユーザの場合merge処理がかなり重くなることが予想されるが、この設計ならmergeしなくて良くなる。
   *
   *   【デメリット】
   *
   *   balanceと平均購入価格とで依存を強くしてしまう設計になる
   *
   * @param exchanges 取引所インスタンスのリスト
   * @param balancesPerExchange 取引所ごとのバランス
   * @param baseFiat 基軸通貨 ex. 'USDT'
   * @returns 渡された全ての取引所インスタンスについての平均購入価格(+Balance)
   */
  async fetchAveBuyPrices(
    exchanges: CryptoExchange[],
    balancesPerExchange: BalancesPerExchange,
    baseFiat: string
  ): Promise<AveBuyPricesPerExchange & BalancesPerExchange> {
    type Target = AveBuyPricesPerExchange & BalancesPerExchange;

    // 取引所単位で処理していくタスク
    const task = exchanges.map(async e => {
      // 固有処理
      const x = await this.specificTaskOfAveBuyPrices(e, balancesPerExchange[e.name], baseFiat);
      // 取引所名をkeyとする
      const perExchange: Target = {
        [e.name]: x,
      };
      return perExchange;
    });
    // 全タスクの処理
    const allSettledTask = await Promise.allSettled(task);
    // 全タスクの成功したタスクに絞る
    const fulfilled = assert.promiseSettledResultFilter(allSettledTask);

    /** 配列をオブジェクトに加工 */
    const processingToObject = (previous: Target, current: Target) => {
      return Object.assign(current, previous);
    };

    return fulfilled.reduce(processingToObject);
  }

  /**
   * 渡された各取引所の各assetについて現在価格・利益率を取得する
   *
   * ※ AveBuyPrices, Balanceも併せて返す形にしている(詳細は #fetchAveBuyPrices のJSDocを参照)
   *
   * @param exchanges 取引所インスタンスのリスト
   * @param aveBuyPricesAndBalances 取引所ごとの平均購入価格・バランス
   * @param baseFiat 基軸通貨 ex. 'USDT'
   * @param dp 四捨五入する小数位 (dp = decimalPlaces = 小数位)
   * @returns 渡された全ての取引所インスタンスについての現在価格・利益率(+AveBuyPrices, Balance)
   */
  async fetchProfitRatio(
    exchanges: CryptoExchange[],
    aveBuyPricesAndBalances: AveBuyPricesPerExchange & BalancesPerExchange,
    baseFiat: string
  ): Promise<ProfitRatioPerExchange & AveBuyPricesPerExchange & BalancesPerExchange> {
    type Target = ProfitRatioPerExchange & AveBuyPricesPerExchange & BalancesPerExchange;

    // 取引所単位で処理していくタスク
    const task = exchanges.map(async e => {
      // 固有処理
      const x = await this.specificTaskOfProfitRatio(e, aveBuyPricesAndBalances[e.name], baseFiat);
      // 取引所名をkeyとする
      const perExchange: Target = {
        [e.name]: x,
      };
      return perExchange;
    });
    // 全タスクの処理
    const allSettledTask = await Promise.allSettled(task);
    // 全タスクの成功したタスクに絞る
    const fulfilled = assert.promiseSettledResultFilter(allSettledTask);

    /** 配列をオブジェクトに加工 */
    const processingToObject = (previous: Target, current: Target) => {
      return Object.assign(current, previous);
    };

    return fulfilled.reduce(processingToObject);
  }

  //===================================================================== private

  /**
   * fetchAveBuyPrices 固有の処理
   *
   * @param e 取引所のインスタンス
   * @param balances assetごとのバランス
   * @param baseFiat ex. "USDT"
   */
  private async specificTaskOfAveBuyPrices(
    e: CryptoExchange,
    balances: BalancePerAsset,
    baseFiat: string
  ): Promise<AveBuyPricePerAsset & BalancePerAsset> {
    type Target = AveBuyPricePerAsset & BalancePerAsset;

    const keys = Object.keys(balances);

    // 各シンボル毎に平均購入価額を算出
    const tasks: Promise<Target | null>[] = keys.map(async asset => {
      if (asset === baseFiat) return null; // BaseFiatは対象外
      const free = balances[asset].free;
      const locked = balances[asset].locked;
      const amount = calc.sum([free, locked]);
      // 現在持っている数量分の購入履歴を取得
      const buyTradesHaveNow = await this.buyTradesOfNowAmount(e, asset + baseFiat, amount);
      // 購入履歴から平均価格を算出
      const avePriceHaveNow = calc.aveBuyPrice(buyTradesHaveNow);

      return {
        [asset]: {
          free,
          locked,
          aveBuyPrice: avePriceHaveNow,
        },
      };
    });
    const aveBuyPricePerAsset = assert.promiseSettledResultFilter(await Promise.allSettled(tasks));

    /** 配列をオブジェクトに加工 */
    const processingToObject = (previous: Target, current: Target) => {
      return Object.assign(current, previous);
    };

    // prettier-ignore
    return aveBuyPricePerAsset
          .filter((x): x is Target => x != null)
          .reduce(processingToObject);
  }

  /**
   * fetchProfitRatio 固有の処理
   *
   * @param e 取引所のインスタンス
   * @param aveBuyPricesAndBalances assetごとの平均購入価格・バランス
   * @param baseFiat ex. "USDT"
   * @param dp 四捨五入する小数位 (dp = decimalPlaces = 小数位)
   */
  async specificTaskOfProfitRatio(
    e: CryptoExchange,
    aveBuyPricesAndBalances: AveBuyPricePerAsset & BalancePerAsset,
    baseFiat: string
  ): Promise<ProfitRatioPerAsset & AveBuyPricePerAsset & BalancePerAsset> {
    type Target = ProfitRatioPerAsset & AveBuyPricePerAsset & BalancePerAsset;

    const keys = Object.keys(aveBuyPricesAndBalances);

    // 各シンボル毎に利益率を算出
    const tasks: Promise<Target | null>[] = keys.map(async asset => {
      if (asset === baseFiat) return null; // BaseFiatは対象外
      const free = aveBuyPricesAndBalances[asset].free;
      const locked = aveBuyPricesAndBalances[asset].locked;
      const aveBuyPrice = aveBuyPricesAndBalances[asset].aveBuyPrice;

      const nowSymbolPrice = await e.fetchNowSymbolPrice(asset + baseFiat);
      // 利益率を算出
      const x1 = calc.divide([nowSymbolPrice, aveBuyPrice]);
      const x2 = calc.multiply([x1, 100]);
      const profitRatio = calc.dp(x2, 1, BigNumber.ROUND_HALF_UP); // 小数第2位で四捨五入
      return {
        [asset]: {
          free,
          locked,
          aveBuyPrice,
          nowSymbolPrice,
          profitRatio,
        },
      };
    });
    const aveBuyPricePerAsset = assert.promiseSettledResultFilter(await Promise.allSettled(tasks));

    /** 配列をオブジェクトに加工 */
    const processingToObject = (previous: Target, current: Target) => {
      return Object.assign(current, previous);
    };

    // prettier-ignore
    return aveBuyPricePerAsset
              .filter((x): x is Target => x != null)
              .reduce(processingToObject);
  }

  /**
   * 対象のsymbolについて、現在持っているasset数量分の購入履歴を返す
   *
   * @param cryptoExchange 取引所のインスタンス
   * @param symbol ex. "BTCUSDT"
   * @param amount assetの保有数量
   * @returns 購入履歴
   */
  private async buyTradesOfNowAmount(
    e: CryptoExchange,
    symbol: string,
    amount: number
  ): Promise<Trade[]> {
    // シンボルの購入履歴を取得
    const symbolBuyTrades = await e.fetchSymbolTrades(symbol, true);

    // 現在持っているasset数量分の購入履歴になるようフィルタリング
    let finish = false;
    const result = symbolBuyTrades.reverse().filter(trade => {
      if (finish) return false;
      amount = calc.minus([amount, trade.qty]);
      if (amount < 0) {
        // マイナスになった(=現在保有数量をここまでの購入取引量が上回った)場合、最後の購入履歴を作成する
        trade.qty = calc.sum([amount, trade.qty]).toString(); // 合計数量を元に戻し、購入履歴にセット
        finish = true; // 後続のtradeは不要
      }
      return trade;
    });

    return result;
  }
}

//===================================================================== 型定義

/**
 * バリデーションを通ったリクエスト
 */
type passedRequest = {
  queryStringParameters: {
    baseFiat: string;
  };
};

/**
 * バリデーションエラーがあった場合のレスポンスbody
 */
type hasValidationErrorBody = {
  error: {
    messages: string[];
  };
};

/**
 * 取引所別のBalance
 */
type BalancesPerExchange = {
  [exchangeName: string]: BalancePerAsset;
};

/**
 * asset別のBalance
 */
type BalancePerAsset = { [asset: string]: Balance };

/**
 * 取引所別のAveBuyPrice
 */
type AveBuyPricesPerExchange = {
  [exchangeName: string]: AveBuyPricePerAsset;
};

/**
 * asset別のAveBuyPrice
 */
type AveBuyPricePerAsset = { [asset: string]: AveBuyPrice };

/**
 * 取引所別のProfitRatio
 */
type ProfitRatioPerExchange = {
  [exchangeName: string]: ProfitRatioPerAsset;
};

/**
 * asset別のProfitRatio
 */
type ProfitRatioPerAsset = { [asset: string]: ProfitRatio };
